import { setTimeout } from "node:timers/promises";
import type { DbClient } from "@geho/db";
import { and, asc, eq, isNull, lte } from "@geho/db/helper";
import { outboxEvent } from "@geho/db/schema";

const POLL_INTERVAL_MS = 1000;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 5 * 60_000;
const MAX_ERROR_LENGTH = 2000;

type SelectOutboxEvent = typeof outboxEvent.$inferSelect;

type ClaimedOutboxEvent = Pick<
  SelectOutboxEvent,
  "id" | "eventType" | "payload"
>;

type CreateOutboxDispatcherOptions = {
  db: DbClient;
  dispatch: (event: ClaimedOutboxEvent) => Promise<void>;
};

type OutboxDispatcher = {
  close: () => Promise<void>;
};

/**
 * Signals that retrying the event cannot succeed without manual intervention.
 *
 * Example: a known event type contains an invalid persisted payload.
 */
export class PermanentOutboxDispatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentOutboxDispatchError";
  }
}

type DispatchResult =
  | {
      status: "idle";
    }
  | {
      status: "delivered";
      eventId: string;
      eventType: string;
    }
  | {
      status: "retry_scheduled";
      eventId: string;
      eventType: string;
      attemptCount: number;
      nextAttemptAt: Date;
      error: string;
    }
  | {
      status: "permanently_failed";
      eventId: string;
      eventType: string;
      attemptCount: number;
      error: string;
    };

const getErrorMessage = (error: unknown): string => {
  const message =
    error instanceof Error ? error.message : "Unknown outbox dispatch error";

  return message.slice(0, MAX_ERROR_LENGTH);
};

const calculateNextAttemptAt = ({
  attemptCount,
  failedAt,
}: {
  attemptCount: number;
  failedAt: Date;
}): Date => {
  const exponent = Math.max(0, attemptCount - 1);

  const maximumDelay = Math.min(
    MAX_RETRY_DELAY_MS,
    BASE_RETRY_DELAY_MS * 2 ** exponent
  );

  // Use 50%–100% jitter so multiple Worker instances do not all retry
  // at exactly the same moment when Redis recovers.
  const jitterMultiplier = 0.5 + Math.random() * 0.5;
  const retryDelay = Math.floor(maximumDelay * jitterMultiplier);

  return new Date(failedAt.getTime() + retryDelay);
};

const waitForNextPoll = async ({
  signal,
}: {
  signal: AbortSignal;
}): Promise<void> => {
  try {
    await setTimeout(POLL_INTERVAL_MS, undefined, {
      signal,
    });
  } catch (error) {
    // Timer cancellation is the expected shutdown path.
    if (!(error instanceof Error && error.name === "AbortError")) {
      throw error;
    }
  }
};

const logDispatchResult = (result: DispatchResult): void => {
  switch (result.status) {
    case "idle":
      return;

    case "delivered":
      console.info("outbox event delivered", {
        eventId: result.eventId,
        eventType: result.eventType,
      });
      return;

    case "retry_scheduled":
      console.warn("outbox event delivery failed; retry scheduled", {
        eventId: result.eventId,
        eventType: result.eventType,
        attemptCount: result.attemptCount,
        nextAttemptAt: result.nextAttemptAt,
        error: result.error,
      });
      return;

    case "permanently_failed":
      console.error("outbox event permanently failed", {
        eventId: result.eventId,
        eventType: result.eventType,
        attemptCount: result.attemptCount,
        error: result.error,
      });
      return;

    default:
      return;
  }
};

export const createOutboxDispatcher = ({
  db,
  dispatch,
}: CreateOutboxDispatcherOptions): OutboxDispatcher => {
  const abortController = new AbortController();

  const dispatchNextEvent = (): Promise<DispatchResult> =>
    db.transaction(async (tx): Promise<DispatchResult> => {
      const startedAt = new Date();

      const events = await tx
        .select()
        .from(outboxEvent)
        .where(
          and(
            isNull(outboxEvent.failedAt),
            lte(outboxEvent.nextAttemptAt, startedAt)
          )
        )
        .orderBy(
          asc(outboxEvent.nextAttemptAt),
          asc(outboxEvent.createdAt),
          asc(outboxEvent.id)
        )
        .limit(1)
        .for("update", { skipLocked: true });

      const event = events[0];

      if (!event) {
        return {
          status: "idle",
        };
      }

      try {
        await dispatch({
          id: event.id,
          eventType: event.eventType,
          payload: event.payload,
        });
      } catch (error) {
        const attemptCount = event.attemptCount + 1;
        const errorMessage = getErrorMessage(error);
        const failedAt = new Date();

        if (error instanceof PermanentOutboxDispatchError) {
          await tx
            .update(outboxEvent)
            .set({
              attemptCount,
              lastError: errorMessage,
              failedAt,
            })
            .where(eq(outboxEvent.id, event.id));

          return {
            status: "permanently_failed",
            eventId: event.id,
            eventType: event.eventType,
            attemptCount,
            error: errorMessage,
          };
        }

        const nextAttemptAt = calculateNextAttemptAt({
          attemptCount,
          failedAt,
        });

        await tx
          .update(outboxEvent)
          .set({
            attemptCount,
            nextAttemptAt,
            lastError: errorMessage,
          })
          .where(eq(outboxEvent.id, event.id));

        return {
          status: "retry_scheduled",
          eventId: event.id,
          eventType: event.eventType,
          attemptCount,
          nextAttemptAt,
          error: errorMessage,
        };
      }

      await tx.delete(outboxEvent).where(eq(outboxEvent.id, event.id));

      return {
        status: "delivered",
        eventId: event.id,
        eventType: event.eventType,
      };
    });

  /**
   * Runs continuously:
   *
   * - if an event is found, process it and immediately request the next one;
   * - if no event is available, wait one second;
   * - if PostgreSQL or the transaction fails, log it and wait one second;
   * - never terminate the Worker because of an infrastructure failure.
   */
  const run = async (): Promise<void> => {
    while (!abortController.signal.aborted) {
      let shouldWait = false;

      try {
        const result = await dispatchNextEvent();

        logDispatchResult(result);
        shouldWait = result.status === "idle";
      } catch (error) {
        console.error("outbox dispatcher loop failed", {
          error: getErrorMessage(error),
        });

        shouldWait = true;
      }

      if (shouldWait && !abortController.signal.aborted) {
        await waitForNextPoll({
          signal: abortController.signal,
        });
      }
    }
  };

  // Starting the Dispatcher is part of creating it
  const runPromise = run();

  let closePromise: Promise<void> | undefined;

  /**
   * Stops future polling and waits for the current transaction/dispatch,
   * if any, to finish.
   *
   * Calling close() more than once returns the same promise.
   */
  const close = (): Promise<void> => {
    closePromise ??= (async () => {
      abortController.abort();
      await runPromise;
    })();

    return closePromise;
  };

  return {
    close,
  };
};
