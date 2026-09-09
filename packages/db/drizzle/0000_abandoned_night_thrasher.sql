CREATE TYPE "public"."chat_message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."chat_session_status" AS ENUM('active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."model_provider_capability" AS ENUM('chat', 'embedding');--> statement-breakpoint
CREATE TYPE "public"."knowledge_source_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."rag_trace_origin" AS ENUM('preview', 'widget');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp (6) with time zone,
	"refresh_token_expires_at" timestamp (6) with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"inviter_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role" text,
	"status" text NOT NULL,
	"created_at" timestamp (6) with time zone NOT NULL,
	"expires_at" timestamp (6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp (6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(255) NOT NULL,
	"logo" text,
	"metadata" text,
	"created_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp (6) with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL,
	"active_organization_id" text,
	"active_team_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp (6) with time zone NOT NULL,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"session_id" text NOT NULL,
	"role" "chat_message_role" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "chat_message_tenant_identity_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "chat_session" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"chatbot_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"status" "chat_session_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp (6) with time zone NOT NULL,
	"last_message_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "chat_session_tenant_identity_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "chat_session_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "chatbot" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"chat_provider_id" text NOT NULL,
	"knowledge_base_id" text NOT NULL,
	"name" text NOT NULL,
	"system_instructions" text NOT NULL,
	"theme_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"retrieval_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "chatbot_tenant_identity_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "embed_key" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"chatbot_id" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"allowed_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "embed_key_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"embedding_provider_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "knowledge_base_tenant_identity_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "model_provider" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"capability" "model_provider_capability" NOT NULL,
	"base_url" text,
	"encrypted_api_key" text NOT NULL,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "model_provider_tenant_identity_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "outbox_event" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp (6) with time zone NOT NULL,
	"last_error" text,
	"failed_at" timestamp (6) with time zone,
	"created_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "outbox_event_type_check" CHECK (char_length(btrim("outbox_event"."event_type")) > 0),
	CONSTRAINT "outbox_event_attempt_count_check" CHECK ("outbox_event"."attempt_count" >= 0),
	CONSTRAINT "outbox_event_failure_error_check" CHECK (
        "outbox_event"."failed_at" IS NULL
        OR "outbox_event"."last_error" IS NOT NULL
      )
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"source_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "knowledge_chunk_tenant_identity_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "knowledge_chunk_source_order_unique" UNIQUE("source_id","chunk_index"),
	CONSTRAINT "knowledge_chunk_index_non_negative_check" CHECK ("knowledge_chunk"."chunk_index" >= 0)
);
--> statement-breakpoint
CREATE TABLE "knowledge_source" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"knowledge_base_id" text NOT NULL,
	"title" text NOT NULL,
	"raw_content" text NOT NULL,
	"status" "knowledge_source_status" DEFAULT 'pending' NOT NULL,
	"processing_job_id" text,
	"processing_token" text,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp (6) with time zone NOT NULL,
	"updated_at" timestamp (6) with time zone NOT NULL,
	CONSTRAINT "knowledge_source_tenant_identity_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "knowledge_source_status_error_check" CHECK (
        (
          "knowledge_source"."status" = 'failed'
          AND "knowledge_source"."error_code" IS NOT NULL
          AND "knowledge_source"."error_message" IS NOT NULL
        )
        OR
        (
          "knowledge_source"."status" <> 'failed'
          AND "knowledge_source"."error_code" IS NULL
          AND "knowledge_source"."error_message" IS NULL
        )
      ),
	CONSTRAINT "knowledge_source_processing_owner_check" CHECK (
        (
          "knowledge_source"."status" = 'processing'
          AND (
            (
              "knowledge_source"."processing_job_id" IS NULL
              AND "knowledge_source"."processing_token" IS NULL
            )
            OR
            (
              "knowledge_source"."processing_job_id" IS NOT NULL
              AND "knowledge_source"."processing_token" IS NOT NULL
            )
          )
        )
        OR
        (
          "knowledge_source"."status" <> 'processing'
          AND "knowledge_source"."processing_job_id" IS NULL
          AND "knowledge_source"."processing_token" IS NULL
        )
      )
);
--> statement-breakpoint
CREATE TABLE "rag_trace" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"chatbot_id" text NOT NULL,
	"knowledge_base_id" text NOT NULL,
	"message_id" text,
	"origin" "rag_trace_origin" NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"prompt_preview" text NOT NULL,
	"model_id" text NOT NULL,
	"latency_ms" integer NOT NULL,
	"retrieved_chunks" jsonb NOT NULL,
	"citations" jsonb NOT NULL,
	"created_at" timestamp (6) with time zone NOT NULL,
	"lexical_query" text,
	"retrieval_metadata" jsonb,
	CONSTRAINT "rag_trace_message_unique" UNIQUE("message_id"),
	CONSTRAINT "rag_trace_origin_message_check" CHECK (
        (
          "rag_trace"."origin" = 'preview'
          AND "rag_trace"."message_id" IS NULL
        )
        OR
        (
          "rag_trace"."origin" = 'widget'
          AND "rag_trace"."message_id" IS NOT NULL
        )
      ),
	CONSTRAINT "rag_trace_latency_non_negative_check" CHECK ("rag_trace"."latency_ms" >= 0)
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_session_tenant_fk" FOREIGN KEY ("session_id","organization_id") REFERENCES "public"."chat_session"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_session" ADD CONSTRAINT "chat_session_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_session" ADD CONSTRAINT "chat_session_chatbot_tenant_fk" FOREIGN KEY ("chatbot_id","organization_id") REFERENCES "public"."chatbot"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot" ADD CONSTRAINT "chatbot_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot" ADD CONSTRAINT "chatbot_chat_model_provider_tenant_fk" FOREIGN KEY ("chat_provider_id","organization_id") REFERENCES "public"."model_provider"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot" ADD CONSTRAINT "chatbot_knowledge_base_tenant_fk" FOREIGN KEY ("knowledge_base_id","organization_id") REFERENCES "public"."knowledge_base"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embed_key" ADD CONSTRAINT "embed_key_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embed_key" ADD CONSTRAINT "embed_key_chatbot_tenant_fk" FOREIGN KEY ("chatbot_id","organization_id") REFERENCES "public"."chatbot"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_embedding_model_provider_tenant_fk" FOREIGN KEY ("embedding_provider_id","organization_id") REFERENCES "public"."model_provider"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_provider" ADD CONSTRAINT "model_provider_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunk" ADD CONSTRAINT "knowledge_chunk_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunk" ADD CONSTRAINT "knowledge_chunk_source_tenant_fk" FOREIGN KEY ("source_id","organization_id") REFERENCES "public"."knowledge_source"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_source" ADD CONSTRAINT "knowledge_source_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_source" ADD CONSTRAINT "knowledge_source_base_tenant_fk" FOREIGN KEY ("knowledge_base_id","organization_id") REFERENCES "public"."knowledge_base"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_trace" ADD CONSTRAINT "rag_trace_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_trace" ADD CONSTRAINT "rag_trace_chatbot_tenant_fk" FOREIGN KEY ("chatbot_id","organization_id") REFERENCES "public"."chatbot"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_trace" ADD CONSTRAINT "rag_trace_knowledge_base_tenant_fk" FOREIGN KEY ("knowledge_base_id","organization_id") REFERENCES "public"."knowledge_base"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_trace" ADD CONSTRAINT "rag_trace_message_tenant_fk" FOREIGN KEY ("message_id","organization_id") REFERENCES "public"."chat_message"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_message_tenant_session_order_idx" ON "chat_message" USING btree ("organization_id","session_id","created_at","id");--> statement-breakpoint
CREATE INDEX "chat_session_tenant_chatbot_activity_idx" ON "chat_session" USING btree ("organization_id","chatbot_id","last_message_at","id");--> statement-breakpoint
CREATE INDEX "chatbot_organization_created_at_idx" ON "chatbot" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "chatbot_chat_provider_id_idx" ON "chatbot" USING btree ("chat_provider_id");--> statement-breakpoint
CREATE INDEX "chatbot_knowledge_base_id_idx" ON "chatbot" USING btree ("knowledge_base_id");--> statement-breakpoint
CREATE INDEX "embed_key_tenant_chatbot_id_idx" ON "embed_key" USING btree ("organization_id","chatbot_id","created_at","id");--> statement-breakpoint
CREATE INDEX "knowledge_base_organization_created_at_idx" ON "knowledge_base" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "knowledge_base_embedding_provider_id_idx" ON "knowledge_base" USING btree ("embedding_provider_id");--> statement-breakpoint
CREATE INDEX "model_provider_organization_capability_idx" ON "model_provider" USING btree ("organization_id","capability");--> statement-breakpoint
CREATE INDEX "model_provider_organization_created_at_idx" ON "model_provider" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "outbox_event_dispatch_idx" ON "outbox_event" USING btree ("next_attempt_at","created_at","id") WHERE "outbox_event"."failed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "knowledge_chunk_embedding_idx" ON "knowledge_chunk" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "knowledge_chunk_content_search_idx" ON "knowledge_chunk" USING gin (to_tsvector('simple', "content"));--> statement-breakpoint
CREATE INDEX "knowledge_source_base_status_idx" ON "knowledge_source" USING btree ("organization_id","knowledge_base_id","status");--> statement-breakpoint
CREATE INDEX "knowledge_source_base_created_at_idx" ON "knowledge_source" USING btree ("organization_id","knowledge_base_id","created_at","id");--> statement-breakpoint
CREATE INDEX "rag_trace_tenant_chatbot_created_at_idx" ON "rag_trace" USING btree ("organization_id","chatbot_id","created_at","id");