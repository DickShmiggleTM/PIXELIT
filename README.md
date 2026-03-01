# Pixilit Android-Ready Pixel Art + AI Sprite Studio

Pixilit is now configured as a **full-featured pixel-art and sprite editor** with AI workflows geared for game pipelines (including Godot-style sprite-sheet animation import).

## Core capabilities

- Pixel art editor with layers, timeline, tools, filters, palette workflows, and export pipeline.
- AI-powered sprite-sheet generation from current canvas or uploaded reference image.
- AI prompt-based sprite/sprite-sheet editing.
- Directional animation generation presets:
  - 4-direction character sheets (N/E/S/W)
  - 8-direction character sheets
- AI provider support for:
  - Gemini
  - OpenRouter
  - HuggingFace Inference API
  - Local models via Ollama

## AI provider setup

Open **Settings → AI Provider** and choose your backend.

- **Gemini**: add one or more Gemini API keys.
- **OpenRouter**: add one or more OpenRouter API keys.
- **HuggingFace**: add one or more HuggingFace API keys and configure model IDs.
- **Ollama (local models)**: point to your local server URL (default `http://localhost:11434`).

## Run locally

1. Install dependencies
   ```bash
   npm install
   ```
2. Start app
   ```bash
   npm run dev
   ```

## Android APK packaging (Capacitor)

The project is configured for Android packaging via Capacitor.

1. Build web assets:
   ```bash
   npm run build
   ```
2. Sync Capacitor Android project:
   ```bash
   npm run android:sync
   ```
3. Open Android Studio project:
   ```bash
   npm run android:open
   ```
4. Build APK from Android Studio, or from CLI:
   ```bash
   npm run android:apk:debug
   ```

Output debug APK path:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Notes

- HuggingFace model availability differs by account and endpoint permissions.
- For best sprite-sheet consistency, use prompt constraints such as fixed palette, transparent background, and row-per-direction format.
