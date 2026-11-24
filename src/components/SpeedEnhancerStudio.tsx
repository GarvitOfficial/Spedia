import React, { useState } from "react";
import { YouTubePlayer } from "./YouTubePlayer";
import { LocalVideoPlayer } from "./LocalVideoPlayer";
import { FileVideo, Clock, Zap, BookCheck, ShieldCheck } from "lucide-react";

const YoutubeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface SpeedEnhancerStudioProps {
  onSpeedUpdate: (speed: number) => void;
}

export const SpeedEnhancerStudio: React.FC<SpeedEnhancerStudioProps> = ({ onSpeedUpdate }) => {
  const [activeTab, setActiveTab] = useState<"both" | "youtube" | "local">("both");
  const [recentSpeed, setRecentSpeed] = useState<number>(1.0);

  const handleSpeed = (s: number) => {
    setRecentSpeed(s);
    onSpeedUpdate(s);
  };

  // Calculate time saved on a 60 min lecture
  const calculateTimeSaved = (speedMultiplier: number) => {
    const originalMins = 60;
    const spentMins = originalMins / speedMultiplier;
    const saved = originalMins - spentMins;
    return saved.toFixed(0);
  };

  return (
    <div className="studio-container">
      {/* Editorial Sub-banner */}
      <div className="studio-intro-banner">
        <div className="intro-left">
          <span className="font-serif italic text-2xl text-ink">Playback Speed Master</span>
          <p className="text-xs text-ink-soft max-w-xl font-serif">
            Designed for learners, developers, and researchers. Accelerate YouTube streaming or local video files at 2x, 3x, or fine-tuned custom increments with instant pitch retention.
          </p>
        </div>

        {/* Tab switch between YouTube, Local or Both */}
        <div className="studio-subnav">
          <button
            type="button"
            onClick={() => setActiveTab("both")}
            className={`subnav-pill ${activeTab === "both" ? "active" : ""}`}
          >
            All Players
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("youtube")}
            className={`subnav-pill ${activeTab === "youtube" ? "active" : ""}`}
          >
            <YoutubeIcon size={14} /> YouTube
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("local")}
            className={`subnav-pill ${activeTab === "local" ? "active" : ""}`}
          >
            <FileVideo size={14} /> Local Video
          </button>
        </div>
      </div>

      {/* Productivity Stats Ticker */}
      <div className="productivity-ticker">
        <div className="ticker-item">
          <Clock size={14} className="text-earth" />
          <span>At <strong>2x speed</strong>: 60 min video finishes in <strong>30 mins</strong> (save 30m)</span>
        </div>
        <div className="ticker-divider">•</div>
        <div className="ticker-item">
          <Zap size={14} className="text-earth" />
          <span>At <strong>3x speed</strong>: 60 min video finishes in <strong>20 mins</strong> (save 40m)</span>
        </div>
        <div className="ticker-divider">•</div>
        <div className="ticker-item">
          <ShieldCheck size={14} className="text-earth" />
          <span>Natural Pitch Retention: Voice clarity intact</span>
        </div>
      </div>

      {/* Players Grid */}
      <div className={`players-grid ${activeTab === "both" ? "grid-two-col" : "grid-single-col"}`}>
        {(activeTab === "both" || activeTab === "youtube") && (
          <div className="player-column">
            <YouTubePlayer
              onSpeedChange={handleSpeed}
              onSwitchToLocal={() => setActiveTab("local")}
            />
          </div>
        )}

        {(activeTab === "both" || activeTab === "local") && (
          <div className="player-column">
            <LocalVideoPlayer onSpeedChange={handleSpeed} />
          </div>
        )}
      </div>
    </div>
  );
};
