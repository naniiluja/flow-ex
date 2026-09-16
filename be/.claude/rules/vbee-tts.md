---
paths: ["be/src/providers/vbee/**"]
---

# Vbee TTS (`VbeeTtsProvider`)

Contract from the user-provided Vbee docs, cross-checked against a real API call on 2026-09-16 (one
35-character request, `hn_female_ngochuyen_full_48k-fhg` voice). Only the **async batch** mode is used;
the realtime sync mode (`mode: "sync"`, ≤300 chars, 5 voices) is intentionally not implemented — its
limits don't fit every scene and a second code path would double the test surface for no gain.

## Endpoints

- **Submit:** `POST https://api.vbee.vn/v1/tts`, headers `Authorization: Bearer <token>`, `App-Id: <app-id>`, `Content-Type: application/json`.
  - Required body: `text` (trimmed, non-empty, ≤100,000 chars), `mode: "async"`, `webhookUrl`, `voiceCode`.
  - Optional body: `outputFormat` (`mp3`|`wav`, default `mp3`; `pcm` errors), `bitrate` ∈ {8,16,32,64,128} (default 128), `speed` 0.25–1.9 (default 1.0), `sampleRate` ∈ {8000,16000,22050,24000,32000,44100,48000}, `emphasisIntensity` 0–100 in steps of 10, `clientPause { majorBreak 0.1–10 (0.3), mediumBreak 0.1–10 (0.25), paragraphBreak 0–10 (0.6), sentenceBreak 0.1–10 (0.45) }`.
  - **Verified live:** success returns HTTP **201** (not 200) `{ requestId, status: "PROCESSING" }`. `webhookUrl: "https://vbee-callback.invalid/noop"` was accepted (`.invalid` never resolves per RFC 2606, so nothing leaks to a third party — this app runs on localhost and never receives the webhook).
- **Poll:** `GET https://api.vbee.vn/v1/tts/requests/{requestId}` (same headers) → `{requestId, status:"PROCESSING"}` or `{requestId, status:"COMPLETED", audioLink}`. **Verified live:** an unknown/expired id returns `400 {"error":{"code":"BAD_REQUEST","message":"Request is not found"}}`.
- **`audioLink` expires 3 minutes after it's issued**; the underlying audio is kept on Vbee for 3 days. Getting a fresh link means calling `GET` again — never re-`POST`.
- **Verified live:** the link is `https://vbee.vn/s/<requestId>/<id>`, which **302**s to an S3 presigned URL (`vbee-studio2-3.s3.ap-southeast-1.amazonaws.com`, query has `X-Amz-*` params); each `GET` returns a different presigned link, so the client must follow the redirect immediately rather than caching the URL.
- **Verified live:** the downloaded file's `Content-Type` is `application/octet-stream` regardless of `outputFormat` — validate the file by magic bytes (MP3 ID3v2 header), never by `Content-Type`. The test call returned MP3 ID3v2.4, 128kbps, 44.1kHz mono, 2.53s, and was `COMPLETED` on the very first `GET`.
- **Verified live:** wrong/missing auth returns **HTTP 401 with an HTML body from nginx**, not JSON — the provider must branch on status code alone for 401, never assume a JSON body.
- Callback payload (snake_case `request_id`/`status`/`audio_link`) is documented but unused, since this app has no public endpoint to receive it.

## Error codes

- `401 UNAUTHORIZED` (HTML body, see above) → `errorKind: 'needs_user'`.
- `400 BAD_REQUEST` where the message concerns insufficient credit → `errorKind: 'needs_user'`; any other `400` (bad `voiceCode`, unsupported `sampleRate`, malformed body) → `errorKind: 'fatal'` for that scene.
- `429 TTS_CCR_MAX_LIMIT_REACHED`, `500 TTS_SPEND_CREDITS_FAILED`, `500 INTERNAL_SERVER_ERROR`, network errors, request timeouts, and a non-JSON body on any status other than 401 → `errorKind: 'transient'`, follow the shared retry schedule in `../../../.claude/rules/error-handling.md`.

## Provider design

- Env: `VBEE_APP_ID`, `VBEE_TOKEN` (JWT, observed to carry only `iat`, no `exp` — it does not self-expire; never write either value into any file in this repo), `VBEE_WEBHOOK_URL` (default `https://vbee-callback.invalid/noop`).
- The scene JSON's optional `tts: { speed?, bitrate?, sampleRate?, emphasisIntensity?, clientPause? }` block applies project-wide; zod validates it against the exact domains above (this is the EP/BVA matrix subject for this provider).
- Per-scene state in `project.json`: `audio: { status, requestId, submittedAt, attempts, lastError, file, durationMs }`. Write `requestId` atomically immediately after `POST` returns (before polling starts) so a crash mid-poll can resume from it.
- Resume logic on restart: audio file already on disk → skip; `requestId` + `submittedAt` less than 3 days old → only `GET`, never re-`POST`; `"Request is not found"` or `submittedAt` older than 3 days → submit a fresh `POST` (log `vbee.request.resubmit`).
- Polling: every 2s, backing off to 5s, for up to 5 minutes total; exceeding that marks the attempt `transient` and defers to the shared retry schedule.
- On `COMPLETED`: follow the redirect immediately into a temp file, verify MP3 magic bytes, then rename into place. A 403/404 on the redirect target (link already expired) triggers one fresh `GET` for a new link, retried at most 2 times before treating it as `transient`.
- Concurrency: `p-queue` with concurrency 2 for Vbee calls; drop to 1 after repeated `429`s.
- Redact in all logs: `authorization`, `app-id`, `VBEE_TOKEN`, the full `audioLink` (a shortened form is enough to debug), and the `X-Amz-*` query params of the S3 redirect target.
