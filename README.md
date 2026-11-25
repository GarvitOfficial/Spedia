<div align="center">

# Spedia

### *Control Every Second. Life's Too Short. Play It Faster.*

A high-performance video acceleration workstation and tactile editorial interface. Engineered for continuous playback speed scaling from **0.25x** up to **900x+** with **In-Memory RAM Caching**, **Anti-Buffer Turbo Shields**, and **Dynamic Memory Offloading** for both YouTube and local offline media.

<br />

[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Hardware Acceleration](https://img.shields.io/badge/Speed-Up%20to%20900x-3AA8D0?style=flat-square)](#speed-architecture)
[![Buffer Engine](https://img.shields.io/badge/Buffering-0ms%20in%20RAM-059669?style=flat-square)](#in-memory-ram-caching-0ms-latency)
[![Deployment](https://img.shields.io/badge/Deployment-GitHub%20Pages-181717?style=flat-square&logo=github)](https://pages.github.com/)

<br />

<img src="./assets/headerPage.png" alt="Spedia Home View" width="100%" style="border-radius: 12px; border: 1px solid rgba(238,244,246,0.12); box-shadow: 0 20px 50px rgba(0,0,0,0.5);" />

</div>

---

## Overview

Traditional web video players are limited to 2x or 16x playback speeds. Beyond 2x, network streaming protocols suffer from chunk starvation, audio distortion, and buffer deadlocks caused by blind seeking.

**Spedia** bridges this gap by decoupling playback velocity from network bottlenecks:

1. **In-Memory RAM Accelerator**: Downloads and caches raw video bytes into browser `Blob` memory, delivering true 0ms seek leaps up to **900x** with native audio pitch preservation.
2. **Anti-Buffer Turbo Shield**: Adaptive pacing and automated quality scaling for live YouTube streams, preventing seek deadlock.
3. **Tactile Editorial Interface**: A bespoke 3D cylindrical stage of video preview cards driven by physics, drag, wheel, and touch interactions.
4. **Zero-Leak Lifecycle Offloader**: Comprehensive cleanup routines that instantly revoke ObjectURLs and destroy player instances to eliminate background CPU and battery drain.

---

## Visual Showcase

<div align="center">

### Navigation & Live Metrics Stage
<img src="./assets/homePage.png" alt="Spedia Navigation & Metrics" width="100%" style="border-radius: 10px; border: 1px solid rgba(238,244,246,0.12);" />
<p align="left"><em>Real-time status indicators, editorial headline typography (Newsreader), and instant access to the floating Speed Studio Accelerator.</em></p>

<br />

### Speed Studio Accelerator
<img src="./assets/player.png" alt="Speed Studio Modal Player" width="100%" style="border-radius: 10px; border: 1px solid rgba(238,244,246,0.12);" />
<p align="left"><em>Dual-view playback studio with one-click presets (1x, 2x, 3x, 50x, 100x, 900x), continuous scrubber, dynamic speed badge, and RAM preloader banner.</em></p>

<br />

### Adaptive Buffering & Memory Controls
<img src="./assets/playerScrolled.png" alt="Speed Studio Controls and Buffer Shield" width="100%" style="border-radius: 10px; border: 1px solid rgba(238,244,246,0.12);" />
<p align="left"><em>Configurable pacing intervals (Fast 400ms, Anti-Buffer 750ms, Keyframe 1s), real-time RAM cache allocation, pitch preservation toggles, and instant offload triggers.</em></p>

</div>

---

## System Architecture

```mermaid
flowchart TD
    subgraph Input["Input Source"]
        YTA["YouTube Video URL / ID"]
        LOC["Local File Drag-and-Drop / MP4"]
    end

    subgraph Studio["Spedia Studio Accelerator"]
        YTA --> Routing{"Select Mode"}
        LOC --> RAMPlayer["Local Offline RAM Engine"]
        
        Routing -->|"Load to RAM (Offline 0ms)"| BackendDownload["Local yt-dlp + Node.js Engine"]
        Routing -->|"Live Stream (Anti-Buffer Shield)"| LiveShield["Client-side Turbo Shield"]
    end

    subgraph RAMPipeline["In-Memory RAM Pipeline"]
        BackendDownload --> StreamCheck["Format Muxing & Audio Verification"]
        StreamCheck --> ByteFetch["ArrayBuffer Browser Ingestion"]
        ByteFetch --> BlobStore["Blob URL in Browser Memory"]
        BlobStore --> VideoNode["Hardware-Decoded HTML5 Video Node"]
        RAMPlayer --> VideoNode
    end

    subgraph TurboPipeline["Live Stream Turbo Pipeline"]
        LiveShield --> StateWatcher{"Player State Monitor"}
        StateWatcher -->|"BUFFERING (3)"| PauseSeek["Halt Seek Leap Cascade"]
        StateWatcher -->|"PLAYING (1)"| TimedLeap["Adaptive Paced Seek (400ms-1000ms)"]
        LiveShield --> Bitrate["Downscale Bitrate to 144p/360p"]
    end

    subgraph Hardware["Output Engine"]
        VideoNode --> HighSpeedOutput["0-900x Playback (0ms Buffer, Pitch Locked)"]
        TimedLeap --> StreamOutput["Stabilized YouTube Stream Playback"]
        Bitrate --> StreamOutput
    end

    classDef accent fill:#141C22,stroke:#3AA8D0,stroke-width:2px,color:#EEF4F6;
    classDef highlight fill:#111920,stroke:#059669,stroke-width:2px,color:#EEF4F6;
    class DefInput,Studio,RAMPipeline,TurboPipeline,Hardware accent;
    class HighSpeedOutput,BlobStore highlight;
```

---

## Core Capabilities

### In-Memory RAM Caching (0ms Latency)
Streaming ultra-fast video over network connections is bottlenecked by TCP round-trip delays and CDN chunk slicing. Spedia solves this by ingesting media directly into volatile browser RAM:
- **Local Dev / Desktop Mode**: Uses a backend extraction pipeline powered by `yt-dlp` and Node.js to resolve JS challenges and download video and audio in one clean operation.
- **Client-Side RAM Blob**: Once fetched, bytes are stored as a local `Blob` reference. The disk copy is immediately purged, leaving zero filesystem clutter.
- **Zero-Latency Seeking**: Because the entire file resides in RAM, seeking forward at 50x–900x incurs 0ms network latency and zero re-buffering delays.

### Anti-Buffer Turbo Shield (Live Streams)
For users streaming directly without preloading:
- **State-Aware Guard**: Senses YouTube player state transitions (`BUFFERING`, state 3) and temporarily pauses subsequent seek leaps until the current keyframe finishes decoding.
- **Configurable Pacing**: Offers adjustable leap intervals (`Fast: 400ms`, `Anti-Buffer: 750ms`, `Keyframe: 1000ms`) giving CDN nodes adequate time to deliver data packets.
- **Automatic Downsampling**: Downscales playback quality to `small` (240p/360p) during extreme multipliers, reducing network bandwidth demands by up to 85%.

### Dynamic Memory Offloading
- **Single-Click Offload**: Closes open media streams, pauses playback, halts frame-skip intervals, and invokes `URL.revokeObjectURL()` to release browser heap memory.
- **Window Lifecycle Sync**: Automatically releases allocations on tab dismissal or browser close via `beforeunload` listeners.

### Lossless Audio Pitch Preservation
- Utilizes the Web Audio and HTMLMediaElement `preservesPitch` specification.
- Speech remains intelligible and natural without chipmunk distortion across sub-2x speeds, and automatically mutes high-frequency noise spikes during extreme multipliers (>3x).

---

## Multiplier Benchmark Matrix

| Multiplier | Mode Recommended | Frame Stepping | Audio Behavior | Latency |
|:---:|:---:|:---:|:---:|:---:|
| **0.25x – 2.0x** | Live Stream or RAM | Continuous Native (1x) | Pitch Locked Full Audio | 0ms |
| **2.1x – 16.0x** | Live Stream or RAM | Native Hardware Decoded | Pitch Locked / Muted >4x | < 10ms |
| **50.0x – 100.0x** | Load to RAM (Recommended) | Paced Keyframe Leaps (400ms) | Dynamic Mute | 0ms in RAM |
| **900.0x+** | In-Memory RAM Player | Discrete Frame Stepping (50ms) | Muted | 0ms in RAM |

> **Note**: Speeds at 3x and above display the `⚠️ 3x+ requires Load to RAM to avoid buffer` safeguard to guide users toward the zero-stall offline pipeline.

---

## Dual Environment Compatibility

Spedia is built to run seamlessly across both development workstations and static production hosts:

```mermaid
flowchart LR
    A["Environment"] --> B["Local Environment (localhost)"]
    A --> C["Static Hosting (GitHub Pages)"]

    B --> B1["Full yt-dlp binary extraction"]
    B --> B2["Direct YouTube video & audio caching into RAM"]
    B --> B3["Offline Local Player"]

    C --> C1["Zero-Server Static HTML/JS"]
    C --> C2["Anti-Buffer Turbo Shield for YouTube embeds"]
    C --> C3["Offline Local Player via file drag-and-drop & CORS demos"]

    classDef env fill:#141C22,stroke:#3AA8D0,stroke-width:1.5px,color:#EEF4F6;
    class A,B,C,B1,B2,B3,C1,C2,C3 env;
```

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- Optional for local YouTube downloads: [yt-dlp](https://github.com/yt-dlp/yt-dlp) (`brew install yt-dlp`)

### Installation & Local Setup

```bash
# Clone repository
git clone https://github.com/<username>/speedEnhancer.git
cd speedEnhancer

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Production Build

```bash
# Typecheck and build static production assets into dist/
npm run build

# Preview the production build locally
npm run preview
```

---

## Deployment to GitHub Pages

This repository includes a preconfigured GitHub Actions workflow (`.github/workflows/deploy.yml`):

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "Initialize Spedia"
   git push origin main
   ```
2. In your repository on GitHub:
   - Navigate to **Settings** → **Pages**.
   - Under **Build and deployment** → **Source**, select **GitHub Actions**.
3. Every commit pushed to `main` automatically builds and publishes the static app to your GitHub Pages URL.

---

## Keyboard & Interaction Shortcuts

- **Space**: Play / Pause active modal video.
- **Mouse Wheel / Trackpad**: Rotate the 3D Sea Ring card stage.
- **Drag & Drop**: Drop any `.mp4`, `.webm`, or `.mov` file onto the Local Player zone for instant in-memory playback.
- **Escape**: Close Speed Studio modal and trigger automatic memory offloading.

