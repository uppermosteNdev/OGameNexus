import lfBonusesParsedData from './lfBonusesParsedData.json';
import { LIFEFORM_TECH_DATA, getLfTech } from './lifeformTechData';
import { MemberEmpireDetail } from '../dashboard/views/OverwatchEmpire';

export interface LifeformExperienceItem {
  lifeformId: number;
  name: string;
  level: number;
  bonus: number;
}

export interface LifeformTechBreakdownItem {
  slot: number;
  level: number;
  techId: number;
  name: string;
  value: string;
}

export interface PlanetBonusBreakdown {
  planetName: string;
  coords: string;
  totalBonus: string;
  techs: LifeformTechBreakdownItem[];
}

export interface ResourceBonusItem {
  key: string;
  name: string;
  total: string;
  breakdown: PlanetBonusBreakdown[];
}

export interface ExpeditionBonusItem {
  key: string;
  name: string;
  total: string;
  breakdown: PlanetBonusBreakdown[];
}

export interface ShipBonusItem {
  name: string;
  weapons: string;
  shield: string;
  armour: string;
  speed: string;
  cargo: string;
  fuel: string;
  breakdown: PlanetBonusBreakdown[];
}

export interface DefenseBonusItem {
  name: string;
  weapons: string;
  shield: string;
  armour: string;
  breakdown: PlanetBonusBreakdown[];
}

export interface CostAndTimeBonusItem {
  name: string;
  costReduction: string;
  timeReduction: string;
  breakdown: PlanetBonusBreakdown[];
}

export interface CharacterClassPerk {
  name: string;
  baseBonus: string;
  incBonus: string;
}

export interface CharacterClassBonusItem {
  name: string;
  total: string;
  perks: CharacterClassPerk[];
  breakdown: PlanetBonusBreakdown[];
}

export interface MiscBonusItem {
  name: string;
  total: string;
  breakdown: PlanetBonusBreakdown[];
}

export interface LifeformBonusOverviewData {
  experienceLevels: LifeformExperienceItem[];
  resources: ResourceBonusItem[];
  expedition: ExpeditionBonusItem[];
  ships: ShipBonusItem[];
  defenses: DefenseBonusItem[];
  costAndTime: CostAndTimeBonusItem[];
  characterClasses: CharacterClassBonusItem[];
  misc: MiscBonusItem[];
}

const SHIPS_LIST: Array<{ id: number; name: string }> = [
  { id: 204, name: 'Light Fighter' },
  { id: 205, name: 'Heavy Fighter' },
  { id: 206, name: 'Cruiser' },
  { id: 207, name: 'Battleship' },
  { id: 215, name: 'Battlecruiser' },
  { id: 211, name: 'Bomber' },
  { id: 213, name: 'Destroyer' },
  { id: 214, name: 'Deathstar' },
  { id: 218, name: 'Reaper' },
  { id: 219, name: 'Pathfinder' },
  { id: 202, name: 'Small Cargo' },
  { id: 203, name: 'Large Cargo' },
  { id: 208, name: 'Colony Ship' },
  { id: 209, name: 'Recycler' },
  { id: 210, name: 'Espionage Probe' },
];

const DEFENSES_LIST: Array<{ id: number; name: string }> = [
  { id: 401, name: 'Rocket Launcher' },
  { id: 402, name: 'Light Laser' },
  { id: 403, name: 'Heavy Laser' },
  { id: 404, name: 'Gauss Cannon' },
  { id: 405, name: 'Ion Cannon' },
  { id: 406, name: 'Plasma Turret' },
  { id: 407, name: 'Small Shield Dome' },
  { id: 408, name: 'Large Shield Dome' },
];

const RESEARCH_TECH_LIST: Array<{ id: number; name: string }> = [
  { id: 114, name: 'Hyperspace Technology' },
  { id: 113, name: 'Energy Technology' },
  { id: 120, name: 'Laser Technology' },
  { id: 121, name: 'Ion Technology' },
  { id: 122, name: 'Plasma Technology' },
  { id: 115, name: 'Combustion Drive' },
  { id: 117, name: 'Impulse Drive' },
  { id: 118, name: 'Hyperspace Drive' },
  { id: 106, name: 'Espionage Technology' },
  { id: 108, name: 'Computer Technology' },
  { id: 124, name: 'Astrophysics' },
  { id: 123, name: 'Intergalactic Research Network' },
  { id: 199, name: 'Graviton Technology' },
  { id: 109, name: 'Weapons Technology' },
  { id: 110, name: 'Shielding Technology' },
  { id: 111, name: 'Armour Technology' },
  { id: 1001, name: 'Lifeform Development' },
];

