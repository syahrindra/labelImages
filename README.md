# labelImages

> A local browser-based image annotation tool for YOLO object detection.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg)](https://expressjs.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.0-green.svg)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## The Problem

Inspired by the Python `labelImg` package, this tool keeps what works but upgrades the experience: a more appealing modern GUI, no need to predefine class lists before you start, no manual saves that risk losing progress, and no fiddly installation steps.

**labelImages** solves this for local workflows:
- **Filesystem is the database:** Point at any folder of `.jpg` / `.png` images. No accounts, no database, no migrations.
- **Autosave by default:** Navigating images automatically writes valid YOLO `.txt` annotations to disk. You never lose work.
- **Keyboard-first speed:** Draw (`w`), confirm class (`Enter`), and jump to next image (`d`) without your hands leaving the home row.
- **On-the-fly classes:** Create new classes in real-time as you label. They automatically receive distinct, high-contrast colors and sync to `classes.txt`.

---

## Features

- **Interactive Canvas Engine:** Smooth cursor-centered wheel zoom, spacebar panning, and responsive letterboxed auto-fit.
- **Dynamic Box Editing:** Interactive corner resize handles with opposite-anchor normalization (boxes never flip inside-out) and boundary-clamped translations.
- **Gallery Overview:** Progress tracker (e.g. `38 / 200 labeled · 19% complete`), status badges, and instant filtering (`All`, `Unlabeled only`, `Labeled only`).
- **Full Undo / Redo Stacks:** Mistake-friendly history tracking for box creation, deletion, and resizing (`Ctrl+Z` / `Ctrl+Shift+Z`).
- **Direct YOLO Format:** Annotations are stored in standard normalized coordinates (`<class_id> <x_center> <y_center> <width> <height>`), ready for Ultralytics training with zero conversion steps.

---

## Architecture & Tech Stack

This project is built as an **npm workspaces monorepo** with shared TypeScript conventions:

```text
labelImages/
├── package.json              # Root workspace coordinator
├── server/                   # Node.js + Express + TypeScript
│   └── src/
│       ├── services/         # YOLO parser, serializer, and dataset scanner
│       ├── types/            # Data contracts (YoloAnnotation, ClassLabel, etc.)
│       ├── app.ts            # Express REST API & static asset delivery
│       └── index.ts          # Server entry point
└── client/                   # Vite + React + TypeScript
    └── src/
        ├── components/       # Canvas, Header, Footer, Sidebars, ClassPicker, Gallery
        ├── store/            # Zustand state store with undo/redo history
        ├── utils/            # Pure coordinate transformation engine & color palette
        └── services/         # Typed API fetch client
```

---

## Keyboard Shortcuts

The app is built to maximize labeling speed via keyboard shortcuts:

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| <kbd>w</kbd> | **Draw Box** | Enters drawing mode with crosshair cursor |
| <kbd>Enter</kbd> | **Confirm Class** | Confirms highlighted/last-used class in popover |
| <kbd>d</kbd> | **Next Image** | Autosaves changes to disk and loads the next image |
| <kbd>a</kbd> | **Previous Image** | Autosaves changes to disk and loads previous image |
| <kbd>Del</kbd> / <kbd>Backspace</kbd> | **Delete Box** | Deletes the currently selected bounding box |
| <kbd>Ctrl+Z</kbd> / <kbd>Cmd+Z</kbd> | **Undo** | Reverts the last box mutation |
| <kbd>Ctrl+Shift+Z</kbd> / <kbd>Cmd+Shift+Z</kbd> | **Redo** | Re-applies the reverted box mutation |
| <kbd>Space</kbd> + Drag | **Pan Canvas** | Moves the canvas viewport |
| <kbd>Mouse Wheel</kbd> | **Zoom** | Smooth zoom centered on cursor position |
| <kbd>0</kbd> | **Reset Zoom** | Centers and auto-fits image into viewport |
| <kbd>Esc</kbd> | **Deselect / Gallery** | Deselects active box, or returns to Gallery view |
| <kbd>?</kbd> | **Shortcuts Cheat Sheet** | Opens the keyboard shortcuts modal |

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher)

### 1. Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/syahrindra/labelImages.git
cd labelImages
npm install
```

### 2. Development Mode
Runs the backend API on port `3001` and Vite client on port `5173` with hot-module reloading:

In **Terminal 1**:
```bash
npm run dev:server
```

In **Terminal 2**:
```bash
npm run dev:client
```
Open `http://localhost:5173` in your browser.

---

### 3. Production Mode (Single-Command)
Compile both client and server into optimized production bundles and run on a single port:

```bash
npm run build
npm start
```
Open `http://localhost:3001` in your browser.

---

## Running Tests

All parsing, coordinate math, state management, and REST APIs are covered by unit and integration tests using **Vitest** and **Supertest**:

```bash
# Run all tests across server and client
npm test

# Run only server tests
npm run test:server

# Run only client tests
npm run test:client
```

---

## Dataset Format

`labelImages` expects a folder containing image files (`.jpg`, `.jpeg`, `.png`). Annotations and classes are written side-by-side directly to the folder:

```text
my-dataset/
├── cat_001.jpg
├── cat_001.txt         # 0 0.450000 0.620000 0.300000 0.400000
├── dog_002.png
├── dog_002.txt         # 1 0.810000 0.250000 0.120000 0.180000
└── classes.txt         # Line 0: cat, Line 1: dog
```

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.