# @geho/widget-react

React chat widget for Geho. It renders a floating launcher and an isolated chat
panel, creates an anonymous widget session on demand, streams answers, and shows
source citations returned by the Geho API.

## Installation

Install the widget together with its React peer dependencies:

```bash
pnpm add @geho/widget-react react react-dom
```

```bash
npm install @geho/widget-react react react-dom
```

```bash
yarn add @geho/widget-react react react-dom
```

The package is ESM-only and includes TypeScript declarations.

## Requirements

- React `>=18.2.0`
- React DOM `>=18.2.0`
- A running Geho API that is reachable from the visitor's browser
- A public Geho Embed Key whose allowed origins include the website hosting the
  widget

`react` and `react-dom` are peer dependencies. The consuming application must
provide them.

## Usage

```tsx
import { ChatWidget } from "@geho/widget-react";

export function App() {
  return (
    <>
      <main>{/* Your application */}</main>

      <ChatWidget
        apiUrl="https://api.example.com"
        embedKey="pk_your_public_embed_key"
      />
    </>
  );
}
```

For a Vite application, the values can come from public build-time environment
variables:

```tsx
import { ChatWidget } from "@geho/widget-react";

export function App() {
  return (
    <ChatWidget
      apiUrl={import.meta.env.VITE_GEHO_API_URL}
      embedKey={import.meta.env.VITE_GEHO_EMBED_KEY}
    />
  );
}
```

The widget renders its UI in a Shadow DOM so its component styles are isolated
from the host page. It uses a fixed launcher in the bottom-right corner.

## API

### `ChatWidget`

```ts
export type ChatWidgetProps = {
  apiUrl: string;
  embedKey: string;
};
```

| Prop | Required | Description |
| --- | --- | --- |
| `apiUrl` | Yes | Absolute base URL of the Geho API, for example `https://api.example.com`. It must use HTTP or HTTPS and must not contain credentials, query parameters, or a fragment. Trailing slashes are removed. |
| `embedKey` | Yes | Public Embed Key generated for a Geho chatbot. Surrounding whitespace is removed before use. Configure an allowed-origin list for the key on the Geho server. |

Both props are used to identify the persisted browser session. Changing either
value causes the widget to use a different session.

## API requests and `X-Geho-Key`

The Embed Key is a public browser credential, not a secret API key. The widget
sends it in the `X-Geho-Key` request header when it:

- creates an anonymous session with `POST /widget/sessions`;
- loads history from `GET /widget/sessions/:sessionId/messages`;
- sends a message to `POST /widget/sessions/:sessionId/messages`.

Requests for an existing session also send its anonymous session token as:

```http
Authorization: Bearer <session-token>
```

Widget requests use `credentials: "omit"`; they do not rely on cookies. The API
must allow `X-Geho-Key`, `Authorization`, and `Content-Type` in CORS requests and
must allow the embedding website's origin. Protect an Embed Key with its Geho
origin allowlist; do not treat hiding the key in frontend code as a security
boundary.

## Session persistence

After the visitor first opens the widget, it creates an anonymous chat session
or restores a previously stored one. When browser storage is available, the
session is saved in `localStorage` under a versioned key with this prefix:

```text
geho:widget-react:v1:
```

The rest of the key is a SHA-256 fingerprint of the normalized `apiUrl` and
`embedKey`. The stored record contains the session ID, anonymous session token,
creation time, and storage time. On a later page load, the widget restores that
session and fetches its completed message history from the API.

If `localStorage` or Web Crypto is unavailable, blocked, or starts throwing, the
widget falls back to an in-memory session cache. A visible warning explains that
the conversation is available only on the current page or that refreshing may
start a new conversation. The fallback keeps the current page usable but cannot
survive a full refresh or navigation.

Invalid stored session records are discarded. If the API reports that a stored
session has expired, the widget removes it and creates a new session.

## Lazy bootstrap and panel lifetime

Mounting `<ChatWidget>` only renders the launcher. It does not contact the Geho
API or create a session until the visitor opens the widget for the first time.

After that first open, the panel and chat runtime stay mounted. Closing the panel
only hides it; it does not recreate the chat runtime, clear messages, or cancel
an active response stream. Reopening the panel therefore shows the same in-page
conversation state.

Unmounting `<ChatWidget>` still removes the runtime. Mount it in a stable part of
the application layout if chat state should survive client-side route changes.

## Current reconnect limitation

This release does not support resuming or reconnecting to an in-progress streamed
answer after a page refresh, component unmount, browser suspension, or network
interruption. A restored session can load messages already committed by the API,
but it cannot reconnect to the previous live stream.

If a message request fails while the widget remains mounted, the widget shows a
**Continue** action. This clears the request error so the visitor can use the
composer again; it does not resume the failed response.

## License

LGPL-3.0-or-later