interface PlanetTechAccumulator {
  coords: string;
  total: number;
  techs: LifeformTechBreakdownItem[];
}

/**
 * Dynamically calculates the player's comprehensive lifeform overview
 * from their synced empire data in Overwatch.
 */
export function calculateDynamicLifeformOverview(memberDetail: MemberEmpireDetail): LifeformBonusOverviewData {
  const planets = (memberDetail.empire?.planets || []).filter(p => p.type === 'planet');
  const expList = memberDetail.empire?.lifeformExperience || [];

  // 1. Experience Levels
  const speciesMeta = [
    { lifeformId: 1, name: 'Humans' },
    { lifeformId: 2, name: "Rock'tal" },
    { lifeformId: 3, name: 'Mechas' },
    { lifeformId: 4, name: 'Kaelesh' },
  ];
  const experienceLevels: LifeformExperienceItem[] = speciesMeta.map(s => {
    const live = expList.find(e => e.lifeformId === s.lifeformId);
    const lvl = typeof live?.level === 'number' ? live.level : 100;
    const bonus = Number((lvl * 0.1).toFixed(2));
    return { lifeformId: s.lifeformId, name: s.name, level: lvl, bonus };
  });

  // Intermediate accumulators
  const resAcc: Record<string, { total: number; planets: Record<string, PlanetTechAccumulator> }> = {
    metal: { total: 0, planets: {} },
    crystal: { total: 0, planets: {} },
    deuterium: { total: 0, planets: {} },
    storage: { total: 0, planets: {} },
  };

  const expAcc: Record<string, { total: number; planets: Record<string, PlanetTechAccumulator> }> = {
    DMBooster: { total: 0, planets: {} },
    ResultBooster: { total: 0, planets: {} },
    ShipResultBooster: { total: 0, planets: {} },
  };

  const miscAcc: { total: number; planets: Record<string, PlanetTechAccumulator> } = {
    total: 0,
    planets: {},
  };

  const classAcc: Record<string, { total: number; planets: Record<string, PlanetTechAccumulator> }> = {
    Collector: { total: 0, planets: {} },
    General: { total: 0, planets: {} },
    Discoverer: { total: 0, planets: {} },
  };

  const shipAcc: Record<string, {
    weapons: number;
    shield: number;
    armour: number;
    speed: number;
    cargo: number;
    fuel: number;
    planets: Record<string, PlanetTechAccumulator>;
  }> = {};
  SHIPS_LIST.forEach(s => {
    shipAcc[s.name] = { weapons: 0, shield: 0, armour: 0, speed: 0, cargo: 0, fuel: 0, planets: {} };
  });

  const defenseAcc: Record<string, {
    weapons: number;
    shield: number;
    armour: number;
    planets: Record<string, PlanetTechAccumulator>;
  }> = {};
  DEFENSES_LIST.forEach(d => {
    defenseAcc[d.name] = { weapons: 0, shield: 0, armour: 0, planets: {} };
  });

  const techAcc: Record<string, {
    cost: number;
    time: number;
    planets: Record<string, PlanetTechAccumulator>;
  }> = {};
  RESEARCH_TECH_LIST.forEach(t => {
    techAcc[t.name] = { cost: 0, time: 0, planets: {} };
  });

  // Iterate each planet and compute bonuses
  planets.forEach(p => {
    const pName = p.name;
    const pCoords = p.coords;
    const lfId = p.lifeformId;

    // Building multiplier bonuses
    let buildingBonus = 0;
    if (p.lifeformBuildings) {
      const activePrefix = lfId ? `1${lfId}` : null;
      p.lifeformBuildings.forEach((b: any) => {
        if (activePrefix && !b.id.toString().startsWith(activePrefix)) return;
        if (b.id === 11111) buildingBonus += b.level * 0.005;
        else if (b.id === 13107) buildingBonus += b.level * 0.003;
        else if (b.id === 13111) buildingBonus += b.level * 0.004;
      });
    }

    const expData = expList.find(e => e.lifeformId === lfId);
    const expLvl = expData?.level ?? 100;
    const totalMultiplier = 1 + expLvl * 0.001 + buildingBonus;

    const setup = p.lifeformSetup || [];
    setup.forEach(slot => {
      if (!slot || !slot.selectedTechId || !slot.level) return;
      const tech = getLfTech(slot.selectedTechId);
      if (!tech || !tech.target) return;

      const b1 = tech.bonus1BaseValue ?? 0;
      const b2 = tech.bonus2BaseValue;
      const b3 = tech.bonus3BaseValue;

      const targets = tech.target;
      const uniqueBonusIds: number[] = [];
      targets.forEach((t: any) => {
        if (!uniqueBonusIds.includes(t.bonusBreakdownId)) {
          uniqueBonusIds.push(t.bonusBreakdownId);
        }
      });

      uniqueBonusIds.forEach((bId, idx) => {
        let baseVal = b1;
        if (idx === 1 && b2 !== null && b2 !== undefined) baseVal = b2;
        else if (idx === 2 && b3 !== null && b3 !== undefined) baseVal = b3;
        if (!baseVal) return;

        const val = baseVal * slot.level * totalMultiplier;
        const matchingTargets = targets.filter((tgt: any) => tgt.bonusBreakdownId === bId);

        const techEntry: LifeformTechBreakdownItem = {
          slot: slot.slotNumber,
          level: slot.level,
          techId: tech.gkId || tech.id,
          name: tech.name,
          value: `${val.toFixed(2)}%`,
        };

        const pushColonyContribution = (acc: Record<string, PlanetTechAccumulator>) => {
          if (!acc[pName]) {
            acc[pName] = { coords: pCoords, total: 0, techs: [] };
          }
          acc[pName].total += val;
          acc[pName].techs.push(techEntry);
        };

        // 1. Resources
        if (bId === 1) {
          resAcc.metal.total += val;
          pushColonyContribution(resAcc.metal.planets);
        } else if (bId === 2) {
          resAcc.crystal.total += val;
          pushColonyContribution(resAcc.crystal.planets);
        } else if (bId === 3) {
          resAcc.deuterium.total += val;
          pushColonyContribution(resAcc.deuterium.planets);
        } else if (bId === 15) {
          resAcc.storage.total += val;
          pushColonyContribution(resAcc.storage.planets);
        }

        // 2. Expedition
        else if (bId === 29) {
          expAcc.DMBooster.total += val;
          pushColonyContribution(expAcc.DMBooster.planets);
        } else if (bId === 19) {
          expAcc.ResultBooster.total += val;
          pushColonyContribution(expAcc.ResultBooster.planets);
        } else if (bId === 12) {
          expAcc.ShipResultBooster.total += val;
          pushColonyContribution(expAcc.ShipResultBooster.planets);
        }

        // 3. Misc
        else if (bId === 4) {
          miscAcc.total += val;
          pushColonyContribution(miscAcc.planets);
        }

        // 4. Character Classes
        else if (bId === 30) {
          classAcc.Collector.total += val;
          pushColonyContribution(classAcc.Collector.planets);
        } else if (bId === 31) {
          classAcc.General.total += val;
          pushColonyContribution(classAcc.General.planets);
        } else if (bId === 32) {
          classAcc.Discoverer.total += val;
          pushColonyContribution(classAcc.Discoverer.planets);
        }

        // 5. Ships / Defenses / Researches
        matchingTargets.forEach((mt: any) => {
          const gk = mt.gameKnowledgeId;
          if (!gk) {
            // Global research speed or cost
            if (bId === 9) {
              RESEARCH_TECH_LIST.forEach(rt => {
                techAcc[rt.name].time += val;
                pushColonyContribution(techAcc[rt.name].planets);
              });
            } else if (bId === 13) {
              RESEARCH_TECH_LIST.forEach(rt => {
                techAcc[rt.name].cost += val;
                pushColonyContribution(techAcc[rt.name].planets);
              });
            }
            return;
          }

          // Specific Ship
          const matchedShip = SHIPS_LIST.find(s => s.id === gk);
          if (matchedShip) {
            const sEntry = shipAcc[matchedShip.name];
            if (bId === 18) sEntry.weapons += val;
            else if (bId === 17) sEntry.shield += val;
            else if (bId === 16) sEntry.armour += val;
            else if (bId === 7) sEntry.speed += val;
            else if (bId === 10) sEntry.cargo += val;
            else if (bId === 6) sEntry.fuel += val;
            pushColonyContribution(sEntry.planets);
          }

          // Specific Defense
          const matchedDef = DEFENSES_LIST.find(d => d.id === gk);
          if (matchedDef) {
            const dEntry = defenseAcc[matchedDef.name];
            if (bId === 18) dEntry.weapons += val;
            else if (bId === 17) dEntry.shield += val;
            else if (bId === 16) dEntry.armour += val;
            pushColonyContribution(dEntry.planets);
          }

          // Specific Research Tech
          const matchedTech = RESEARCH_TECH_LIST.find(t => t.id === gk);
          if (matchedTech) {
            const tEntry = techAcc[matchedTech.name];
            if (bId === 13) tEntry.cost += val;
            else if (bId === 9) tEntry.time += val;
            pushColonyContribution(tEntry.planets);
          }
        });
      });
    });
  });

  // Helper to convert planet map into PlanetBonusBreakdown[]
  const formatBreakdown = (plMap: Record<string, PlanetTechAccumulator>): PlanetBonusBreakdown[] => {
    return Object.entries(plMap).map(([pName, acc]) => ({
      planetName: pName,
      coords: acc.coords,
      totalBonus: `${acc.total.toFixed(2)}%`,
      techs: acc.techs,
    }));
  };

  // Canonical base reference for fallback perks / formatting
  const baseData = lfBonusesParsedData as unknown as LifeformBonusOverviewData;

  // Build Final Output
  const resources: ResourceBonusItem[] = [
    {
      key: 'metal',
      name: 'Metal',
      total: `${resAcc.metal.total.toFixed(2)}%`,
      breakdown: formatBreakdown(resAcc.metal.planets),
    },
    {
      key: 'crystal',
      name: 'Crystal',
      total: `${resAcc.crystal.total.toFixed(2)}%`,
      breakdown: formatBreakdown(resAcc.crystal.planets),
    },
    {
      key: 'deuterium',
      name: 'Deuterium',
      total: `${resAcc.deuterium.total.toFixed(2)}%`,
      breakdown: formatBreakdown(resAcc.deuterium.planets),
    },
    {
      key: 'storage',
      name: 'Storage capacity',
      total: `${resAcc.storage.total.toFixed(2)}%`,
      breakdown: formatBreakdown(resAcc.storage.planets),
    },
  ];

  const expedition: ExpeditionBonusItem[] = [
    {
      key: 'DMBooster',
      name: 'Dark Matter Discovery Bonus',
      total: `${expAcc.DMBooster.total.toFixed(2)}%`,
      breakdown: formatBreakdown(expAcc.DMBooster.planets),
    },
    {
      key: 'ResultBooster',
      name: 'Resource Discovery Bonus',
      total: `${expAcc.ResultBooster.total.toFixed(2)}%`,
      breakdown: formatBreakdown(expAcc.ResultBooster.planets),
    },
    {
      key: 'ShipResultBooster',
      name: 'Ship Wreck Amount Bonus',
      total: `${expAcc.ShipResultBooster.total.toFixed(2)}%`,
      breakdown: formatBreakdown(expAcc.ShipResultBooster.planets),
    },
  ];

  const ships: ShipBonusItem[] = SHIPS_LIST.map(s => {
    const acc = shipAcc[s.name];
    const fmt = (v: number) => (v > 0 ? `${v.toFixed(2)}%` : '-');
    return {
      name: s.name,
      weapons: fmt(acc.weapons),
      shield: fmt(acc.shield),
      armour: fmt(acc.armour),
      speed: fmt(acc.speed),
      cargo: fmt(acc.cargo),
      fuel: acc.fuel > 0 ? `${acc.fuel.toFixed(2)}%` : '- (Max. 0%)',
      breakdown: formatBreakdown(acc.planets),
    };
  });

  const defenses: DefenseBonusItem[] = DEFENSES_LIST.map(d => {
    const acc = defenseAcc[d.name];
    const fmt = (v: number) => (v > 0 ? `${v.toFixed(2)}%` : '-');
    return {
      name: d.name,
      weapons: fmt(acc.weapons),
      shield: fmt(acc.shield),
      armour: fmt(acc.armour),
      breakdown: formatBreakdown(acc.planets),
    };
  });

  const costAndTime: CostAndTimeBonusItem[] = RESEARCH_TECH_LIST.map(t => {
    const acc = techAcc[t.name];
    const cappedCost = Math.min(50, acc.cost);
    const cappedTime = Math.min(99, acc.time);
    return {
      name: t.name,
      costReduction: cappedCost > 0 ? `${cappedCost.toFixed(2)}% (Max. 50%)` : '-',
      timeReduction: cappedTime > 0 ? `${cappedTime.toFixed(2)}% (Max. 99%)` : '-',
      breakdown: formatBreakdown(acc.planets),
    };
  });

  // Calculate amplified character class perks based on live class bonus
  const discTotal = classAcc.Discoverer.total;
  const discovererPerks: CharacterClassPerk[] = [
    { name: 'Research Bonus', baseBonus: '25%', incBonus: `${(25 * (1 + discTotal / 100)).toFixed(2)}%` },
    { name: 'Expedition Bonus', baseBonus: '1,200%', incBonus: `${(1200 * (1 + discTotal / 100)).toLocaleString()}%` },
    { name: 'Planet Size', baseBonus: '10%', incBonus: `${(10 * (1 + discTotal / 100)).toFixed(2)}%` },
    { name: 'More Expeditions', baseBonus: '2', incBonus: `${Math.round(2 * (1 + discTotal / 100))}` },
    { name: 'Fewer Expedition Enemies', baseBonus: '50%', incBonus: `${(50 * (1 + discTotal / 100)).toFixed(2)}%` },
    { name: 'Increased Phalanx Range', baseBonus: '20%', incBonus: `${(20 * (1 + discTotal / 100)).toFixed(2)}%` },
    { name: 'Increased Inactive Plunder', baseBonus: '75%', incBonus: '75%' },
  ];

  const characterClasses: CharacterClassBonusItem[] = [
    {
      name: 'Collector',
      total: `${classAcc.Collector.total.toFixed(2)}%`,
      perks: baseData.characterClasses[0]?.perks || [],
      breakdown: formatBreakdown(classAcc.Collector.planets),
    },
    {
      name: 'General',
      total: `${classAcc.General.total.toFixed(2)}%`,
      perks: baseData.characterClasses[1]?.perks || [],
      breakdown: formatBreakdown(classAcc.General.planets),
    },
    {
      name: 'Discoverer',
      total: `${discTotal.toFixed(2)}%`,
      perks: discovererPerks,
      breakdown: formatBreakdown(classAcc.Discoverer.planets),
    },
  ];

  const misc: MiscBonusItem[] = [
    {
      name: 'Exploration Flight Fleet Speed Bonus',
      total: `${miscAcc.total.toFixed(2)}%`,
      breakdown: formatBreakdown(miscAcc.planets),
    },
  ];

  return {
    experienceLevels,
    resources,
    expedition,
    ships,
    defenses,
    costAndTime,
    characterClasses,
    misc,
  };
}

