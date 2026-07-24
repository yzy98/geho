# Changelog

All notable changes to `@geho/widget-react` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.3] - 2026-07-24

### Added

- Automatically recover a persisted unanswered user message after the widget
  reloads by requesting a new RAG answer from the Geho API.
- Keep the chat view following streamed answers at the bottom while allowing
  visitors to scroll up and read earlier messages.

### Changed

- Stop returning and displaying RAG citations in Widget chat messages; citations
  remain available in server-side RAG traces.

## [0.0.2] - 2026-07-22

### Security

- Switched npm publishing from a bootstrap token to npm Trusted Publishing
  with GitHub Actions OIDC and provenance.

### Changed

- No public API or runtime behavior changes from `0.0.1`.

## [0.0.1] - 2026-07-22

### Added

- Published the first public release of the Geho React chat widget.
- Added the `ChatWidget` component with a floating launcher, an isolated Shadow
  DOM interface, streamed answers, and source citations.
- Added lazy session bootstrap, anonymous session persistence in local storage,
  completed-message history restoration, and an in-memory fallback when browser
  storage is unavailable.
- Preserved in-page chat state while the panel is closed and reopened.
- Added TypeScript declarations and documentation for installation, props,
  Embed Key authentication, CORS requirements, persistence, and reconnect
  limitations.

[Unreleased]: https://github.com/yzy98/geho/compare/widget-react-v0.0.3...HEAD
[0.0.3]: https://github.com/yzy98/geho/compare/widget-react-v0.0.2...widget-react-v0.0.3
[0.0.2]: https://github.com/yzy98/geho/compare/widget-react-v0.0.1...widget-react-v0.0.2
[0.0.1]: https://github.com/yzy98/geho/releases/tag/widget-react-v0.0.1
