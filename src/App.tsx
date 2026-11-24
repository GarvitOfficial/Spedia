import React, { useState } from "react";
import { Header } from "./components/Header";
import { SpeedEnhancerStudio } from "./components/SpeedEnhancerStudio";
import "./index.css";

export default function App() {
  const [currentSpeed, setCurrentSpeed] = useState<number>(1.0);

  return (
    <div className="app-layout">
      {/* Top Header */}
      <Header currentSpeed={currentSpeed} />

      {/* Main Content Area */}
      <main className="app-main">
        <div className="view-pane studio-pane animate-fade-in">
          <SpeedEnhancerStudio onSpeedUpdate={setCurrentSpeed} />
        </div>
      </main>
    </div>
  );
}
