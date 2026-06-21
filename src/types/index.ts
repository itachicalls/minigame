export type GateEffect = {
  convoy?: number;
  convoyMul?: number;
  coins?: number;
  stamps?: number;
  integrity?: number;
  speedMul?: number;
  packages?: number;
  spawnEnemies?: EnemyType;
};

export type EnemyType = 'pickpocket' | 'rival' | 'drone' | 'boss';

export type BlockerKind = 'scan' | 'stamp' | 'ram' | 'toll';

export type ObstacleKind =
  | 'newsbox-row'
  | 'dog-fence'
  | 'party-tent'
  | 'bin-alley'
  | 'hoa-gate'
  | 'mailbox-row'
  | 'lawn-sprinkler'
  | 'package-spill'
  | 'news-stand'
  | 'food-cart'
  | 'alien-beacon'
  | 'fallen-sign'
  | 'checkpoint'
  | 'traffic-barricade'
  | 'burst-hydrant'
  | 'bus-shelter'
  | 'cactus-wall'
  | 'mirage-rock'
  | 'rockslide'
  | 'sand-drift'
  | 'skull-rock'
  | 'tumbleweed'
  | 'bone-arch'
  | 'sun-bleached-wreck'
  | 'fallen-log'
  | 'temple-rubble'
  | 'thorn-bramble'
  | 'flood-wreck'
  | 'totem-gate'
  | 'vine-snare'
  | 'quicksand-pit'
  | 'idol-shrine';

export type SegmentType =
  | { kind: 'gate'; z: number; safe: 'left' | 'right' }
  | { kind: 'vault'; z: number; clearance: 'jump' | 'slide' }
  | { kind: 'blocker'; z: number; blocker: BlockerKind; required?: number; label: string; packageCost?: number }
  | { kind: 'enemy'; z: number; enemy: EnemyType; count: number }
  | { kind: 'runner'; z: number; tier?: 'grunt' | 'raider' | 'stalker' }
  | { kind: 'coins'; z: number; count: number; spread?: number }
  | { kind: 'packages'; z: number; count: number; spread?: number }
  | { kind: 'obstacles'; z: number; items: { x: number; type: ObstacleKind }[] }
  | { kind: 'dropoff'; z: number };

export type GateOption = {
  label: string;
  effect: GateEffect;
  packageCost?: number;
};

/** Per-district cinematic color grade applied in the post pass. */
export type DistrictGrade = {
  /** Warm highlights push (orange/teal split). */
  warm: number;
  /** Cool purple lift in shadows. */
  purple: number;
  /** Saturation multiplier. */
  saturation: number;
  /** Vignette strength. */
  vignette: number;
};

export type DistrictTheme = {
  id: number;
  name: string;
  sky: string;
  skyBottom: string;
  fog: string;
  ground: string;
  ambient: number;
  sun: number;
  fogNear: number;
  fogFar: number;
  buildingHue: number;
  /** Sunset/horizon band color used in the sky gradient. */
  horizon?: string;
  /** Primary neon accent (road glow, signage, accent light). */
  accent?: string;
  /** Secondary accent (turbo, trim, fill). */
  accent2?: string;
  /** Bright road edge color. */
  accentEdge?: string;
  /** Cinematic post-grade for this district. */
  grade?: DistrictGrade;
};

export type LevelDef = {
  id: string;
  district: number;
  name: string;
  briefing: string;
  segments: SegmentType[];
  timeLimit: number;
  difficulty: number;
};

export type TurretId =
  | 'pepper-drone'
  | 'box-cannon'
  | 'helper-beacon'
  | 'spread-mail'
  | 'pierce-pack'
  | 'homing-stamp';
export type AbilityId = 'smoke-bomb' | 'rally-horn' | 'dash';
export type UpgradeId = 'package-armor' | 'coin-magnet' | 'jump-boots' | 'starter-pouches';

export type ShopItem = {
  id: TurretId | AbilityId | UpgradeId;
  category: 'gear' | 'ability' | 'upgrade';
  name: string;
  description: string;
  baseCost: number;
  maxLevel: number;
};

export type MailmanId = 'johnny' | 'dingo' | 'mert';

export type SaveData = {
  coins: number;
  unlockedLevels: string[];
  levelStars: Record<string, number>;
  purchases: Record<string, number>;
  equippedTurrets: TurretId[];
  equippedAbility: AbilityId | null;
  totalDeliveries: number;
  selectedCharacter: MailmanId;
  /** Mobile-only: continuous shooting when enabled */
  mobileAutoFire: boolean;
};

export type RunState = {
  convoy: number;
  maxConvoy: number;
  integrity: number;
  maxIntegrity: number;
  packages: number;
  maxPackages: number;
  stamps: number;
  coins: number;
  speed: number;
  baseSpeed: number;
  distance: number;
  integrityLost: boolean;
  bonusRoute: boolean;
};

export type GameResult = {
  won: boolean;
  stars: number;
  coinsEarned: number;
  levelId: string;
  time: number;
  deathReason?: string;
  bossLevel?: boolean;
  bossCleared?: boolean;
};

export const DEFAULT_SAVE: SaveData = {
  coins: 0,
  unlockedLevels: ['1-1'],
  levelStars: {},
  purchases: {},
  equippedTurrets: [],
  equippedAbility: null,
  totalDeliveries: 0,
  selectedCharacter: 'johnny',
  mobileAutoFire: true,
};

export const INITIAL_RUN: RunState = {
  convoy: 5,
  maxConvoy: 50,
  integrity: 3,
  maxIntegrity: 3,
  packages: 0,
  maxPackages: 25,
  stamps: 0,
  coins: 0,
  speed: 11,
  baseSpeed: 11,
  distance: 0,
  integrityLost: false,
  bonusRoute: false,
};

export type DeathReason = 'stolen' | 'overwhelmed' | 'timeout' | 'blocked' | 'wrong_turn';
