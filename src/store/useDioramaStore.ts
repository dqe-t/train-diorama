import { create } from 'zustand';
import {
  applyWorldSpaceTool,
  clearAllTracks,
  createOrganicDiorama,
} from '../core/dioramaBuilder';
import { DIORAMA_SPAN } from '../core/noise';
import { applySculptStamp } from '../core/terrainSculpt';
import { OrganicDioramaWorld, ToolType, Vec3Point } from '../types/diorama';

const INITIAL_SEED = 4208;

export interface DioramaStoreState {
  readonly world: OrganicDioramaWorld;
  readonly activeTool: ToolType;
  readonly hoverPoint: Vec3Point | null;
  readonly isPointerDragging: boolean;
  readonly trainRunning: boolean;
  readonly goldenHour: boolean;
  setActiveTool: (tool: ToolType) => void;
  setHoverPoint: (pt: Vec3Point | null) => void;
  setPointerDragging: (dragging: boolean) => void;
  interactAtWorldPoint: (worldX: number, worldZ: number) => void;
  sculptGroundAtPoint: (worldX: number, worldZ: number, direction: 'lift' | 'lower') => void;
  clearTracks: () => void;
  regenerateLandscape: (withStarterLoop: boolean) => void;
  toggleTrainRunning: () => void;
  toggleGoldenHour: () => void;
}

export const useDioramaStore = create<DioramaStoreState>((set, get): DioramaStoreState => ({
  world: createOrganicDiorama(DIORAMA_SPAN, INITIAL_SEED, true),
  activeTool: 'track',
  hoverPoint: null,
  isPointerDragging: false,
  trainRunning: true,
  goldenHour: false,

  setActiveTool: (tool: ToolType): void => {
    if (!tool) {
      throw new TypeError('CRITICAL: tool is required.');
    }
    set({ activeTool: tool });
  },

  setHoverPoint: (pt: Vec3Point | null): void => {
    set({ hoverPoint: pt });
  },

  setPointerDragging: (dragging: boolean): void => {
    if (typeof dragging !== 'boolean') {
      throw new TypeError('CRITICAL: dragging must be a boolean.');
    }
    set({ isPointerDragging: dragging });
  },

  interactAtWorldPoint: (worldX: number, worldZ: number): void => {
    const state = get();
    if (state.activeTool === 'sculpt') {
      state.sculptGroundAtPoint(worldX, worldZ, 'lift');
      return;
    }
    const updatedWorld = applyWorldSpaceTool(state.world, worldX, worldZ, state.activeTool);
    if (updatedWorld !== state.world) {
      set({ world: updatedWorld });
    }
  },

  sculptGroundAtPoint: (worldX: number, worldZ: number, direction: 'lift' | 'lower'): void => {
    if (!Number.isFinite(worldX) || !Number.isFinite(worldZ)) {
      throw new TypeError('CRITICAL: worldX and worldZ must be finite numbers.');
    }
    if (direction !== 'lift' && direction !== 'lower') {
      throw new TypeError('CRITICAL: direction must be "lift" or "lower".');
    }
    const state = get();
    const half = state.world.span * 0.5;
    if (Math.abs(worldX) > half || Math.abs(worldZ) > half) {
      return;
    }
    const updatedStamps = applySculptStamp(state.world.sculptStamps, worldX, worldZ, direction);
    set({
      world: {
        ...state.world,
        sculptStamps: updatedStamps,
      },
    });
  },

  clearTracks: (): void => {
    const state = get();
    set({ world: clearAllTracks(state.world) });
  },

  regenerateLandscape: (withStarterLoop: boolean): void => {
    if (typeof withStarterLoop !== 'boolean') {
      throw new TypeError('CRITICAL: withStarterLoop must be a boolean.');
    }
    const state = get();
    const nextSeed = state.world.seed + 137;
    const nextWorld = createOrganicDiorama(DIORAMA_SPAN, nextSeed, withStarterLoop);
    set({ world: nextWorld });
  },

  toggleTrainRunning: (): void => {
    set((state): Partial<DioramaStoreState> => ({ trainRunning: !state.trainRunning }));
  },

  toggleGoldenHour: (): void => {
    set((state): Partial<DioramaStoreState> => ({ goldenHour: !state.goldenHour }));
  },
}));
