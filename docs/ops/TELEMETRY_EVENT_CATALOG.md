# Telemetry Event Catalog

## Purpose
Standardize key product and operational events for beta and scale decisions.

## Core Product Events
| Event | Trigger | Required Properties |
|---|---|---|
| `user_registered` | Successful registration | `airlineCode` |
| `user_logged_in` | Successful login | none |
| `schedule_uploaded` | Schedule upload completed | `source`, `tripCount` |
| `swap_post_created` | New swap/trade post created | `postType`, `airlineCode` |
| `message_sent` | Chat message sent | `conversationId` |
| `page_view` | Page loaded | `path` |

## Operational Events (Recommended)
| Event | Trigger | Required Properties |
|---|---|---|
| `api_error` | API returns 5xx | `route`, `status`, `requestId` |
| `rate_limited` | Request blocked by rate limiter | `route`, `ipHash` |
| `auth_failed` | Invalid credentials or unauthorized access | `route`, `reason` |

## Data Handling Rules
- Never store raw password, token, or secret values in events.
- Use opaque identifiers for user tracking (`distinctId`).
- Hash or redact sensitive identifiers before export.

## Validation Checklist
- Event names are stable and documented.
- Property keys are consistently cased.
- Event payloads are JSON-serializable.
- Error events include route context and status code.
