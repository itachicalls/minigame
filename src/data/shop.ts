import type { ShopItem } from '../types';

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'pepper-drone',
    category: 'turret',
    name: 'Pepper Drone',
    description: 'Faster mail-gun fire rate during fights.',
    baseCost: 80,
    maxLevel: 3,
  },
  {
    id: 'box-cannon',
    category: 'turret',
    name: 'Box Cannon',
    description: 'Mail gun hits harder & clears gates faster.',
    baseCost: 120,
    maxLevel: 3,
  },
  {
    id: 'helper-beacon',
    category: 'turret',
    name: 'Helper Beacon',
    description: 'Slowly regenerates convoy between encounters.',
    baseCost: 100,
    maxLevel: 3,
  },
  {
    id: 'smoke-bomb',
    category: 'ability',
    name: 'Smoke Bomb',
    description: 'Thieves stop chasing for 4 seconds. 12s cooldown.',
    baseCost: 150,
    maxLevel: 2,
  },
  {
    id: 'rally-horn',
    category: 'ability',
    name: 'Rally Horn',
    description: 'Instant +12 convoy helpers. 15s cooldown.',
    baseCost: 130,
    maxLevel: 2,
  },
  {
    id: 'dash',
    category: 'ability',
    name: 'Express Dash',
    description: 'Invulnerable burst through obstacles. 10s cooldown.',
    baseCost: 140,
    maxLevel: 2,
  },
  {
    id: 'convoy-cap',
    category: 'upgrade',
    name: 'Convoy Cap',
    description: 'Raise maximum convoy size by 10.',
    baseCost: 60,
    maxLevel: 5,
  },
  {
    id: 'start-convoy',
    category: 'upgrade',
    name: 'Starting Crew',
    description: 'Begin each run with +3 extra helpers.',
    baseCost: 50,
    maxLevel: 5,
  },
  {
    id: 'package-armor',
    category: 'upgrade',
    name: 'Package Armor',
    description: '+1 package integrity segment.',
    baseCost: 70,
    maxLevel: 3,
  },
  {
    id: 'coin-magnet',
    category: 'upgrade',
    name: 'Coin Magnet',
    description: 'Wider coin pickup radius.',
    baseCost: 55,
    maxLevel: 3,
  },
];

export function itemCost(item: ShopItem, currentLevel: number): number {
  return Math.floor(item.baseCost * Math.pow(1.6, currentLevel));
}
