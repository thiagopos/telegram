# Telegram QR Validation & Reports Bot

Lightweight Telegram bot that reads QR codes from images, validates them against a local database, and provides summary reports. Built with Telegraf and simple SQLite persistence. Useful for quick validation of medical requests (atestados) and generating summary reports.

## Features
- Read QR codes from user-sent images and lookup records in the local database
- Special handling for medical certificates (atestado) with extra fields
- Two summary reports available from the keyboard menu: "Relatório Geral" and "Relatório PS"
- Simple logging middleware and error handling

## Project structure

- `src/` - application source
  - `index.js` - app entry: initializes DB and launches bot
  - `bot/` - Telegraf bot and middlewares
  - `db/` - database helpers and queries
  - `services/` - QR reader, Telegram helpers, report generation
- `data/` - local data files (e.g. SQLite DB)
- `ecosystem.config.cjs` - PM2 process config (optional)

## Requirements
- Node.js 18+ recommended
- pnpm / npm available for installing dependencies

## Environment
Create a `.env` file in the project root with the following variables:

- `BOT_TOKEN` - Telegram bot token
- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` - optional if using a remote MySQL; local SQLite is used by default

Example `.env`:

```
BOT_TOKEN=123456:ABC-DEF...
# If using MySQL instead of SQLite, provide these
DB_HOST=localhost
DB_USER=user
DB_PASS=pass
DB_NAME=database
```

## Install

Install dependencies with your package manager (example with npm):

```
npm install
```

## Run

- Start (production):

```
npm start
```

- Development (watch changes):

```
npm run dev
```

- PM2 (if you use PM2):

```
pm i -g pm2
pm2 start ecosystem.config.cjs
```

## Usage

1. Start the bot and send `/start` in Telegram.
2. Use the keyboard to request "Relatório Geral", "Relatório PS" or "🔍 Validação".
3. For validation, send a photo that contains a clear QR code. The bot will decode it and lookup the record in the database, returning relevant fields and (if applicable) atestado details.

## Notes on database
- The project includes a `data/telegram-logs.sqlite` file for local usage. The code prefers sqlite via `src/db/sqlite.js` but also contains MySQL helpers. If you replace the DB, ensure the schema matches the queries in `src/db/queries.js`.

## Tests and Quality
- No automated tests included yet. Recommended next steps:
  - Add unit tests for `readQRCodeFromBuffer` and `reportService`.
  - Add a linting step and type checks as needed.

## Contributing
- Open issues or PRs. Keep changes small and focused. Run the bot locally to validate behavior.

## License
MIT# telegram
