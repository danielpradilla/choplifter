"use client";

import { useEffect, useRef, useState } from "react";
import type { MissionControls, MissionReport } from "@/game/createGame";

const INITIAL_REPORT: MissionReport = {
  phase: "ready",
  lost: 0,
  aboard: 0,
  saved: 0,
  lives: 3,
  message: "Awaiting pilot",
};

export function LifelineGame() {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: (removeCanvas: boolean, noReturn?: boolean) => void } | null>(null);
  const controlsRef = useRef<MissionControls>({
    left: false,
    right: false,
    up: false,
    down: false,
    fire: false,
    rotate: false,
    pause: false,
    restart: false,
    started: false,
    muted: false,
    audio: null,
  });
  const [report, setReport] = useState(INITIAL_REPORT);
  const [booted, setBooted] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    let alive = true;
    async function boot() {
      if (!mountRef.current) return;
      const { createLifelineGame } = await import("@/game/createGame");
      if (!alive || !mountRef.current) return;
      gameRef.current = createLifelineGame(mountRef.current, controlsRef.current, (next) => {
        if (alive) setReport(next);
      });
      setBooted(true);
    }
    boot();
    return () => {
      alive = false;
      gameRef.current?.destroy(true);
      controlsRef.current.audio?.close().catch(() => undefined);
      gameRef.current = null;
    };
  }, []);

  const startMission = () => {
    if (!controlsRef.current.audio) {
      controlsRef.current.audio = new AudioContext();
    }
    controlsRef.current.audio.resume().catch(() => undefined);
    controlsRef.current.started = true;
    setReport((current) => ({ ...current, phase: "playing", message: "Lift off" }));
  };

  const restartMission = () => {
    controlsRef.current.restart = true;
    controlsRef.current.started = true;
    setReport(INITIAL_REPORT);
    requestAnimationFrame(() => setReport((current) => ({ ...current, phase: "playing" })));
  };

  const hold = (key: keyof Pick<MissionControls, "left" | "right" | "up" | "down" | "fire">) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      controlsRef.current[key] = true;
    },
    onPointerUp: () => { controlsRef.current[key] = false; },
    onPointerCancel: () => { controlsRef.current[key] = false; },
    onPointerLeave: () => { controlsRef.current[key] = false; },
  });

  const pulse = (key: "rotate" | "pause") => () => {
    controlsRef.current[key] = true;
    window.setTimeout(() => { controlsRef.current[key] = false; }, 90);
  };

  const toggleMute = () => {
    const next = !muted;
    controlsRef.current.muted = next;
    setMuted(next);
  };

  return (
    <div className="game-console">
      <div className="console-topline">
        <div>
          <span>MISSION 01</span>
          <strong>{report.message}</strong>
        </div>
        <div className="console-actions">
          <button type="button" onClick={pulse("pause")} aria-label="Pause mission">Ⅱ</button>
          <button type="button" onClick={toggleMute} aria-label={muted ? "Turn sound on" : "Mute sound"}>
            {muted ? "SOUND OFF" : "SOUND ON"}
          </button>
        </div>
      </div>

      <div className="game-viewport">
        <div ref={mountRef} className="game-mount" aria-label="Playable Lifeline 82 game canvas" />

        {(!controlsRef.current.started || report.phase === "ready") && (
          <div className="game-overlay start-overlay">
            <p className="eyebrow">Incoming field transmission</p>
            <h2>64 lives are waiting.</h2>
            <p>Free the captives, land nearby, carry up to 16, and return to the striped home pad.</p>
            <button type="button" onClick={startMission} disabled={!booted}>
              {booted ? "Start mission" : "Preparing aircraft…"}
            </button>
            <small>Arrow keys / WASD to fly · X to rotate · Space to fire</small>
          </div>
        )}

        {(report.phase === "won" || report.phase === "lost") && (
          <div className="game-overlay result-overlay">
            <p className="eyebrow">Mission report</p>
            <h2>{report.phase === "won" ? "Every one is home." : "The mission is over."}</h2>
            <div className="result-score">
              <span><strong>{report.saved}</strong> saved</span>
              <span><strong>{report.lost}</strong> lost</span>
            </div>
            <button type="button" onClick={restartMission}>Fly again</button>
          </div>
        )}

        <div className="touch-controls" aria-label="Touch flight controls">
          <div className="touch-dpad">
            <button type="button" className="touch-up" aria-label="Fly up" {...hold("up")}>↑</button>
            <button type="button" className="touch-left" aria-label="Fly left" {...hold("left")}>←</button>
            <button type="button" className="touch-down" aria-label="Fly down" {...hold("down")}>↓</button>
            <button type="button" className="touch-right" aria-label="Fly right" {...hold("right")}>→</button>
          </div>
          <div className="touch-actions">
            <button type="button" onClick={pulse("rotate")} aria-label="Rotate helicopter">ROTATE</button>
            <button type="button" className="fire-button" aria-label="Fire" {...hold("fire")}>FIRE</button>
          </div>
        </div>
      </div>

      <div className="console-footer" aria-live="polite">
        <span><i className="loss" /> LOST <strong>{String(report.lost).padStart(2, "0")}</strong></span>
        <span><i className="aboard" /> ABOARD <strong>{String(report.aboard).padStart(2, "0")}</strong></span>
        <span><i className="saved" /> SAVED <strong>{String(report.saved).padStart(2, "0")}</strong></span>
        <span className="lives-readout">AIRCRAFT {"◆".repeat(report.lives)}{"◇".repeat(Math.max(0, 3 - report.lives))}</span>
      </div>
    </div>
  );
}
