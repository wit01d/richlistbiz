import React from 'react';
import { Pause, Play, Zap } from 'lucide-react';
import { Button } from '../../ui/primitives';
import { SUCCESSOR_SEQUENCE_MAX } from '../../constants/business';
import type { SimulationMode } from '../../types/simulation';

interface SimulationControlsProps {
  isPlaying: boolean;
  speed: number;
  simulationMode: SimulationMode;
  onPlayToggle: () => void;
  onSpeedChange: (speed: number) => void;
  onModeChange: (mode: SimulationMode) => void;
  onStep: () => void;
  onReset: () => void;
  onLoadScenario?: () => void;
  hideScenarioButton?: boolean;
}

const speedOptions = [
  { value: 2500, label: '0.5x Speed' },
  { value: 1500, label: '1x Speed' },
  { value: 800, label: '2x Speed' },
  { value: 400, label: '4x Speed' },
  { value: 150, label: '10x Speed' },
  { value: 75, label: '20x Speed' },
];

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isPlaying,
  speed,
  simulationMode,
  onPlayToggle,
  onSpeedChange,
  onModeChange,
  onStep,
  onReset,
  onLoadScenario,
  hideScenarioButton = false,
}) => {
  return (
    <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl mb-6">
      {/* Primary Controls */}
      <div className="flex gap-3 justify-center mb-4 flex-wrap">
        <Button
          variant={isPlaying ? 'neon-pink' : 'neon-purple'}
          onClick={onPlayToggle}
          icon={isPlaying ? <Pause size={16} /> : <Play size={16} />}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Button>

        <Button
          variant="neon-blue"
          onClick={onStep}
          disabled={isPlaying}
        >
          Step
        </Button>

        <Button
          variant="danger"
          onClick={onReset}
        >
          Reset
        </Button>

        <select
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-neon-purple"
        >
          {speedOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Secondary Controls */}
      <div className="flex gap-3 justify-center flex-wrap">
        {!hideScenarioButton && onLoadScenario && (
          <Button
            variant="ghost"
            onClick={onLoadScenario}
            className="bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 text-neon-pink border border-neon-pink/30 hover:from-neon-purple/30 hover:to-neon-pink/30"
          >
            Load Successor Scenario
          </Button>
        )}

        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
          <span className="text-xs text-gray-400">Mode:</span>
          <button
            onClick={() => onModeChange('random')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              simulationMode === 'random'
                ? 'bg-neon-purple text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            Random
          </button>
          <button
            onClick={() => onModeChange('targeted')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              simulationMode === 'targeted'
                ? 'bg-neon-pink text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            Targeted
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-xs text-gray-400">
          {simulationMode === 'targeted' ? (
            <span>Focusing recruits on users with &lt;{SUCCESSOR_SEQUENCE_MAX} deposits</span>
          ) : (
            <span>Random referral distribution</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulationControls;
