import type { MapId } from '../maps/types';

export type MonsterId =
  | 'green-mushroom'
  | 'shadow-sentinel'
  | 'crystal-wolf'
  | 'forgotten-zombie'
  | 'abyss-golem'
  | 'coral-mangrove'
  | 'ember-zombie'
  | 'moonlight-wolf'
  | 'ignikar'
  | 'lunasion'
  | 'one-punch-guardian';

export interface MonsterDefinition {
  id: MonsterId;
  label: string;
  level: number;
  hp: number;
  defense: number;
  contactDamage: number;
  speed: number;
  exp: number;
  mesos: number;
  color: number;
  boss: boolean;
  width: number;
  height: number;
  respawnMs: number;
}

export interface MonsterSpawn {
  id: string;
  monsterId: MonsterId;
  x: number;
  y: number;
  patrolRadius: number;
}

function monster(
  id: MonsterId,
  label: string,
  level: number,
  hp: number,
  defense: number,
  contactDamage: number,
  speed: number,
  exp: number,
  mesos: number,
  color: number,
  boss = false,
  width = 48,
  height = 54,
  respawnMs = 8_000
): MonsterDefinition {
  return Object.freeze({ id, label, level, hp, defense, contactDamage, speed, exp, mesos, color, boss, width, height, respawnMs });
}

const MONSTERS: Readonly<Record<MonsterId, MonsterDefinition>> = Object.freeze({
  'green-mushroom': monster('green-mushroom', '초록버섯', 12, 240, 0, 18, 42, 60, 18, 0x65d46e),
  'shadow-sentinel': monster('shadow-sentinel', '그림자 파수꾼', 35, 14_000, 80, 90, 58, 260, 75, 0x6876a8),
  'crystal-wolf': monster('crystal-wolf', '수정굴 늑대', 35, 14_000, 80, 90, 88, 280, 82, 0x79d9f2),
  'forgotten-zombie': monster('forgotten-zombie', '망각된 기술자 좀비', 50, 50_000, 140, 150, 34, 520, 125, 0x8da68a),
  'abyss-golem': monster('abyss-golem', '심연의 골렘', 70, 160_000, 200, 260, 25, 920, 210, 0x594c72, false, 64, 82),
  'coral-mangrove': monster('coral-mangrove', '산호 맹그로브', 75, 220_000, 220, 280, 30, 1_050, 240, 0xd8796f, false, 62, 80),
  'ember-zombie': monster('ember-zombie', '잿불 광부 좀비', 105, 750_000, 320, 450, 38, 2_200, 470, 0xd56848),
  'moonlight-wolf': monster('moonlight-wolf', '월광 늑대', 150, 4_000_000, 450, 850, 102, 6_500, 1_200, 0xb7c9ff),
  ignikar: monster('ignikar', '폭열군주 이그니카르', 100, 4_000_000, 400, 600, 32, 12_000, 3_000, 0xff793f, true, 88, 110, 15_000),
  lunasion: monster('lunasion', '월식현자 루나시온', 140, 20_000_000, 600, 1_000, 44, 35_000, 8_000, 0xa887ff, true, 92, 118, 20_000),
  'one-punch-guardian': monster('one-punch-guardian', '무한의 수호자', 200, 80_000_000, 400, Number.MAX_SAFE_INTEGER, 52, 120_000, 25_000, 0xf2c84b, true, 112, 138, 25_000)
});

function spawn(id: string, monsterId: MonsterId, x: number, y: number, patrolRadius: number): MonsterSpawn {
  return Object.freeze({ id, monsterId, x, y, patrolRadius });
}

function spawnLine(prefix: string, monsterId: MonsterId, xs: readonly number[], y: number, patrolRadius: number): readonly MonsterSpawn[] {
  return Object.freeze(xs.map((x, index) => spawn(`${prefix}-${index + 1}`, monsterId, x, y, patrolRadius)));
}

const SPAWNS: Readonly<Record<MapId, readonly MonsterSpawn[]>> = Object.freeze({
  'cuning-city': [],
  'bandit-hideout': [],
  'green-mushroom-cave': spawnLine('mushroom', 'green-mushroom', [520, 850, 1180, 1480], 660, 100),
  'shadow-testing-ground': [
    ...spawnLine('sentinel', 'shadow-sentinel', [430, 690, 930], 660, 80),
    spawn('trial-golem', 'abyss-golem', 1110, 660, 60)
  ],
  'crystal-ant-cave': spawnLine('crystal-wolf', 'crystal-wolf', [480, 800, 1160, 1500], 660, 120),
  'clockwork-tower': spawnLine('zombie', 'forgotten-zombie', [480, 790, 1150, 1500], 660, 90),
  'sunken-coral-temple': spawnLine('mangrove', 'coral-mangrove', [480, 790, 1140, 1490], 660, 70),
  'ember-mine': [
    ...spawnLine('ember-zombie', 'ember-zombie', [460, 760, 1050, 1320], 660, 80),
    spawn('boss-ignikar', 'ignikar', 1600, 660, 70)
  ],
  'moonlight-library': [
    ...spawnLine('moon-wolf', 'moonlight-wolf', [460, 760, 1050, 1320], 660, 110),
    spawn('boss-lunasion', 'lunasion', 1600, 660, 70)
  ],
  'infinite-arena': [spawn('boss-one-punch', 'one-punch-guardian', 1500, 660, 160)],
  'endurance-forest': []
});

export function getMonster(monsterId: MonsterId): MonsterDefinition {
  return MONSTERS[monsterId];
}

export function getMonsterSpawns(mapId: MapId): readonly MonsterSpawn[] {
  return SPAWNS[mapId];
}

export const MONSTER_CATALOG = MONSTERS;
