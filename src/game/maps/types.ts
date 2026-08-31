const mapIds = [
  'cuning-city',
  'bandit-hideout',
  'green-mushroom-cave',
  'shadow-testing-ground',
  'crystal-ant-cave',
  'clockwork-tower',
  'sunken-coral-temple',
  'ember-mine',
  'moonlight-library',
  'infinite-arena',
  'endurance-forest'
] as const;

export const MAP_IDS = Object.freeze(mapIds);
export const PLATFORM_THICKNESS = 24;

export type MapId = (typeof MAP_IDS)[number];

export interface PlatformDef {
  id: string;
  x: number;
  y: number;
  width: number;
  oneWay: boolean;
}

export interface RopeDef {
  id: string;
  x: number;
  topY: number;
  bottomY: number;
}

export interface PortalDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetMapId: MapId;
  targetPortalId: string;
  label: string;
  minLevel?: number;
  maxLevel?: number;
  hiddenUntilExpeditionStage?: 'upperboss';
  requiresActiveExam?: boolean;
}

export interface MapDef {
  id: MapId;
  width: number;
  height: number;
  groundY: number;
  platforms: PlatformDef[];
  ropes: RopeDef[];
  portals: PortalDef[];
  defaultSpawn: {
    x: number;
    y: number;
  };
  recommendedLevel: [number, number] | null;
}
