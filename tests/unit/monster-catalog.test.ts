import { describe, expect, it } from 'vitest';
import { getMonster, getMonsterSpawns } from '../../src/game/data/monster-catalog';
import { getMap } from '../../src/game/maps/map-registry';
import { MAP_IDS } from '../../src/game/maps/types';

describe('monster catalog', () => {
  it('spawns four green mushrooms in the starter hunting map', () => {
    const spawns = getMonsterSpawns('green-mushroom-cave');
    expect(spawns).toHaveLength(4);
    expect(spawns.every((spawn) => spawn.monsterId === 'green-mushroom')).toBe(true);
  });

  it('provides normal monsters and the documented boss on late maps', () => {
    expect(getMonsterSpawns('ember-mine').filter((spawn) => getMonster(spawn.monsterId).boss)).toHaveLength(1);
    expect(getMonsterSpawns('moonlight-library').filter((spawn) => getMonster(spawn.monsterId).boss)).toHaveLength(1);
    expect(getMonsterSpawns('infinite-arena')).toHaveLength(1);
    expect(getMonster(getMonsterSpawns('infinite-arena')[0]!.monsterId).hp).toBe(80_000_000);
  });

  it('keeps towns and the endurance map free of combat spawns', () => {
    expect(getMonsterSpawns('cuning-city')).toEqual([]);
    expect(getMonsterSpawns('bandit-hideout')).toEqual([]);
    expect(getMonsterSpawns('endurance-forest')).toEqual([]);
  });

  it('places every ground enemy on the map visual ground', () => {
    for (const mapId of MAP_IDS) {
      const groundY = getMap(mapId).groundY;

      expect(getMonsterSpawns(mapId).every((spawn) => spawn.y === groundY), mapId).toBe(true);
    }
  });
});
