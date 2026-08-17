# VEXA — Architecture & Implementation Notes

## Client-Side Browser Media Pipeline (In-Browser WASM Architecture)

### 1. Architectural Choice & Rationale
To operate within a **$0 infrastructure cost budget**, the CPU-intensive media processing pipeline (speech synthesis, stock clip fetching, CC0 ambient audio ducking, and MP4 video rendering) has been intentionally moved to the client-side browser inside `@vexa/control-plane`.

- **WebAssembly Engine:** Video transcoding uses `@ffmpeg/ffmpeg` running WebAssembly in the user's browser.
- **Voice Synthesis:** Spoken narration uses `@xenova/transformers` executing local ONNX neural models (`Xenova/mms-tts-eng`).
- **Single-Threaded Execution Guarantee:** Both TTS (`env.backends.onnx.wasm.numThreads = 1`) and FFmpeg WASM builds execute strictly in single-threaded mode. This eliminates cross-origin isolation requirements (`Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers) and guarantees seamless functionality across desktop and Android mobile web browsers.

### 2. Audio & Sound Design Specifications
- **No Music Policy:** Background music tracks have been completely removed from the pipeline across backend and frontend services.
- **CC0 Natural Ambient Sound:** Every scene is paired with natural ambient atmosphere (e.g. wind, nature, gentle city ambience) retrieved from the **Freesound API**, strictly filtered to `license:"Creative Commons 0"` (CC0).
- **Dynamic Audio Ducking:** Ambient audio volume automatically ducks from `0.15` down to `0.03` whenever narration speech is detected, keeping dialogue clear.

### 3. Editing Polish & Visual FX Techniques
The client-side FFmpeg rendering engine enforces concrete editing polish:
- **Ken Burns Zoom Effect:** Applies continuous slow pan/zoom (`zoompan=z='min(zoom+0.0015,1.15)'`) to visual clips.
- **Sentence-Boundary Cut Timing:** Cut transitions match narration sentence boundaries rather than fixed intervals.
- **Color Grading Filter:** Enforces uniform LUT adjustment (`eq=contrast=1.05:brightness=0.02:saturation=1.1`) across stock footage sources.

### 4. Honest Voice Quality & Synthetic Audio Limitation
> **HONEST LIMITATION:** Free, client-side neural TTS models (`Xenova/mms-tts-eng`) running locally in browser WebAssembly produce clear and intelligible narration, but will still retain noticeable synthetic audio characteristics compared to premium paid studio voice models. High editing polish, Ken Burns effects, and CC0 ambient sound ducking elevate the visual production quality, but voice authenticity remains the single primary giveaway that content is AI-generated under a $0 infrastructure model.

### 5. Deferred 24/7 Unattended Operation & Manual Trigger Tagging
- **Unattended 24/7 Autonomous Operation:** Deferred until dedicated background server compute becomes available.
- **Manual Trigger Tagging:** Every production entry point triggering client-side rendering is explicitly tagged with `MANUAL_TRIGGER` in code comments.
