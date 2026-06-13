# Design Workflow Frontend

## Purpose

Design Workflow Frontend is the Next.js interface for planning and tracking design work. It provides board, task, review, chat, profile, and team screens for authenticated users.

## Stack

- Next.js and React
- TypeScript
- NextAuth
- Redux Toolkit and redux-saga
- Tailwind CSS, workflow CSS modules, and lucide-react
- Radix UI and dnd-kit
- Formik and Zod
- Jest and Testing Library

## Features

- Kanban-style workflow board
- Project, task, review, and assignment controls
- Comments, activity, attachments, and chat views
- Team workload and profile screens
- Drag-and-drop interactions
- Localized interface text

## Setup

Provide local-only variables for the API, auth, and websocket endpoints. Use localhost values for local development and do not commit local configuration files.

```bash
bun install
bun run dev
```

The frontend runs on `localhost:3004`.

## Tests

```bash
bun x jest --runInBand --coverage=false
bun run test:acceptance
bun run lint
bun run build
```

## Screenshot

![Design Workflow login](docs/screenshots/design-workflow-login.png)
