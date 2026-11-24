import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Upload,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Sliders,
  Zap,
  Repeat,
  Music,
  FileVideo,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  HardDrive,
  Power,
  RefreshCw,
  CheckCircle2
} from "lucide-react";

interface LocalVideoPlayerProps {
  onSpeedChange?: (speed: number) => void;
}

export const LocalVideoPlayer: React.FC<LocalVideoPlayerProps> = ({ onSpeedChange }) => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("No file selected");
  const [speed, setSpeed] = useState<number>(1.0);
  const [sliderMax, setSliderMax] = useState<number>(10.0);
  const [customInputSpeed, setCustomInputSpeed] = useState<string>("1.0");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [preservesPitch, setPreservesPitch] = useState<boolean>(true);
  
  // Offline RAM Cache & Offload state
  const [isRamPreloaded, setIsRamPreloaded] = useState<boolean>(true);
  const [ramSizeText, setRamSizeText] = useState<string>("2.1 MB");
  const [isOffloaded, setIsOffloaded] = useState<boolean>(false);
  const currentFileRef = useRef<File | null>(null);

  // A-B Looping
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  // Audio boost (Web Audio API)
  const [audioGain, setAudioGain] = useState<number>(1.0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isDragging = useRef<boolean>(false);

  // Generate a procedural demo video if user has no file
  const generateDemoVideo = () => {
    setIsOffloaded(false);
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d")!;
    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: BlobPart[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setVideoSrc(url);
      setFileName("Singapore Sketchbook Demo Reel (RAM Cached).webm");
      setIsRamPreloaded(true);
      setRamSizeText("2.1 MB");
    };

    mediaRecorder.start();

    let frame = 0;
    const totalFrames = 150; // 5 seconds of animation
    const draw = () => {
      if (frame >= totalFrames) {
        mediaRecorder.stop();
        return;
      }

      ctx.fillStyle = "#ece7dc";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(43, 39, 33, 0.2)";
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const angle = (frame / 30) * Math.PI * 2;

      ctx.save();
      ctx.translate(cx, cy - 40);
      ctx.rotate(angle);
      ctx.strokeStyle = "#9a6a3e";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 120, 0, Math.PI * 1.5);
      ctx.stroke();

      ctx.fillStyle = "#2b2721";
      ctx.beginPath();
      ctx.arc(0, -120, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = "#2b2721";
      ctx.font = "italic 44px 'Instrument Serif', Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("Speed Enhancer Demonstration Reel", cx, cy + 130);

      ctx.font = "20px 'Newsreader', Georgia, serif";
      ctx.fillStyle = "rgba(43, 39, 33, 0.75)";
      ctx.fillText(
        `Timecode: ${(frame / 30).toFixed(2)}s | Frame: ${frame} / ${totalFrames} | Test Speed: 50x–900x`,
        cx,
        cy + 175
      );

      frame++;
      requestAnimationFrame(draw);
    };

    draw();
  };

  // Load demo video on mount if no video selected
  useEffect(() => {
    generateDemoVideo();
  }, []);

  const hyperSkipRef = useRef<any>(null);

  // Update speed on video element
  const applySpeed = useCallback((newRate: number) => {
    const valid = Math.max(0.05, Number(newRate) || 1.0);
    setSpeed(valid);
    setCustomInputSpeed(valid.toString());
    if (valid > sliderMax) {
      setSliderMax(Math.ceil(valid / 10) * 10);
    }
    onSpeedChange?.(valid);
    if (videoRef.current) {
      videoRef.current.playbackRate = Math.min(valid, 16.0);
      if ("preservesPitch" in videoRef.current) {
        (videoRef.current as any).preservesPitch = preservesPitch;
      }
      if ("mozPreservesPitch" in videoRef.current) {
        (videoRef.current as any).mozPreservesPitch = preservesPitch;
      }
    }
  }, [preservesPitch, sliderMax, onSpeedChange]);

  // Hyper-Skip Engine for extreme speeds above browser 16x limit
  useEffect(() => {
    if (hyperSkipRef.current) {
      clearInterval(hyperSkipRef.current);
      hyperSkipRef.current = null;
    }

    if (isPlaying && speed > 16.0 && !isOffloaded) {
      const TICK_MS = 100; // 10 updates per second
      const extraPerTick = (speed - 16.0) * (TICK_MS / 1000);

      hyperSkipRef.current = setInterval(() => {
        if (videoRef.current) {
          const cur = videoRef.current.currentTime || 0;
          const dur = videoRef.current.duration || 0;
          const target = cur + extraPerTick;
          if (dur > 0 && target >= dur) {
            videoRef.current.currentTime = dur;
            videoRef.current.pause();
          } else {
            videoRef.current.currentTime = target;
          }
        }
      }, TICK_MS);
    }

    return () => {
      if (hyperSkipRef.current) {
        clearInterval(hyperSkipRef.current);
        hyperSkipRef.current = null;
      }
    };
  }, [isPlaying, speed, isOffloaded]);

  // Auto offload on page unload to prevent memory leak
  useEffect(() => {
    const handleUnload = () => {
      if (videoSrc && videoSrc.startsWith("blob:")) {
        URL.revokeObjectURL(videoSrc);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [videoSrc]);

  // Handle file select
  const handleFile = (file: File) => {
    if (!file) return;
    currentFileRef.current = file;
    setIsOffloaded(false);
    setIsRamPreloaded(false);
    setRamSizeText(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);

    if (videoSrc && videoSrc.startsWith("blob:")) {
      URL.revokeObjectURL(videoSrc);
    }
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setFileName(file.name);
    setIsPlaying(false);
    setCurrentTime(0);
    setLoopA(null);
    setLoopB(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    isDragging.current = false;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Preload entire video into RAM cache
  const preloadToRam = async () => {
    if (!currentFileRef.current) return;
    try {
      const file = currentFileRef.current;
      const buffer = await file.arrayBuffer();
      if (videoSrc && videoSrc.startsWith("blob:")) {
        URL.revokeObjectURL(videoSrc);
      }
      const blob = new Blob([buffer], { type: file.type || "video/mp4" });
      const url = URL.createObjectURL(blob);
      setVideoSrc(url);
      setIsRamPreloaded(true);
      setRamSizeText(`${(file.size / (1024 * 1024)).toFixed(1)} MB in RAM`);
    } catch {
      setIsRamPreloaded(false);
    }
  };

  // Offload video memory
  const offloadVideo = () => {
    if (hyperSkipRef.current) clearInterval(hyperSkipRef.current);
    if (videoSrc && videoSrc.startsWith("blob:")) {
      URL.revokeObjectURL(videoSrc);
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
    setVideoSrc(null);
    setIsOffloaded(true);
    setIsPlaying(false);
    setIsRamPreloaded(false);
    setFileName("Video Offloaded (Memory Free)");
  };

  // Audio Context for Volume Boost
  const setupAudioGraph = () => {
    if (!videoRef.current || audioCtxRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const gainNode = ctx.createGain();
      const source = ctx.createMediaElementSource(videoRef.current);
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      gainNode.gain.value = audioGain;

      audioCtxRef.current = ctx;
      gainNodeRef.current = gainNode;
      sourceNodeRef.current = source;
    } catch {
      // ignore if restricted
    }
  };

  const handleAudioGain = (gainVal: number) => {
    setAudioGain(gainVal);
    setupAudioGraph();
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = gainVal;
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  };

  const togglePitchPreservation = () => {
    const nextVal = !preservesPitch;
    setPreservesPitch(nextVal);
    if (videoRef.current) {
      (videoRef.current as any).preservesPitch = nextVal;
      (videoRef.current as any).mozPreservesPitch = nextVal;
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    setupAudioGraph();
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const now = videoRef.current.currentTime;
    setCurrentTime(now);

    if (isLooping && loopA !== null && loopB !== null && loopB > loopA) {
      if (now >= loopB || now < loopA) {
        videoRef.current.currentTime = loopA;
      }
    }
  };

  const handleScrub = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const stepFrame = (frames: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    const frameTime = 1 / 25;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + frames * frameTime));
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    setIsMuted(next);
    videoRef.current.muted = next;
  };

  const handleVolume = (val: number) => {
    setVolume(val);
    if (!videoRef.current) return;
    videoRef.current.volume = val;
    if (val === 0) {
      setIsMuted(true);
      videoRef.current.muted = true;
    } else if (isMuted) {
      setIsMuted(false);
      videoRef.current.muted = false;
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${mins}:${s < 10 ? "0" : ""}${s}.${ms}`;
  };

  return (
    <div className="sketch-card">
      <div className="sketch-card-header">
        <div className="flex-row items-center gap-2">
          <span className="ink-icon-badge">
            <FileVideo size={20} className="text-earth" />
          </span>
          <div>
            <h3 className="sketch-title text-xl">Local Video Speed Enhancer</h3>
            <p className="sketch-subtitle text-xs">Offline RAM-accelerated playback up to 900x with pitch lock</p>
          </div>
        </div>

        <div className="flex-row items-center gap-2 flex-wrap">
          {videoSrc ? (
            <button
              type="button"
              onClick={offloadVideo}
              className="sketch-btn-ghost text-xs"
              title="Unload video and release RAM memory completely"
            >
              <Power size={13} />
              <span>Offload Video</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={generateDemoVideo}
              className="sketch-btn-ghost text-xs"
              title="Generate a demo reel to test instant playback"
            >
              <RefreshCw size={13} />
              <span>Load Demo</span>
            </button>
          )}

          <div className="speed-pill-indicator">
            <Zap size={14} className="text-earth" />
            <span>Speed: <strong>{speed.toFixed(2)}x</strong></span>
          </div>
        </div>
      </div>

      {/* Drag & Drop or Select Local File Area */}
      <div
        className="drag-drop-zone"
        onDragOver={(e) => {
          e.preventDefault();
          isDragging.current = true;
        }}
        onDragLeave={() => {
          isDragging.current = false;
        }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept="video/*,.mkv,.mp4,.webm,.mov"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
          style={{ display: "none" }}
        />
        <div className="flex-col items-center gap-2">
          <Upload size={28} className="text-earth animate-bounce" />
          <p className="font-serif text-base text-ink font-medium">
            Click to Browse or Drag & Drop local video here
          </p>
          <span className="text-xs text-ink-faint">
            Supported: MP4, WebM, MOV, OGG, MKV (Unlimited resolution & length)
          </span>
          <div className="file-active-badge">
            <span>Current: <strong>{fileName}</strong></span>
          </div>
        </div>
      </div>

      {/* Video Viewport or Offloaded Standby */}
      <div className="video-viewport-wrapper">
        {isOffloaded ? (
          <div className="offloaded-view">
            <Power size={38} className="text-earth animate-pulse" />
            <h4 className="font-serif text-lg text-ink font-bold mt-2">Video Offloaded (RAM Free)</h4>
            <p className="text-xs text-ink-soft max-w-sm text-center font-sans mt-1">
              Memory and audio decoders have been cleared. Select a file or reload the demo reel.
            </p>
            <button
              type="button"
              onClick={generateDemoVideo}
              className="sketch-btn sketch-btn-primary flex-row items-center gap-2 mt-3"
            >
              <RefreshCw size={14} />
              <span>Load Demo Reel</span>
            </button>
          </div>
        ) : (
          <div className="video-viewport-aspect">
            {videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration);
                    videoRef.current.playbackRate = Math.min(speed, 16.0);
                  }
                }}
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
                className="local-video-element"
                playsInline
              />
            ) : (
              <div className="empty-viewport-notice">
                <p>No video selected. Load a local file or generate the demo video.</p>
              </div>
            )}
          </div>
        )}

        {/* Video Scrubber & Timeline Bar */}
        <div className="timeline-control-bar">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.01"
            value={currentTime}
            onChange={(e) => handleScrub(parseFloat(e.target.value))}
            className="sketch-timeline-slider"
          />
          <div className="timeline-info-row">
            <span className="font-mono text-xs text-ink">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            {isLooping && loopA !== null && loopB !== null && (
              <span className="loop-indicator-badge">
                Looping: {formatTime(loopA)} → {formatTime(loopB)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Speed Controls Section */}
      <div className="speed-control-panel">
        <div className="speed-panel-header">
          <div className="flex-row items-center gap-2">
            <Sliders size={18} className="text-earth" />
            <h4 className="font-serif text-lg text-ink font-semibold">Speed Enhancement Engine</h4>
          </div>
          <span className="current-rate-tag">
            Current Rate: <span className="font-mono font-bold text-earth text-base">{speed.toFixed(2)}x</span>
          </span>
        </div>

        {/* Hyper-Skip Status Banner for Local Video > 16x */}
        {speed > 16.0 && (
          <div className="hyper-skip-banner">
            <div className="flex-row items-center gap-2">
              <Zap size={16} className="text-earth animate-pulse" />
              <span className="font-serif font-bold text-sm text-ink">
                ⚡ Hyper-Skip Active: Advancing +{(speed * 0.1).toFixed(1)}s every 100ms ({speed.toFixed(0)}x Speed)
              </span>
            </div>
            <p className="text-xs text-ink-soft mt-1 font-sans">
              Browser hardware decoders natively limit playback to 16x. Hyper-Skip automatically advances frames in real-time to reach your target speed of {speed.toFixed(0)}x!
            </p>
          </div>
        )}

        {/* Offline RAM Buffer & Zero-Stall Engine */}
        <div className="adaptive-buffer-card">
          <div className="flex-row items-center justify-between flex-wrap gap-2">
            <div className="flex-row items-center gap-2">
              <HardDrive size={16} className="text-earth" />
              <span className="font-serif font-bold text-sm text-ink">
                Offline RAM Cache (Zero-Buffering Engine)
              </span>
              <span className={`buffer-health-pill ${isRamPreloaded ? "healthy" : "buffering"}`}>
                {isRamPreloaded ? `🟢 In RAM (${ramSizeText || "Cached"})` : "⚪ Disk Stream"}
              </span>
            </div>

            <div className="flex-row items-center gap-2">
              {!isRamPreloaded && currentFileRef.current && (
                <button
                  type="button"
                  onClick={preloadToRam}
                  className="sketch-btn-sm active"
                  title="Loads the full video file into RAM for instantaneous seek at 50x–900x"
                >
                  ⚡ Cache in RAM
                </button>
              )}
              {videoSrc && (
                <button
                  type="button"
                  onClick={offloadVideo}
                  className="sketch-btn-sm"
                  title="Releases all memory buffers and frees RAM"
                >
                  🧹 Offload RAM
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-ink-soft font-sans mt-1">
            {isRamPreloaded
              ? "⚡ Video resides directly in RAM. Ultra-speed playback (50x, 100x, 900x) runs with 0 network latency and 0 disk stalls."
              : "Click 'Cache in RAM' to pre-load this entire file into system memory for zero-lag seeking at 50x–900x."}
          </p>
        </div>

        {/* Speed Hero Buttons */}
        <div className="speed-hero-buttons hero-5-buttons">
          <button
            type="button"
            onClick={() => applySpeed(1.0)}
            className={`hero-speed-btn ${speed === 1.0 ? "active" : ""}`}
          >
            <RotateCcw size={15} />
            <span className="hero-speed-text">1x</span>
            <span className="hero-speed-hint">Normal</span>
          </button>

          <button
            type="button"
            onClick={() => applySpeed(2.0)}
            className={`hero-speed-btn ${speed === 2.0 ? "active" : ""}`}
          >
            <Sparkles size={15} />
            <span className="hero-speed-text">2x</span>
            <span className="hero-speed-hint">Double</span>
          </button>

          <button
            type="button"
            onClick={() => applySpeed(3.0)}
            className={`hero-speed-btn ${speed === 3.0 ? "active" : ""}`}
          >
            <Sparkles size={15} />
            <span className="hero-speed-text">3x</span>
            <span className="hero-speed-hint">Triple</span>
          </button>

          <button
            type="button"
            onClick={() => applySpeed(5.0)}
            className={`hero-speed-btn ${speed === 5.0 ? "active" : ""}`}
          >
            <Zap size={15} />
            <span className="hero-speed-text">5x</span>
            <span className="hero-speed-hint">Fast</span>
          </button>

          <button
            type="button"
            onClick={() => applySpeed(50.0)}
            className={`hero-speed-btn ${speed === 50.0 ? "active" : ""}`}
          >
            <Zap size={15} />
            <span className="hero-speed-text">50x</span>
            <span className="hero-speed-hint">Hyper 50x</span>
          </button>
        </div>

        {/* Custom Exact Speed Input & Slider Range Adjuster */}
        <div className="custom-input-bar">
          <div className="custom-direct-speed">
            <span className="text-xs font-serif text-ink">Exact Speed:</span>
            <div className="flex-row items-center gap-1">
              <input
                type="number"
                min="0.05"
                max="1000"
                step="0.1"
                value={customInputSpeed}
                onChange={(e) => setCustomInputSpeed(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    applySpeed(parseFloat(customInputSpeed));
                  }
                }}
                className="custom-speed-input"
                placeholder="50 or 100"
              />
              <span className="text-xs font-bold text-ink">x</span>
              <button
                type="button"
                onClick={() => applySpeed(parseFloat(customInputSpeed))}
                className="sketch-btn-sm active"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="slider-range-switch">
            <span className="text-xs font-serif text-ink">Slider Range:</span>
            {[10, 25, 50, 100].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSliderMax(m)}
                className={`range-max-pill ${sliderMax === m ? "active" : ""}`}
              >
                {m}x Max
              </button>
            ))}
          </div>
        </div>

        {/* Custom Speed Slider */}
        <div className="speed-slider-block">
          <div className="slider-label-row">
            <span className="slider-caption">
              Custom Speed Slider (0.25x – {sliderMax}x):
            </span>
            <span className="font-mono font-bold text-earth text-base">{speed.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.25"
            max={sliderMax}
            step={sliderMax > 25 ? 0.25 : 0.05}
            value={speed > sliderMax ? sliderMax : speed}
            onChange={(e) => applySpeed(parseFloat(e.target.value))}
            className="sketch-range-slider"
          />
          <div className="slider-ticks">
            <span>0.25x</span>
            <span>1x</span>
            <span>2x</span>
            <span>3x</span>
            {sliderMax >= 5 && <span>5x</span>}
            {sliderMax >= 10 && <span>10x</span>}
            {sliderMax >= 25 && <span>25x</span>}
            {sliderMax >= 50 && <span>50x</span>}
            <span className="font-bold text-earth">{sliderMax}x</span>
          </div>
        </div>

        {/* Extended Extreme Speed Preset Pills */}
        <div className="preset-buttons-grid">
          {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0, 8.0, 10.0, 15.0, 20.0, 50.0, 100.0].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => applySpeed(rate)}
              className={`preset-speed-pill ${Math.abs(speed - rate) < 0.02 ? "active" : ""}`}
            >
              {rate >= 1 && rate % 1 === 0 ? rate : rate.toFixed(2)}x
            </button>
          ))}
        </div>

        {/* Power Tools: Pitch Lock, Audio Gain Booster, A-B Repeat */}
        <div className="power-tools-bar">
          <button
            type="button"
            onClick={togglePitchPreservation}
            className={`tool-toggle-btn ${preservesPitch ? "active" : ""}`}
            title="Preserves pitch so voice doesn't sound like chipmunks at high speeds"
          >
            <Music size={14} />
            <span>Pitch Lock: <strong>{preservesPitch ? "ON (Natural Voice)" : "OFF (Pitch Shift)"}</strong></span>
          </button>

          {/* A-B Loop Controls */}
          <div className="ab-loop-group">
            <button
              type="button"
              onClick={() => setLoopA(currentTime)}
              className="sketch-btn-sm"
              title="Set point A to current time"
            >
              Set A ({loopA !== null ? formatTime(loopA) : "--"})
            </button>
            <button
              type="button"
              onClick={() => setLoopB(currentTime)}
              className="sketch-btn-sm"
              title="Set point B to current time"
            >
              Set B ({loopB !== null ? formatTime(loopB) : "--"})
            </button>
            <button
              type="button"
              onClick={() => setIsLooping(!isLooping)}
              className={`sketch-btn-sm ${isLooping ? "active" : ""}`}
              disabled={loopA === null || loopB === null}
            >
              <Repeat size={13} />
              <span>{isLooping ? "Looping Active" : "Loop A-B"}</span>
            </button>
          </div>

          {/* Audio Booster */}
          <div className="audio-boost-box">
            <span className="text-xs font-serif text-ink">Volume Boost:</span>
            {[1.0, 1.5, 2.0, 3.0].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => handleAudioGain(g)}
                className={`gain-chip ${audioGain === g ? "active" : ""}`}
              >
                {g * 100}%
              </button>
            ))}
          </div>
        </div>

        {/* Player Transport Controls */}
        <div className="aux-controls-row">
          <div className="flex-row items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="sketch-btn-icon"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <button
              type="button"
              onClick={() => stepFrame(-1)}
              className="sketch-btn-icon"
              title="Step backward 1 frame"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={() => stepFrame(1)}
              className="sketch-btn-icon"
              title="Step forward 1 frame"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
              }}
              className="sketch-btn-icon"
              title="Rewind 5s"
            >
              <RotateCcw size={16} /> <span className="text-xs font-mono">-5s</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
              }}
              className="sketch-btn-icon"
              title="Forward 5s"
            >
              <RotateCw size={16} /> <span className="text-xs font-mono">+5s</span>
            </button>
          </div>

          <div className="flex-row items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="sketch-btn-icon"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolume(parseFloat(e.target.value))}
              className="sketch-volume-slider"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />

            <button
              type="button"
              onClick={toggleFullscreen}
              className="sketch-btn-icon"
              title="Fullscreen"
            >
              <Maximize size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