/**
 * Returns the comprehensive lifeform bonus overview dataset.
 * Prioritizes dynamic computation from the player's synced empire.
 * If empire data is not yet synced, falls back to the canonical dataset.
 */
export function getLifeformBonusOverview(memberDetail?: MemberEmpireDetail | null): LifeformBonusOverviewData {
  if (memberDetail && Array.isArray(memberDetail.empire?.planets)) {
    const planetsWithLf = memberDetail.empire.planets.filter(
      p => p.type === 'planet' && Array.isArray(p.lifeformSetup) && p.lifeformSetup.length > 0
    );
    if (planetsWithLf.length > 0) {
      return calculateDynamicLifeformOverview(memberDetail);
    }
  }

  // Fallback to canonical reference
  return lfBonusesParsedData as unknown as LifeformBonusOverviewData;
}

export function getSpeciesIcon(speciesIdOrName: number | string): string {
  if (speciesIdOrName === 1 || speciesIdOrName === 'Humans') return '/icons/lifeforms/humans-icon-large.jpg';
  if (speciesIdOrName === 2 || speciesIdOrName === "Rock'tal") return '/icons/lifeforms/rocktal-icon-large.jpg';
  if (speciesIdOrName === 3 || speciesIdOrName === 'Mechas') return '/icons/lifeforms/mechas-icon-large.jpg';
  if (speciesIdOrName === 4 || speciesIdOrName === 'Kaelesh') return '/icons/lifeforms/kaelesh-icon-large.jpg';
  return '/icons/lifeforms/humans-icon-large.jpg';
}

