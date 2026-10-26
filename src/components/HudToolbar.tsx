import React from 'react';
import { useDioramaStore } from '../store/useDioramaStore';
import { ToolType } from '../types/diorama';

interface ToolDescriptor {
  readonly id: ToolType;
  readonly label: string;
  readonly hint: string;
  readonly badgeColor: string;
}

const TOOLS: ReadonlyArray<ToolDescriptor> = [
  {
    id: 'track',
    label: 'Lay Rails',
    hint: 'Click or drag across the desert — rails cut through mesas and trestle over the dry wash',
    badgeColor: '#555d66',
  },
  {
    id: 'cottage',
    label: 'Adobe',
    hint: 'Click flat ground to build an adobe (click an existing one to stack another story)',
    badgeColor: '#c4855a',
  },
  {
    id: 'station',
    label: 'Depot',
    hint: 'Place a frontier depot with water tower — aligns to the nearest track curve',
    badgeColor: '#5b3a26',
  },
  {
    id: 'trees',
    label: 'Cactus',
    hint: 'Click or drag to plant saguaro and prickly-pear patches',
    badgeColor: '#5d7f46',
  },
  {
    id: 'demolish',
    label: 'Erase',
    hint: 'Click or drag to remove rail points or buildings near the cursor',
    badgeColor: '#9e5046',
  },
];

export function HudToolbar(): React.JSX.Element {
  const activeTool = useDioramaStore((s): ToolType => s.activeTool);
  const trainRunning = useDioramaStore((s): boolean => s.trainRunning);
  const goldenHour = useDioramaStore((s): boolean => s.goldenHour);
  const seed = useDioramaStore((s): number => s.world.seed);
  const setActiveTool = useDioramaStore((s): typeof s.setActiveTool => s.setActiveTool);
  const clearTracks = useDioramaStore((s): typeof s.clearTracks => s.clearTracks);
  const regenerateLandscape = useDioramaStore(
    (s): typeof s.regenerateLandscape => s.regenerateLandscape
  );
  const toggleTrainRunning = useDioramaStore(
    (s): typeof s.toggleTrainRunning => s.toggleTrainRunning
  );
  const toggleGoldenHour = useDioramaStore((s): typeof s.toggleGoldenHour => s.toggleGoldenHour);

  const currentDescriptor =
    TOOLS.find((t): boolean => t.id === activeTool) ?? TOOLS[0];

  return (
    <>
      {/* Top-Left Title & Diorama Seed Badge */}
      <div
        style={{
          position: 'fixed',
          top: 20,
          left: 24,
          background: 'rgba(252, 248, 238, 0.92)',
          border: '2px solid #d4c4a8',
          borderRadius: 16,
          padding: '12px 18px',
          boxShadow: '0 8px 24px rgba(58, 43, 28, 0.12)',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: '#3b2e22' }}>
          Tiny Rails Diorama
        </div>
        <div style={{ fontSize: 12, color: '#786856', marginTop: 2 }}>
          Red Rock Desert • Mesas, Arches & Dry Wash • Seed #{seed} • Right-Drag to Slide
        </div>
      </div>

      {/* Top-Right World & Atmosphere Controls */}
      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 24,
          display: 'flex',
          gap: 10,
          pointerEvents: 'auto',
        }}
      >
        <button
          type="button"
          onClick={toggleTrainRunning}
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            border: '2px solid #d4c4a8',
            background: trainRunning ? '#4b7ea8' : '#fcf8ee',
            color: trainRunning ? '#ffffff' : '#3b2e22',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(58, 43, 28, 0.1)',
          }}
        >
          {trainRunning ? '🚂 Train Running' : '⏸ Train Paused'}
        </button>

        <button
          type="button"
          onClick={clearTracks}
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            border: '2px solid #d4c4a8',
            background: '#fcf8ee',
            color: '#3b2e22',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(58, 43, 28, 0.1)',
          }}
        >
          🛤️ Draw Fresh Track
        </button>

        <button
          type="button"
          onClick={toggleGoldenHour}
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            border: '2px solid #d4c4a8',
            background: goldenHour ? '#d9783b' : '#fcf8ee',
            color: goldenHour ? '#ffffff' : '#3b2e22',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(58, 43, 28, 0.1)',
          }}
        >
          {goldenHour ? '🌅 Sunset Glow' : '☀️ Daylight'}
        </button>

        <button
          type="button"
          onClick={(): void => regenerateLandscape(true)}
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            border: '2px solid #d4c4a8',
            background: '#fcf8ee',
            color: '#3b2e22',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(58, 43, 28, 0.1)',
          }}
        >
          🎲 New Landscape
        </button>
      </div>

      {/* Bottom Floating Tool Palette */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#524436',
            background: 'rgba(252, 248, 238, 0.9)',
            padding: '5px 14px',
            borderRadius: 20,
            border: '1px solid #d4c4a8',
          }}
        >
          {currentDescriptor.hint}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: 8,
            background: 'rgba(252, 248, 238, 0.95)',
            border: '2px solid #d4c4a8',
            borderRadius: 18,
            boxShadow: '0 10px 28px rgba(58, 43, 28, 0.16)',
          }}
        >
          {TOOLS.map((tool): React.JSX.Element => {
            const isSelected = tool.id === activeTool;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={(): void => setActiveTool(tool.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: isSelected ? `2px solid ${tool.badgeColor}` : '2px solid transparent',
                  background: isSelected ? tool.badgeColor : 'transparent',
                  color: isSelected ? '#ffffff' : '#3b2e22',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: isSelected ? '#ffffff' : tool.badgeColor,
                  }}
                />
                {tool.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
