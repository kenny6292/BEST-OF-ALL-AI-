# BEST OF ALL AI

One AI. Every Intelligence. Unlimited Possibilities.

BEST OF ALL AI is a production-oriented AI SaaS platform with a React/Vite client and a Node.js API layer. The first real provider connection is OpenAI; additional providers, persistence, authentication, files, billing and agents are designed to plug into the same server-side architecture.

## Current real functionality

- React + TypeScript + Vite frontend
- Node.js + TypeScript API server
- Real `POST /api/chat` endpoint
- Real OpenAI Responses API integration
- `GET /api/health` provider configuration check
- Vite development proxy from `/api` to the Node API
- Production static serving from the Node server
- Secrets kept server-side
- Provider/model abstraction types

OpenAI's official JavaScript/TypeScript quickstart uses the Responses API and server-side API keys; this project follows that model. See the official documentation before configuring production credentials.

## Run locally

1. Copy `.env.example` to `.env`.
2. Add your OpenAI API key to `OPENAI_API_KEY`.
3. Install dependencies with `npm install`.
4. Start both frontend and API with `npm run dev`.
5. Open the Vite URL shown in the terminal.

For a production-style build, run `npm run build` and start the compiled server after compiling the server entry point for your deployment environment.

## Security

Never commit API keys or secrets. Use deployment environment variables. Do not put provider secrets in React code or variables prefixed with `VITE_`.

Provider availability must reflect actual configured integrations; the UI must never fake unavailable functionality.


## Web research

The Research mode uses the Brave Search API through the server-side Node API. Search requests return live web results with titles, URLs and snippets, and the configured AI provider synthesizes the results with `[Source N]` citations. The search credential is never exposed to the browser.

Set `BRAVE_SEARCH_API_KEY` in the server environment to enable Research mode. `WEB_SEARCH_API_KEY` remains supported as a fallback alias. The Brave Web Search API supports structured web results, freshness controls and result pagination; this project currently requests eight web results per research query.