import { IS_MOBILE } from './platform';

export type SpectacleKind =
  | 'orbital-flash'
  | 'dogfight'
  | 'meteor-streak'
  | 'energy-surge'
  | 'distant-barrage'
  | 'alien-rain';

export type SpectacleEvent = {
  kind: SpectacleKind;
  message: string;
  pulse: number;
  duration: number;
  /** When true, Game spawns a real road hazard/reward and may toast. */
  gameplay: boolean;
};

type SpectacleCtx = {
  playerZ: number;
  comboCount: number;
  runnerCount: number;
  night: number;
};

/** Keeps the run visually loud — target one "wow" beat every ~20–30s of travel. */
export class SpectacleDirector {
  private nextEventZ = 55;
  private pulse = 0;
  private combatIntensity = 0;
  private active: SpectacleEvent | null = null;
  private activeT = 0;

  reset(): void {
    this.nextEventZ = 55 + Math.random() * 20;
    this.pulse = 0;
    this.combatIntensity = 0;
    this.active = null;
    this.activeT = 0;
  }

  getPostPulse(): number {
    return this.pulse;
  }

  getCombatIntensity(): number {
    return this.combatIntensity;
  }

  getActive(): SpectacleEvent | null {
    return this.active;
  }

  /** Call on every shot / kill to ramp music & bloom. */
  bumpCombat(amount: number): void {
    this.combatIntensity = Math.min(1, this.combatIntensity + amount);
    this.pulse = Math.min(1, this.pulse + amount * 0.35);
  }

  update(dt: number, ctx: SpectacleCtx): SpectacleEvent | null {
    this.combatIntensity = Math.max(0, this.combatIntensity - dt * 0.08);
    this.pulse = Math.max(0, this.pulse - dt * 1.4);

    if (this.active) {
      this.activeT -= dt;
      if (this.activeT <= 0) this.active = null;
    }

    if (ctx.playerZ < this.nextEventZ) return null;

    this.nextEventZ = ctx.playerZ + (IS_MOBILE ? 52 : 46) + Math.random() * 28;
    const ev = this.pickEvent(ctx);
    this.active = ev;
    this.activeT = ev.duration;
    this.pulse = Math.min(1, this.pulse + ev.pulse);
    this.combatIntensity = Math.min(1, this.combatIntensity + ev.pulse * 0.5);
    return ev;
  }

  private pickEvent(ctx: SpectacleCtx): SpectacleEvent {
    const roll = Math.random();
    if (ctx.night > 0.45 && roll < 0.28) {
      return {
        kind: 'orbital-flash',
        message: '☄ Jump bar incoming!',
        pulse: 0.55,
        duration: 2.8,
        gameplay: true,
      };
    }
    if (roll < 0.45) {
      return {
        kind: 'dogfight',
        message: '',
        pulse: 0.35,
        duration: 4,
        gameplay: false,
      };
    }
    if (roll < 0.62) {
      return {
        kind: 'meteor-streak',
        message: '🌠 Coin shower!',
        pulse: 0.4,
        duration: 3.2,
        gameplay: true,
      };
    }
    if (roll < 0.78) {
      return {
        kind: 'energy-surge',
        message: '⚡ Slide under the surge!',
        pulse: 0.45,
        duration: 2.5,
        gameplay: true,
      };
    }
    if (ctx.runnerCount >= 3 && roll < 0.9) {
      return {
        kind: 'alien-rain',
        message: '👾 Reinforcements dropping!',
        pulse: 0.38,
        duration: 2.2,
        gameplay: true,
      };
    }
    return {
      kind: 'distant-barrage',
      message: '',
      pulse: 0.42,
      duration: 3,
      gameplay: false,
    };
  }
}
