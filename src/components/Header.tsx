import React from "react";
import { Zap } from "lucide-react";

interface HeaderProps {
  currentSpeed: number;
}

export const Header: React.FC<HeaderProps> = ({ currentSpeed }) => {
  return (
    <header className="sketch-header">
      <div className="sketch-header-inner">
        {/* Brand identity */}
        <div className="sketch-brand">
          <div className="sketch-logo-seal">
            <span className="font-serif italic text-xl font-bold">SE</span>
          </div>
          <div>
            <h1 className="sketch-title text-2xl tracking-wide flex items-center gap-2">
              <span>Speed Enhancer</span>
              <span className="sketch-version-tag">Ultra Speed</span>
            </h1>
            <p className="sketch-subtitle text-xs">
              Continuous Playback Acceleration up to 100x • YouTube & Local Media
            </p>
          </div>
        </div>

        {/* Live Active Speed Pill */}
        <div className="sketch-header-actions">
          <div className="speed-live-pill" title="Current active playback rate">
            <span className="dot-pulse" />
            <Zap size={14} className="text-earth" />
            <span className="font-mono font-bold text-ink text-sm">
              {currentSpeed.toFixed(2)}x Active
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
