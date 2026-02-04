# Changelog

All notable changes to seiro will be documented in this file.

## [0.1.11] - Unreleased

(No changes yet)

## [0.1.10] - 2026-02-04

### Fixed
- WebSocket protocol detection: use `wss://` for HTTPS and `ws://` for HTTP in client app template
- Compose file path resolution in `seiro model` CLI (`../compose.yml` → `../../compose.yml`)
- Add missing `async`/`await` to SVG route handlers in model server

## [0.1.9] - 2026-02-01

### Added
- `seiro model` CLI for CQRS domain modelling
  - Define entities, documents, commands, events, actors, use cases, sequences
  - PlantUML diagram generation (entity, use case, sequence, document diagrams)
  - `seiro model serve` - web UI for viewing diagrams
  - `seiro model export` - JSON export for code generation
  - SQLite-based model storage (model.db)
- New skills for template:
  - `model-build` - build domain model through conversation using CLI
  - `model-generate` - generate seiro application from model export
- Updated template CLAUDE.md with two design paths:
  - Quick path: `cqrs-document` skill for direct conversation-to-code
  - Model path: `model-build` → visualise → `model-generate`

## [0.1.8] - 2026-01-31

### Added
- Export `createLogger` and pre-configured loggers (`serverLogger`, `dbLogger`, etc.) from `seiro/server` for consistent logging in consumer applications
- Comprehensive test suite: 60 tests covering protocol, client, server, and integration

### Fixed
- Void commands now return `null` instead of `undefined` so the response survives JSON serialization and `onSuccess` fires correctly

## [0.1.7] - 2026-01-31

### Added
- `ack` flag on command messages - clients can now signal whether they expect a response
- Fire-and-forget commands: omit callbacks to skip server response (errors still sent)

### Changed
- Server only sends success response when `ack: true` is set on command
- Client automatically sets `ack: true` when callbacks are provided

## [0.1.6] - 2026-01-30

### Added
- Initial public release
- CQRS over WebSocket with typed commands, queries, and events
- Streaming queries with async iterators
- Preact Signals integration (`sync`, `syncMap`)
- Token-based authentication with public/private routes
- Pattern-based event subscriptions (wildcards supported)
- PostgreSQL LISTEN/NOTIFY integration helpers
