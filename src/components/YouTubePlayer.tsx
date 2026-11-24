import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Sliders,
  Zap,
  Sparkles,
  Shield,
  WifiOff,
  HardDrive,
  RefreshCw,
  Power,
  ArrowRight
} from "lucide-react";

const YoutubeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  onSpeedChange?: (speed: number) => void;
  onSwitchToLocal?: () => void;
}

const SAMPLE_VIDEOS = [
  { id: "M10QT8nhlHk", title: "Singapore 4K Scenic Walk", desc: "Gardens by the Bay & Marina Bay" },
  { id: "jfKfPfyJRdk", title: "Lofi Hip Hop Beats", desc: "Chill study & relax beats" },
  { id: "k7X7sZzSXY8", title: "TED-Ed Fast Thinking", desc: "High density speech & learning" },
  { id: "kJQP7kiw5Fk", title: "Despacito (Music)", desc: "Fast tempo testing" },
];

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ onSpeedChange, onSwitchToLocal }) => {
  const [videoInput, setVideoInput] = useState<string>("M10QT8nhlHk");
  const [currentVideoId, setCurrentVideoId] = useState<string>("M10QT8nhlHk");
  const [speed, setSpeed] = useState<number>(1.0);
  const targetSpeedRef = useRef<number>(1.0);
  const [sliderMax, setSliderMax] = useState<number>(10.0);
  const [customInputSpeed, setCustomInputSpeed] = useState<string>("1.0");
  const [hyperSkipEnabled, setHyperSkipEnabled] = useState<boolean>(true);
  
  // Adaptive Buffering & Offload States
  const [adaptiveBuffering, setAdaptiveBuffering] = useState<boolean>(true);
  const [pacingMode, setPacingMode] = useState<"adaptive" | "smooth" | "balanced" | "safe">("adaptive");
  const [lowQualityMode, setLowQualityMode] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const isBufferingRef = useRef<boolean>(false);
  const [isOffloaded, setIsOffloaded] = useState<boolean>(false);
  
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(80);
  const [availableSpeeds, setAvailableSpeeds] = useState<number[]>([0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]);
  const [playerReady, setPlayerReady] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const playerRef = useRef<any>(null);
  const containerId = useRef<string>(`yt-player-${Math.random().toString(36).substring(2, 9)}`);
  const intervalRef = useRef<any>(null);
  const hyperSkipRef = useRef<any>(null);

  // Extract YouTube ID from various URL formats or raw ID
  const extractVideoId = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return "M10QT8nhlHk";
    
    // Direct ID check (11 characters)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    
    try {
      if (trimmed.includes("youtu.be/")) {
        const parts = trimmed.split("youtu.be/");
        return parts[1].split(/[?&#]/)[0];
      }
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      if (url.searchParams.has("v")) {
        return url.searchParams.get("v") || "M10QT8nhlHk";
      }
      if (url.pathname.includes("/shorts/")) {
        return url.pathname.split("/shorts/")[1].split(/[?&#]/)[0];
      }
      if (url.pathname.includes("/embed/")) {
        return url.pathname.split("/embed/")[1].split(/[?&#]/)[0];
      }
    } catch {
      const match = trimmed.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
      if (match) return match[1];
    }
    return trimmed;
  };

  // Load YouTube IFrame API script
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player || isOffloaded) return;
      
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }

      const targetEl = document.getElementById(containerId.current);
      if (!targetEl) return;

      playerRef.current = new window.YT.Player(containerId.current, {
        videoId: currentVideoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            setPlayerReady(true);
            const rates = event.target.getAvailablePlaybackRates();
            if (rates && rates.length > 0) {
              setAvailableSpeeds(rates);
            }
            setDuration(event.target.getDuration() || 0);
            event.target.setPlaybackRate(Math.min(speed, 2.0));
            event.target.setVolume(volume);

            // Turbo quality drop if at high speed
            if (speed >= 10 && adaptiveBuffering && lowQualityMode) {
              try { event.target.setPlaybackQuality("small"); } catch {}
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: PLAYING = 1, PAUSED = 2, BUFFERING = 3, CUED = 5, ENDED = 0
            const state = event.data;
            if (state === 3) {
              setIsBuffering(true);
              isBufferingRef.current = true;
            } else if (state === 1) {
              setIsPlaying(true);
              setIsBuffering(false);
              isBufferingRef.current = false;
              setDuration(playerRef.current?.getDuration() || 0);
            } else if (state === 2 || state === 0) {
              setIsPlaying(false);
              setIsBuffering(false);
              isBufferingRef.current = false;
            }
          },
          onPlaybackRateChange: (event: any) => {
            const newRate = event.data;
            // Only update speed from YouTube event if we are in native range (<= 2x)
            if (targetSpeedRef.current <= 2.0) {
              setSpeed(newRate);
              setCustomInputSpeed(newRate.toString());
              onSpeedChange?.(newRate);
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentVideoId, isOffloaded]);

  // Auto offload on window unload to prevent rogue background streaming
  useEffect(() => {
    const handleUnload = () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  // Polling for current playback time
  useEffect(() => {
    if (isPlaying && !isOffloaded) {
      intervalRef.current = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          setCurrentTime(playerRef.current.getCurrentTime() || 0);
        }
      }, 400);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, isOffloaded]);

  // Apply speed change to YouTube Player
  const applySpeed = useCallback((newSpeed: number) => {
    const valid = Math.max(0.1, Number(newSpeed) || 1.0);
    targetSpeedRef.current = valid;
    setSpeed(valid);
    setCustomInputSpeed(valid.toString());
    if (valid > sliderMax) {
      setSliderMax(Math.ceil(valid / 10) * 10);
    }
    onSpeedChange?.(valid);

    if (playerRef.current) {
      // YouTube native player API clamps to 2.0. If higher, set to 2.0 and let Hyper-Skip handle the rest!
      if (playerRef.current.setPlaybackRate) {
        playerRef.current.setPlaybackRate(Math.min(valid, 2.0));
      }
      // Turbo 144p/240p quality drop when speed is high to eliminate buffering
      if (playerRef.current.setPlaybackQuality) {
        if (valid >= 10 && adaptiveBuffering && lowQualityMode) {
          try { playerRef.current.setPlaybackQuality("small"); } catch {}
        } else if (valid <= 2.0) {
          try { playerRef.current.setPlaybackQuality("default"); } catch {}
        }
      }
    }
  }, [sliderMax, onSpeedChange, adaptiveBuffering, lowQualityMode]);

  // Adaptive Hyper-Skip Engine for ultra speeds > 2.0x on YouTube
  useEffect(() => {
    if (hyperSkipRef.current) {
      clearInterval(hyperSkipRef.current);
      hyperSkipRef.current = null;
    }

    if (isPlaying && speed > 2.0 && hyperSkipEnabled && !isOffloaded) {
      // Calculate dynamic tick pacing based on user mode & speed
      let tickMs = 250;
      if (pacingMode === "smooth") {
        tickMs = 200;
      } else if (pacingMode === "balanced") {
        tickMs = 350;
      } else if (pacingMode === "safe") {
        tickMs = 500;
      } else {
        // Adaptive mode: adapt interval based on speed to prevent buffer congestion
        if (speed <= 10) tickMs = 250;
        else if (speed <= 50) tickMs = 350;
        else tickMs = 500;
      }

      // Desired distance in real time: speed * (tickMs / 1000)
      // Natural 2x playback in tickMs advances 2.0 * (tickMs / 1000)
      // Extra seek required: (speed - 2.0) * (tickMs / 1000)
      const extraSkipPerTick = (speed - 2.0) * (tickMs / 1000);

      hyperSkipRef.current = setInterval(() => {
        if (!playerRef.current) return;

        // Anti-Stall Guard: If player is actively buffering, skip seek and wait!
        if (adaptiveBuffering) {
          if (isBufferingRef.current) return;
          if (playerRef.current.getPlayerState && playerRef.current.getPlayerState() === 3) {
            isBufferingRef.current = true;
            setIsBuffering(true);
            return;
          }
        }

        if (playerRef.current.getCurrentTime) {
          const cur = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || 0;
          const target = cur + extraSkipPerTick;
          if (dur > 0 && target >= dur) {
            playerRef.current.seekTo(dur, true);
            playerRef.current.pauseVideo();
          } else {
            playerRef.current.seekTo(target, true);
          }
        }
      }, tickMs);
    }

    return () => {
      if (hyperSkipRef.current) {
        clearInterval(hyperSkipRef.current);
        hyperSkipRef.current = null;
      }
    };
  }, [isPlaying, speed, hyperSkipEnabled, adaptiveBuffering, pacingMode, isOffloaded]);

  const handleLoadVideo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const id = extractVideoId(videoInput);
    setCurrentVideoId(id);
    if (isOffloaded) {
      setIsOffloaded(false);
    } else if (playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById(id);
      playerRef.current.setPlaybackRate(Math.min(speed, 2.0));
    }
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const seekRelative = (seconds: number) => {
    if (!playerRef.current || !playerRef.current.getCurrentTime) return;
    const now = playerRef.current.getCurrentTime();
    playerRef.current.seekTo(Math.max(0, now + seconds), true);
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleVolume = (val: number) => {
    setVolume(val);
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(val);
      if (val === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
    }
  };

  const offloadPlayer = () => {
    if (hyperSkipRef.current) clearInterval(hyperSkipRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch {}
      playerRef.current = null;
    }
    setIsOffloaded(true);
    setIsPlaying(false);
    setPlayerReady(false);
  };

  const reloadPlayer = () => {
    setIsOffloaded(false);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  const currentPacingMs = pacingMode === "smooth" ? 200 : pacingMode === "balanced" ? 350 : pacingMode === "safe" ? 500 : (speed <= 10 ? 250 : speed <= 50 ? 350 : 500);

  return (
    <div className="sketch-card">
      <div className="sketch-card-header">
        <div className="flex-row items-center gap-2">
          <span className="ink-icon-badge">
            <YoutubeIcon size={20} className="text-earth" />
          </span>
          <div>
            <h3 className="sketch-title text-xl">YouTube Speed Enhancer</h3>
            <p className="sketch-subtitle text-xs">Accelerate lectures, walk-throughs & clips with adaptive buffering</p>
          </div>
        </div>

        <div className="flex-row items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={isOffloaded ? reloadPlayer : offloadPlayer}
            className={`sketch-btn-ghost text-xs ${isOffloaded ? "active" : ""}`}
            title={isOffloaded ? "Reload player to resume streaming" : "Unload player and stop all network streaming & memory buffers"}
          >
            <Power size={13} className={isOffloaded ? "text-earth" : ""} />
            <span>{isOffloaded ? "Reload Player" : "Offload Video"}</span>
          </button>

          <div className="speed-pill-indicator">
            <Zap size={14} className="text-earth" />
            <span>Speed: <strong>{speed.toFixed(2)}x</strong></span>
          </div>
        </div>
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleLoadVideo} className="url-input-group">
        <input
          type="text"
          value={videoInput}
          onChange={(e) => setVideoInput(e.target.value)}
          placeholder="Paste YouTube URL or Video ID (e.g., https://youtu.be/...)"
          className="sketch-input"
        />
        <button type="submit" className="sketch-btn sketch-btn-primary">
          {isOffloaded ? "Load Player" : "Load Video"}
        </button>
      </form>

      {/* Sample Quick Chips */}
      <div className="chips-row">
        <span className="chips-label">Quick samples:</span>
        {SAMPLE_VIDEOS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setVideoInput(item.id);
              setCurrentVideoId(item.id);
              if (isOffloaded) setIsOffloaded(false);
            }}
            className={`sample-chip ${currentVideoId === item.id && !isOffloaded ? "active" : ""}`}
            title={item.desc}
          >
            {item.title}
          </button>
        ))}
      </div>

      {/* Video Container Frame or Offloaded Standby */}
      <div className="video-viewport-wrapper">
        {isOffloaded ? (
          <div className="offloaded-view">
            <WifiOff size={38} className="text-earth animate-pulse" />
            <h4 className="font-serif text-lg text-ink font-bold mt-2">Player Memory Offloaded</h4>
            <p className="text-xs text-ink-soft max-w-sm text-center font-sans mt-1">
              Active streaming chunks, audio decoders, and iframe memory have been safely released to save RAM and stop background buffering.
            </p>
            <button
              type="button"
              onClick={reloadPlayer}
              className="sketch-btn sketch-btn-primary flex-row items-center gap-2 mt-3"
            >
              <RefreshCw size={14} />
              <span>Reload Video Player</span>
            </button>
          </div>
        ) : (
          <div className="video-viewport-aspect">
            <div id={containerId.current} className="youtube-iframe-target" />
          </div>
        )}
      </div>

      {/* Speed Enhancement Control Center */}
      <div className="speed-control-panel">
        <div className="speed-panel-header">
          <div className="flex-row items-center gap-2">
            <Sliders size={18} className="text-earth" />
            <h4 className="font-serif text-lg text-ink font-semibold">Speed Controls</h4>
          </div>
          <div className="flex-row items-center gap-2">
            <span className={`buffer-health-pill ${isBuffering ? "buffering" : "healthy"}`}>
              {isBuffering ? "🟡 Buffering Chunk..." : "🟢 Stream Synced"}
            </span>
            <span className="current-rate-tag">
              Current: <span className="font-mono font-bold text-earth text-base">{speed.toFixed(2)}x</span>
            </span>
          </div>
        </div>

        {/* Hyper-Skip Status Banner for Speeds > 2x */}
        {speed > 2.0 && (
          <div className="hyper-skip-banner">
            <div className="flex-row items-center justify-between gap-2 flex-wrap">
              <div className="flex-row items-center gap-2">
                <Zap size={16} className="text-earth animate-pulse" />
                <span className="font-serif font-bold text-sm text-ink">
                  ⚡ Hyper-Skip Engine Active ({speed.toFixed(0)}x Time-Lapse)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHyperSkipEnabled(!hyperSkipEnabled)}
                className={`sketch-btn-sm ${hyperSkipEnabled ? "active" : ""}`}
              >
                {hyperSkipEnabled ? "Bypass 2x Cap: ON" : "Bypass 2x Cap: OFF"}
              </button>
            </div>
            <p className="text-xs text-ink-soft mt-1 font-sans">
              Advancing <strong>+{(speed * (currentPacingMs / 1000)).toFixed(1)}s</strong> every {currentPacingMs}ms ({speed.toFixed(0)}x effective speed). YouTube natively limits normal playback to 2x; Hyper-Skip programmatically leaps forward to achieve true {speed.toFixed(0)}x!
            </p>
          </div>
        )}

        {/* Adaptive Buffering & Anti-Stall Controls (Solves 50x Buffering) */}
        <div className="adaptive-buffer-card">
          <div className="flex-row items-center justify-between flex-wrap gap-2">
            <div className="flex-row items-center gap-2">
              <Shield size={16} className="text-earth" />
              <span className="font-serif font-bold text-sm text-ink">
                Adaptive Buffering & Anti-Stall Engine
              </span>
            </div>

            <button
              type="button"
              onClick={() => setAdaptiveBuffering(!adaptiveBuffering)}
              className={`sketch-btn-sm ${adaptiveBuffering ? "active" : ""}`}
              title="Automatically synchronizes seeking with YouTube buffer to eliminate stalls at 50x+"
            >
              Adaptive Buffer: <strong>{adaptiveBuffering ? "ACTIVE" : "OFF"}</strong>
            </button>
          </div>

          <p className="text-xs text-ink-soft font-sans mt-1">
            {adaptiveBuffering
              ? "🛡️ Active: Automatically waits for stream chunks to load before leaping, preventing seek deadlock at 50x–900x."
              : "⚠️ Disabled: Blindly seeks every tick regardless of buffer readiness, which may trigger YouTube buffering."}
          </p>

          <div className="adaptive-details-row">
            <div className="flex-row items-center gap-1 flex-wrap">
              <span className="text-xs text-ink-soft font-medium">Pacing Rate:</span>
              {(["adaptive", "smooth", "balanced", "safe"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPacingMode(mode)}
                  className={`range-max-pill ${pacingMode === mode ? "active" : ""}`}
                >
                  {mode === "adaptive" ? "Auto-Sync" : mode === "smooth" ? "Fast (200ms)" : mode === "balanced" ? "Balanced (350ms)" : "Zero-Stall (500ms)"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setLowQualityMode(!lowQualityMode)}
              className={`pill-toggle-sm ${lowQualityMode ? "active" : ""}`}
              title="Automatically lowers streaming resolution to 144p/240p during ultra-speeds so chunks load 20x faster"
            >
              Turbo 144p/240p Stream: <strong>{lowQualityMode ? "ON" : "OFF"}</strong>
            </button>
          </div>
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
                min="0.1"
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

        {/* Continuous Speed Slider */}
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

        {/* Extended Preset Speed Pills */}
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

        {/* Auxiliary Controls: Play/Pause, Seek, Volume */}
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
              onClick={() => seekRelative(-10)}
              className="sketch-btn-icon"
              title="Rewind 10 seconds"
            >
              <RotateCcw size={16} /> <span className="text-xs font-mono">-10s</span>
            </button>

            <button
              type="button"
              onClick={() => seekRelative(10)}
              className="sketch-btn-icon"
              title="Forward 10 seconds"
            >
              <RotateCw size={16} /> <span className="text-xs font-mono">+10s</span>
            </button>

            <div className="time-display font-mono text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex-row items-center gap-2 volume-control-wrapper">
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
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolume(parseInt(e.target.value, 10))}
              className="sketch-volume-slider"
              title={`Volume: ${isMuted ? 0 : volume}%`}
            />
          </div>
        </div>

        {/* Zero-Buffering Offline Mode Bridge */}
        <div className="offline-bridge-banner">
          <div className="flex-row items-center justify-between flex-wrap gap-2">
            <div className="flex-row items-center gap-2">
              <HardDrive size={18} className="text-earth" />
              <div>
                <span className="font-serif font-bold text-sm text-ink block">
                  Want 100% Buffer-Free Speeds (50x–900x)?
                </span>
                <span className="text-xs text-ink-soft">
                  Streaming YouTube over the internet requires constant chunk downloading. Use the Local Video Player to play offline from RAM/disk with 0ms buffering!
                </span>
              </div>
            </div>
            {onSwitchToLocal && (
              <button
                type="button"
                onClick={onSwitchToLocal}
                className="sketch-btn-sm active flex-row items-center gap-1"
              >
                <span>Open Offline Player</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
