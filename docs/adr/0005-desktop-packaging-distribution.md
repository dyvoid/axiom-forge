# 5. Desktop Packaging and Distribution

**Date:** 2026-06-05  
**Status:** Proposed

## Context
Axiom Forge currently runs as a local web application. Starting the app requires Node.js and running commands in a terminal, which is a high barrier to entry for non-technical users. To make Axiom Forge accessible as a standalone application, we need a way to distribute it as a desktop executable (`.exe` for Windows) that does not require installing Node.js or using command-line interfaces.

## Decision
We will build a desktop distribution pipeline by wrapping Axiom Forge in **Electron** as a new workspace package:
- **Workspace Integration:** We will create a new package `packages/desktop` that isolates the Electron process code, preload scripts, and packaging dependencies.
- **Server Refactoring:** We will refactor `packages/server` to export its startup logic as an importable library function (`startServer`), allowing the Electron main process to run the Express API internally.
- **Frontend Delivery:** In production builds, the Express server will serve static client files (`packages/client/dist`) and handle React Router fallback routing, while the Electron window loads `http://127.0.0.1:<PORT>`.
- **Project Folder Picker:** We will implement an IPC-based directory selection dialog utilizing Electron's native `dialog.showOpenDialog`. This will allow users to select their project directories inside the app interface. *(Scope note, 2026-08-30: the entry surface this serves is owned by [ADR-0013](0013-project-scaffolding.md). This ADR contributes the native dialog as one implementation of it under Electron, not a second design for it.)*
- **Packaging:** We will configure `electron-builder` to package the workspace into both a portable `.exe` and a standard Windows installer (`.exe` Setup).

## Consequences
- A new package `packages/desktop` will be added to the monorepo workspaces.
- New dependencies (`electron` and `electron-builder`) will be added to the project.
- The Express server initialization will be decoupled from immediate CLI execution.
- We will establish an IPC communication pathway between the React client and the Electron main process for system actions (like opening folders).
