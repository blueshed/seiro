# Changelog

All notable changes to seiro will be documented in this file.

## [0.1.9] - Unreleased

(No changes yet)

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