export function getLifeformTechIcon(techId: number): string {
  const species = Math.floor(techId / 1000) % 10;
  const slot = techId % 100;
  const prefix = species === 1 ? 'humans' : species === 2 ? 'rocktal' : species === 3 ? 'mechas' : 'kaelesh';
  return `/icons/lifeforms/${prefix}-tech-t${slot}-large.jpg`;
}

export function getShipIcon(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `/icons/ships/${slug}-large.jpg`;
}

export function getDefenseIcon(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `/icons/ships/${slug}-large.jpg`;
}

export function getResearchIcon(name: string): string {
  const mapping: Record<string, string> = {
    'Hyperspace Technology': '/icons/research/hyperspace-tech-research-large.jpg',
    'Energy Technology': '/icons/research/energy-research-large.jpg',
    'Laser Technology': '/icons/research/laser-tech-research-large.jpg',
    'Ion Technology': '/icons/research/ion-tech-research-large.jpg',
    'Plasma Technology': '/icons/research/plasma-tech-research-large.jpg',
    'Combustion Drive': '/icons/research/combustion-drive-research-large.jpg',
    'Impulse Drive': '/icons/research/impulse-drive-research-large.jpg',
    'Hyperspace Drive': '/icons/research/hyperspace-drive-research-large.jpg',
    'Espionage Technology': '/icons/research/espionage-tech-research-large.jpg',
    'Computer Technology': '/icons/research/computer-tech-research-large.jpg',
    'Astrophysics': '/icons/research/expedition-tech-research-large.jpg',
    'Intergalactic Research Network': '/icons/research/integalagtic-research-tech-research-large.jpg',
    'Graviton Technology': '/icons/research/graviton-tech-research-large.jpg',
    'Weapons Technology': '/icons/research/weapons-tech-research-large.jpg',
    'Shielding Technology': '/icons/research/shield-tech-research-large.jpg',
    'Armour Technology': '/icons/research/armor-tech-research-large.jpg',
    'Lifeform Development': '/icons/lifeforms/lifeform-dna-icon-medium.png',
  };
  return mapping[name] || '/icons/research/energy-research-large.jpg';
}

export function getResourceIcon(nameOrKey: string): string {
  const lower = nameOrKey.toLowerCase();
  if (lower.includes('metal')) return '/icons/resources/metal-icon-medium.jpg';
  if (lower.includes('crystal')) return '/icons/resources/crystal-icon-medium.jpg';
  if (lower.includes('deuterium')) return '/icons/resources/deuterium-icon-medium.jpg';
  if (lower.includes('storage')) return '/icons/resources/metal_storage_large.jpg';
  return '/icons/resources/metal-icon-medium.jpg';
}

export function getExpeditionIcon(nameOrKey: string): string {
  const lower = nameOrKey.toLowerCase();
  if (lower.includes('dark matter') || lower.includes('dm')) return '/icons/resources/dark-matter-icon-medium.jpg';
  if (lower.includes('resource')) return '/icons/lifeforms/artifact-icon-large.png';
  if (lower.includes('wreck') || lower.includes('ship')) return '/icons/ships/recycler-large.jpg';
  return '/icons/research/expedition-tech-research-large.jpg';
}
