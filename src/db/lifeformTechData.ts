export const LIFEFORM_TECH_DATA = [
        {
                "id": 1,
                "lifeformId": 1,
                "gkId": 11201,
                "name": "Intergalactic Envoys",
                "description": "Intergalactic Envoys are capable of detecting extra-terrestrial civilisations. They also reduced the duration of exploration flights to detect other lifeforms in the Galaxy view with each level. However, exploration is not without danger, and ships are occasionally lost in the endeavour.",
                "shortDesc": "Lifeform Scanning / Speed",
                "metalBaseCost": 5000,
                "crystalBaseCost": 2500,
                "deutBaseCost": 500,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.3,
                "crystalIncreaseFactor": 1.3,
                "deutIncreaseFactor": 1.3,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.2,
                "durationBase": 1000,
                "target": [
                        {
                                "bonusBreakdownId": 4
                        }
                ]
        },
        {
                "id": 2,
                "lifeformId": 2,
                "gkId": 12201,
                "name": "Volcanic Batteries",
                "description": "Volcanic Batteries increase the production of energy on all planets with each level.",
                "shortDesc": "Energy Prod",
                "metalBaseCost": 10000,
                "crystalBaseCost": 6000,
                "deutBaseCost": 1000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.25,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 1000,
                "target": [
                        {
                                "bonusBreakdownId": 5
                        }
                ]
        },
        {
                "id": 3,
                "lifeformId": 3,
                "gkId": 13201,
                "name": "Catalyser Technology",
                "description": "Researching Catalyser Technology increases the production of deuterium on all planets with each level.",
                "shortDesc": "Deut Prod",
                "metalBaseCost": 10000,
                "crystalBaseCost": 6000,
                "deutBaseCost": 1000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.08,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 1000,
                "target": [
                        {
                                "bonusBreakdownId": 3
                        }
                ]
        },
        {
                "id": 4,
                "lifeformId": 4,
                "gkId": 14201,
                "name": "Heat Recovery",
                "description": "Researching Heat Recovery decreases the fuel consumption of all ships with each level.",
                "shortDesc": "Fuel Cost Reduction (30% Cap)",
                "metalBaseCost": 10000,
                "crystalBaseCost": 6000,
                "deutBaseCost": 1000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.03,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "30%",
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 1000,
                "target": [
                        {
                                "bonusBreakdownId": 6
                        }
                ]
        },
        {
                "id": 5,
                "lifeformId": 1,
                "gkId": 11202,
                "name": "High-Performance Extractors",
                "description": "High-Performance Extractors increase the production of metal, crystals and deuterium on all planets with each level.",
                "shortDesc": "All Prod",
                "metalBaseCost": 7000,
                "crystalBaseCost": 10000,
                "deutBaseCost": 5000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.06,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 2000,
                "target": [
                        {
                                "bonusBreakdownId": 1
                        },
                        {
                                "bonusBreakdownId": 2
                        },
                        {
                                "bonusBreakdownId": 3
                        }
                ]
        },
        {
                "id": 6,
                "lifeformId": 2,
                "gkId": 12202,
                "name": "Acoustic Scanning",
                "description": "Researching Acoustic Scanning increases the crystal production on all planets with each level.",
                "shortDesc": "Crystal Prod",
                "metalBaseCost": 7500,
                "crystalBaseCost": 12500,
                "deutBaseCost": 5000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.08,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 2000,
                "target": [
                        {
                                "bonusBreakdownId": 2
                        }
                ]
        },
        {
                "id": 7,
                "lifeformId": 3,
                "gkId": 13202,
                "name": "Plasma Drive",
                "description": "Researching the Plasma Drive increases the speed of all ships (excluding Deathstars) with each level.",
                "shortDesc": "All Ship Speed",
                "metalBaseCost": 7500,
                "crystalBaseCost": 12500,
                "deutBaseCost": 5000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.3,
                "crystalIncreaseFactor": 1.3,
                "deutIncreaseFactor": 1.3,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.2,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 2000,
                "target": [
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 202
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 203
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 204
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 205
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 206
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 207
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 208
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 209
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 210
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 211
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 213
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 214
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 215
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 218
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 219
                        }
                ]
        },
        {
                "id": 8,
                "lifeformId": 4,
                "gkId": 14202,
                "name": "Sulphide Process",
                "description": "Researching the Sulphide Process increases the production of deuterium on all planets with each level.",
                "shortDesc": "Deut Prod",
                "metalBaseCost": 7500,
                "crystalBaseCost": 12500,
                "deutBaseCost": 5000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.08,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 2000,
                "target": [
                        {
                                "bonusBreakdownId": 3
                        }
                ]
        },
        {
                "id": 9,
                "lifeformId": 1,
                "gkId": 11203,
                "name": "Fusion Drives",
                "description": "This advancement in drive technology makes civilian ships faster.  Each level increases the speed.",
                "shortDesc": "Civ Ship Speed",
                "metalBaseCost": 15000,
                "crystalBaseCost": 10000,
                "deutBaseCost": 5000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.3,
                "crystalIncreaseFactor": 1.3,
                "deutIncreaseFactor": 1.3,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.5,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 2500,
                "target": [
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 202
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 203
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 208
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 209
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 210
                        }
                ]
        },
        {
                "id": 10,
                "lifeformId": 2,
                "gkId": 12203,
                "name": "High Energy Pump Systems",
                "description": "High Energy Pump Systems increase the production of deuterium on all planets with each level.",
                "shortDesc": "Deut Prod",
                "metalBaseCost": 15000,
                "crystalBaseCost": 10000,
                "deutBaseCost": 5000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.08,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 2500,
                "target": [
                        {
                                "bonusBreakdownId": 3
                        }
                ]
        },
        {
                "id": 11,
                "lifeformId": 3,
                "gkId": 13203,
                "name": "Efficiency Module",
                "description": "The Efficiency Module decreases the fuel consumption of all ships with each level.",
                "shortDesc": "Fuel Cost Reduction (30% Cap)",
                "metalBaseCost": 15000,
                "crystalBaseCost": 10000,
                "deutBaseCost": 5000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.03,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "30%",
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 2500,
                "target": [
                        {
                                "bonusBreakdownId": 6
                        }
                ]
        },
        {
                "id": 12,
                "lifeformId": 4,
                "gkId": 14203,
                "name": "Psionic Network",
                "description": "Strengthening the Psionic Network reduces the chance of losing ships on expeditions with every level.",
                "shortDesc": "Expo Ship Loss Reduction",
                "metalBaseCost": 15000,
                "crystalBaseCost": 10000,
                "deutBaseCost": 5000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.05,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "50%",
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 2500,
                "target": [
                        {
                                "bonusBreakdownId": 8
                        }
                ]
        },
        {
                "id": 13,
                "lifeformId": 1,
                "gkId": 11204,
                "name": "Stealth Field Generator",
                "description": "Stealth Field Generators reduce the costs and duration of researching spy tech.",
                "shortDesc": "Esp Tech Cost Reduction",
                "metalBaseCost": 20000,
                "crystalBaseCost": 15000,
                "deutBaseCost": 7500,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.3,
                "crystalIncreaseFactor": 1.3,
                "deutIncreaseFactor": 1.3,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "50%",
                "bonus2BaseValue": 0.2,
                "bonus2IncreaseFactor": 1,
                "bonus2Max": "99%",
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 3500,
                "target": [
                        {
                                "bonusBreakdownId": 13,
                                "gameKnowledgeId": 106
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 106
                        }
                ]
        },
        {
                "id": 14,
                "lifeformId": 2,
                "gkId": 12204,
                "name": "Cargo Hold Expansion (Civilian Ships)",
                "description": "The Cargo Hold Expansion increases the cargo capacity of civilian ships on all planets with each level.",
                "shortDesc": "Civ Ship Capacity",
                "metalBaseCost": 20000,
                "crystalBaseCost": 15000,
                "deutBaseCost": 7500,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.3,
                "crystalIncreaseFactor": 1.3,
                "deutIncreaseFactor": 1.3,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.4,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 3500,
                "target": [
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 202
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 203
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 208
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 209
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 210
                        }
                ]
        },
        {
                "id": 15,
                "lifeformId": 3,
                "gkId": 13204,
                "name": "Depot AI",
                "description": "The Depot AI reduces the costs and construction time for the Alliance Depot with each level.",
                "shortDesc": "Alliance Depot Cost Reduction",
                "metalBaseCost": 20000,
                "crystalBaseCost": 15000,
                "deutBaseCost": 7500,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.3,
                "crystalIncreaseFactor": 1.3,
                "deutIncreaseFactor": 1.3,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "50%",
                "bonus2BaseValue": 0.2,
                "bonus2IncreaseFactor": 1,
                "bonus2Max": "99%",
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 3500,
                "target": [
                        {
                                "bonusBreakdownId": 11
                        },
                        {
                                "bonusBreakdownId": 14
                        }
                ]
        },
        {
                "id": 16,
                "lifeformId": 4,
                "gkId": 14204,
                "name": "Telekinetic Tractor Beam",
                "description": "Increases the number of ships which are found on expeditions.",
                "shortDesc": "Expo Find more Ships",
                "metalBaseCost": 20000,
                "crystalBaseCost": 15000,
                "deutBaseCost": 7500,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.2,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 3500,
                "target": [
                        {
                                "bonusBreakdownId": 12
                        }
                ]
        },
        {
                "id": 17,
                "lifeformId": 1,
                "gkId": 11205,
                "name": "Orbital Den",
                "description": "A portion of the resource supplies will be stored here safe from plundering. The den increases the storage capacity.",
                "shortDesc": "Res Protection",
                "metalBaseCost": 25000,
                "crystalBaseCost": 20000,
                "deutBaseCost": 10000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.4,
                "crystalIncreaseFactor": 1.4,
                "deutIncreaseFactor": 1.4,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 4,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.2,
                "durationBase": 4500,
                "target": [
                        {
                                "bonusBreakdownId": 15
                        }
                ]
        },
        {
                "id": 18,
                "lifeformId": 2,
                "gkId": 12205,
                "name": "Magma-Powered Production",
                "description": "Magma-Powered Production increases the production of metal, crystals and deuterium on all planets with each level.",
                "shortDesc": "All Prod",
                "metalBaseCost": 25000,
                "crystalBaseCost": 20000,
                "deutBaseCost": 10000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.08,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 4500,
                "target": [
                        {
                                "bonusBreakdownId": 1
                        },
                        {
                                "bonusBreakdownId": 2
                        },
                        {
                                "bonusBreakdownId": 3
                        }
                ]
        },
        {
                "id": 19,
                "lifeformId": 3,
                "gkId": 13205,
                "name": "General Overhaul (Light Fighter)",
                "description": "The general overhaul of the Light Fighter increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Light Fighters with each level.",
                "shortDesc": "LF Boost",
                "metalBaseCost": 160000,
                "crystalBaseCost": 120000,
                "deutBaseCost": 50000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.3,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 4500,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 204
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 204
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 204
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 204
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 204
                        }
                ]
        },
        {
                "id": 20,
                "lifeformId": 4,
                "gkId": 14205,
                "name": "Enhanced Sensor Technology",
                "description": "Researching Enhanced Sensor Technology increases the amount of resources that can be earned on expeditions with each level.",
                "shortDesc": "Expo Res Boost",
                "metalBaseCost": 25000,
                "crystalBaseCost": 20000,
                "deutBaseCost": 10000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.2,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 4500,
                "target": [
                        {
                                "bonusBreakdownId": 19
                        }
                ]
        },
        {
                "id": 21,
                "lifeformId": 1,
                "gkId": 11206,
                "name": "Research AI",
                "description": "The Research AI allows research projects to be completed much faster. Each level increases the speed of research.",
                "shortDesc": "Research Speed Boost",
                "metalBaseCost": 35000,
                "crystalBaseCost": 25000,
                "deutBaseCost": 15000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "99%",
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 5000,
                "target": [
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 106
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 108
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 109
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 110
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 111
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 113
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 114
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 115
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 117
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 118
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 120
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 121
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 122
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 123
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 124
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 199
                        }
                ]
        },
        {
                "id": 22,
                "lifeformId": 2,
                "gkId": 12206,
                "name": "Geothermal Power Plants",
                "description": "Geothermal Power Plants increase the production of energy on all planets with each level.",
                "shortDesc": "Energy Prod",
                "metalBaseCost": 50000,
                "crystalBaseCost": 50000,
                "deutBaseCost": 20000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.25,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 5000,
                "target": [
                        {
                                "bonusBreakdownId": 5
                        }
                ]
        },
        {
                "id": 23,
                "lifeformId": 3,
                "gkId": 13206,
                "name": "Automated Transport Lines",
                "description": "Researching Automated Transport Lines increases the production of metal, crystals and deuterium on all planets with each level.",
                "shortDesc": "All Prod",
                "metalBaseCost": 50000,
                "crystalBaseCost": 50000,
                "deutBaseCost": 20000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.06,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 5000,
                "target": [
                        {
                                "bonusBreakdownId": 1
                        },
                        {
                                "bonusBreakdownId": 2
                        },
                        {
                                "bonusBreakdownId": 3
                        }
                ]
        },
        {
                "id": 24,
                "lifeformId": 4,
                "gkId": 14206,
                "name": "Neuromodal Compressor",
                "description": "Researching the Neuromodal Compressor increases the cargo capacity of civilian ships on all planets with each level.",
                "shortDesc": "Civ Ship Capacity",
                "metalBaseCost": 50000,
                "crystalBaseCost": 50000,
                "deutBaseCost": 20000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.3,
                "crystalIncreaseFactor": 1.3,
                "deutIncreaseFactor": 1.3,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.4,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 5000,
                "target": [
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 202
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 203
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 208
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 209
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 210
                        }
                ]
        },
        {
                "id": 25,
                "lifeformId": 1,
                "gkId": 11207,
                "name": "High-Performance Terraformer",
                "description": "The High-Performance Terraformer reduces the costs, energy required and duration of building the terraformer with each level.",
                "shortDesc": "Terraformer Cost Reduction",
                "metalBaseCost": 70000,
                "crystalBaseCost": 40000,
                "deutBaseCost": 20000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.3,
                "crystalIncreaseFactor": 1.3,
                "deutIncreaseFactor": 1.3,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "50%",
                "bonus2BaseValue": 0.2,
                "bonus2IncreaseFactor": 1,
                "bonus2Max": "99%",
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 8000,
                "target": [
                        {
                                "bonusBreakdownId": 20
                        },
                        {
                                "bonusBreakdownId": 21
                        }
                ]
        },
        {
                "id": 26,
                "lifeformId": 2,
                "gkId": 12207,
                "name": "Depth Sounding",
                "description": "Researching Depth Sounding increases the metal production on all planets with each level.",
                "shortDesc": "Metal Prod",
                "metalBaseCost": 70000,
                "crystalBaseCost": 40000,
                "deutBaseCost": 20000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.08,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 5500,
                "target": [
                        {
                                "bonusBreakdownId": 1
                        }
                ]
        },
        {
                "id": 27,
                "lifeformId": 3,
                "gkId": 13207,
                "name": "Improved Drone AI",
                "description": "Improved Drone AI reduces the costs and research time of spy technology with each level.",
                "shortDesc": "Esp Tech Cost Reduction",
                "metalBaseCost": 70000,
                "crystalBaseCost": 40000,
                "deutBaseCost": 20000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.3,
                "crystalIncreaseFactor": 1.3,
                "deutIncreaseFactor": 1.3,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "50%",
                "bonus2BaseValue": 0.2,
                "bonus2IncreaseFactor": 1,
                "bonus2Max": "99%",
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 5500,
                "target": [
                        {
                                "bonusBreakdownId": 13,
                                "gameKnowledgeId": 106
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 106
                        }
                ]
        },
        {
                "id": 28,
                "lifeformId": 4,
                "gkId": 14207,
                "name": "Neuro-Interface",
                "description": "With the Neuro-Interface, research projects can be completed much faster. Each level increases the speed of research.",
                "shortDesc": "Research Speed Boost",
                "metalBaseCost": 70000,
                "crystalBaseCost": 40000,
                "deutBaseCost": 20000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "99%",
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 5500,
                "target": [
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 106
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 108
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 109
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 110
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 111
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 113
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 114
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 115
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 117
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 118
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 120
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 121
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 122
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 123
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 124
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 199
                        }
                ]
        },
        {
                "id": 29,
                "lifeformId": 1,
                "gkId": 11208,
                "name": "Enhanced Production Technologies",
                "description": "Enhanced Production Technologies increase the production of metal, crystals and deuterium on all planets with each level.",
                "shortDesc": "All Prod",
                "metalBaseCost": 80000,
                "crystalBaseCost": 50000,
                "deutBaseCost": 20000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.06,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 6000,
                "target": [
                        {
                                "bonusBreakdownId": 1
                        },
                        {
                                "bonusBreakdownId": 2
                        },
                        {
                                "bonusBreakdownId": 3
                        }
                ]
        },
        {
                "id": 30,
                "lifeformId": 2,
                "gkId": 12208,
                "name": "Ion Crystal Enhancement (Heavy Fighter)",
                "description": "Researching the Ion Crystal Enhancement increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Heavy Fighters with each level.",
                "shortDesc": "HF Boost",
                "metalBaseCost": 160000,
                "crystalBaseCost": 120000,
                "deutBaseCost": 50000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.3,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 6000,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 205
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 205
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 205
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 205
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 205
                        }
                ]
        },
        {
                "id": 31,
                "lifeformId": 3,
                "gkId": 13208,
                "name": "Experimental Recycling Technology",
                "description": "Researching the Experimental Recycling Technology increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Recyclers with each level.",
                "shortDesc": "Recycler Boost",
                "metalBaseCost": 160000,
                "crystalBaseCost": 120000,
                "deutBaseCost": 50000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 6000,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 209
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 209
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 209
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 209
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 209
                        }
                ]
        },
        {
                "id": 32,
                "lifeformId": 4,
                "gkId": 14208,
                "name": "Interplanetary Analysis Network",
                "description": "Enhancing the Interplanetary Analysis Network increases the range of all phalanx scans.",
                "shortDesc": "Phalanx Range Boost",
                "metalBaseCost": 80000,
                "crystalBaseCost": 50000,
                "deutBaseCost": 20000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.2,
                "crystalIncreaseFactor": 1.2,
                "deutIncreaseFactor": 1.2,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.6,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.2,
                "durationBase": 6000,
                "target": [
                        {
                                "bonusBreakdownId": 22
                        }
                ]
        },
        {
                "id": 33,
                "lifeformId": 1,
                "gkId": 11209,
                "name": "Light Fighter Mk II",
                "description": "Researching the Light Fighter Mk II increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Light Fighters with each level.",
                "shortDesc": "LF Boost",
                "metalBaseCost": 320000,
                "crystalBaseCost": 240000,
                "deutBaseCost": 100000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.3,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 6500,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 204
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 204
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 204
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 204
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 204
                        }
                ]
        },
        {
                "id": 34,
                "lifeformId": 2,
                "gkId": 12209,
                "name": "Improved Stellarator",
                "description": "Researching the Improved Stellarator reduces the costs and research time of plasma technology with each level.",
                "shortDesc": "Plasma Tech Cost Reduction",
                "metalBaseCost": 75000,
                "crystalBaseCost": 55000,
                "deutBaseCost": 25000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.15,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "50%",
                "bonus2BaseValue": 0.3,
                "bonus2IncreaseFactor": 1,
                "bonus2Max": "99%",
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 6500,
                "target": [
                        {
                                "bonusBreakdownId": 13,
                                "gameKnowledgeId": 122
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 122
                        }
                ]
        },
        {
                "id": 35,
                "lifeformId": 3,
                "gkId": 13209,
                "name": "General Overhaul (Cruiser)",
                "description": "The general overhaul of the Cruiser increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Cruisers with each level.",
                "shortDesc": "Cruiser Boost",
                "metalBaseCost": 160000,
                "crystalBaseCost": 120000,
                "deutBaseCost": 50000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.3,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 6500,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 206
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 206
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 206
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 206
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 206
                        }
                ]
        },
        {
                "id": 36,
                "lifeformId": 4,
                "gkId": 14209,
                "name": "Overclocking (Heavy Fighter)",
                "description": "Overclocking the Heavy Fighter systems increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Heavy Fighters with each level.",
                "shortDesc": "HF Boost",
                "metalBaseCost": 320000,
                "crystalBaseCost": 240000,
                "deutBaseCost": 100000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.3,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 6500,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 205
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 205
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 205
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 205
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 205
                        }
                ]
        },
        {
                "id": 37,
                "lifeformId": 1,
                "gkId": 11210,
                "name": "Cruiser Mk II",
                "description": "Researching the Cruiser Mk II increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Cruisers with each level.",
                "shortDesc": "Cruiser Boost",
                "metalBaseCost": 320000,
                "crystalBaseCost": 240000,
                "deutBaseCost": 100000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.3,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 7000,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 206
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 206
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 206
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 206
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 206
                        }
                ]
        },
        {
                "id": 38,
                "lifeformId": 2,
                "gkId": 12210,
                "name": "Hardened Diamond Drill Heads",
                "description": "Hardened Diamond Drill Heads increase the metal production on all planets with each level.",
                "shortDesc": "Metal Prod",
                "metalBaseCost": 85000,
                "crystalBaseCost": 40000,
                "deutBaseCost": 35000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.08,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 7000,
                "target": [
                        {
                                "bonusBreakdownId": 1
                        }
                ]
        },
        {
                "id": 39,
                "lifeformId": 3,
                "gkId": 13210,
                "name": "Slingshot Autopilot",
                "description": "Researching the Slingshot Autopilot makes it possible to reclaim fuel when recalling the fleet. Each level increases the amount of fuel reclaimed.",
                "shortDesc": "Fuel Refund for Recalls",
                "metalBaseCost": 85000,
                "crystalBaseCost": 40000,
                "deutBaseCost": 35000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.2,
                "crystalIncreaseFactor": 1.2,
                "deutIncreaseFactor": 1.2,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.15,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "90%",
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 7000,
                "target": [
                        {
                                "bonusBreakdownId": 23
                        }
                ]
        },
        {
                "id": 40,
                "lifeformId": 4,
                "gkId": 14210,
                "name": "Telekinetic Drive",
                "description": "Developing the Telekinetic Drive increases fleet speed on expeditions with every level.",
                "shortDesc": "Expo Fleet Speed Boost",
                "metalBaseCost": 85000,
                "crystalBaseCost": 40000,
                "deutBaseCost": 35000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.2,
                "crystalIncreaseFactor": 1.2,
                "deutIncreaseFactor": 1.2,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.2,
                "durationBase": 7000,
                "target": [
                        {
                                "bonusBreakdownId": 24
                        }
                ]
        },
        {
                "id": 41,
                "lifeformId": 1,
                "gkId": 11211,
                "name": "Improved Lab Technology",
                "description": "With Improved Lab Technology, research projects can be completed much faster. Each level increases the speed of research.",
                "shortDesc": "Research Speed Boost",
                "metalBaseCost": 120000,
                "crystalBaseCost": 30000,
                "deutBaseCost": 25000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "99%",
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 7500,
                "target": [
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 106
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 108
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 109
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 110
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 111
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 113
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 114
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 115
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 117
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 118
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 120
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 121
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 122
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 123
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 124
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 199
                        }
                ]
        },
        {
                "id": 42,
                "lifeformId": 2,
                "gkId": 12211,
                "name": "Seismic Mining Technology",
                "description": "Researching Seismic Mining Technology increases the crystal production on all planets with each level.",
                "shortDesc": "Crystal Prod",
                "metalBaseCost": 120000,
                "crystalBaseCost": 30000,
                "deutBaseCost": 25000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.08,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 7500,
                "target": [
                        {
                                "bonusBreakdownId": 2
                        }
                ]
        },
        {
                "id": 43,
                "lifeformId": 3,
                "gkId": 13211,
                "name": "High-Temperature Superconductors",
                "description": "Researching High-Temperature Superconductors reduces the costs and research time of energy technology with each level.",
                "shortDesc": "Energy Tech Cost Reduction",
                "metalBaseCost": 120000,
                "crystalBaseCost": 30000,
                "deutBaseCost": 25000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.3,
                "crystalIncreaseFactor": 1.3,
                "deutIncreaseFactor": 1.3,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "50%",
                "bonus2BaseValue": 0.2,
                "bonus2IncreaseFactor": 1,
                "bonus2Max": "99%",
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 7500,
                "target": [
                        {
                                "bonusBreakdownId": 13,
                                "gameKnowledgeId": 113
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 113
                        }
                ]
        },
        {
                "id": 44,
                "lifeformId": 4,
                "gkId": 14211,
                "name": "Sixth Sense",
                "description": "Sharpening the Sixth Sense increases the amount of resources that can be earned on expeditions with each level.",
                "shortDesc": "Expo Res Boost",
                "metalBaseCost": 120000,
                "crystalBaseCost": 30000,
                "deutBaseCost": 25000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.2,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 7500,
                "target": [
                        {
                                "bonusBreakdownId": 19
                        }
                ]
        },
        {
                "id": 45,
                "lifeformId": 1,
                "gkId": 11212,
                "name": "Plasma Terraformer",
                "description": "Researching the Plasma Terraformer reduces the costs, energy required and duration of building the terraformer with each level.",
                "shortDesc": "Terraformer Cost Reduction",
                "metalBaseCost": 100000,
                "crystalBaseCost": 40000,
                "deutBaseCost": 30000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.3,
                "crystalIncreaseFactor": 1.3,
                "deutIncreaseFactor": 1.3,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "50%",
                "bonus2BaseValue": 0.2,
                "bonus2IncreaseFactor": 1,
                "bonus2Max": "99%",
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 10000,
                "target": [
                        {
                                "bonusBreakdownId": 20
                        },
                        {
                                "bonusBreakdownId": 21
                        }
                ]
        },
        {
                "id": 46,
                "lifeformId": 2,
                "gkId": 12212,
                "name": "Magma-Powered Pump Systems",
                "description": "Magma-Powered Pump Systems increase the production of deuterium on all planets with each level.",
                "shortDesc": "Deut Prod",
                "metalBaseCost": 100000,
                "crystalBaseCost": 40000,
                "deutBaseCost": 30000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.08,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 8000,
                "target": [
                        {
                                "bonusBreakdownId": 3
                        }
                ]
        },
        {
                "id": 47,
                "lifeformId": 3,
                "gkId": 13212,
                "name": "General Overhaul (Battleship)",
                "description": "The general overhaul of the Battleship increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Battleships with each level.",
                "shortDesc": "Battleship Boost",
                "metalBaseCost": 160000,
                "crystalBaseCost": 120000,
                "deutBaseCost": 50000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.3,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 8000,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 207
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 207
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 207
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 207
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 207
                        }
                ]
        },
        {
                "id": 48,
                "lifeformId": 4,
                "gkId": 14212,
                "name": "Psychoharmoniser",
                "description": "Researching the Psychoharmoniser increases the production of metal, crystals and deuterium on all planets with each level.",
                "shortDesc": "All Prod",
                "metalBaseCost": 100000,
                "crystalBaseCost": 40000,
                "deutBaseCost": 30000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.06,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 8000,
                "target": [
                        {
                                "bonusBreakdownId": 1
                        },
                        {
                                "bonusBreakdownId": 2
                        },
                        {
                                "bonusBreakdownId": 3
                        }
                ]
        },
        {
                "id": 49,
                "lifeformId": 1,
                "gkId": 11213,
                "name": "Low-Temperature Drives",
                "description": "Low-Temperature Drives reduce the costs and duration of researching spy tech.",
                "shortDesc": "Esp Tech Cost Reduction",
                "metalBaseCost": 200000,
                "crystalBaseCost": 100000,
                "deutBaseCost": 100000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.3,
                "crystalIncreaseFactor": 1.3,
                "deutIncreaseFactor": 1.3,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "50%",
                "bonus2BaseValue": 0.2,
                "bonus2IncreaseFactor": 1,
                "bonus2Max": "99%",
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 8500,
                "target": [
                        {
                                "bonusBreakdownId": 13,
                                "gameKnowledgeId": 106
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 106
                        }
                ]
        },
        {
                "id": 50,
                "lifeformId": 2,
                "gkId": 12213,
                "name": "Ion Crystal Modules",
                "description": "With each level, Ion Crystal Modules reduce the Crawler’s energy consumption and increase its efficiency.",
                "shortDesc": "Crawler Boost",
                "metalBaseCost": 200000,
                "crystalBaseCost": 100000,
                "deutBaseCost": 100000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.2,
                "crystalIncreaseFactor": 1.2,
                "deutIncreaseFactor": 1.2,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "50%",
                "bonus2BaseValue": 0.1,
                "bonus2IncreaseFactor": 1,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 8500,
                "target": [
                        {
                                "bonusBreakdownId": 25
                        },
                        {
                                "bonusBreakdownId": 26
                        }
                ]
        },
        {
                "id": 51,
                "lifeformId": 3,
                "gkId": 13213,
                "name": "Artificial Swarm Intelligence",
                "description": "Researching Artificial Swarm Intelligence increases the production of metal, crystals and deuterium on all planets with each level.",
                "shortDesc": "All Prod",
                "metalBaseCost": 200000,
                "crystalBaseCost": 100000,
                "deutBaseCost": 100000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.06,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 8500,
                "target": [
                        {
                                "bonusBreakdownId": 1
                        },
                        {
                                "bonusBreakdownId": 2
                        },
                        {
                                "bonusBreakdownId": 3
                        }
                ]
        },
        {
                "id": 52,
                "lifeformId": 4,
                "gkId": 14213,
                "name": "Efficient Swarm Intelligence",
                "description": "Efficient Swarm Intelligence allows regular and lifeform research projects to be completed much faster. Each level increases the speed of research.",
                "shortDesc": "Research Speed Boost",
                "metalBaseCost": 200000,
                "crystalBaseCost": 100000,
                "deutBaseCost": 100000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "99%",
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 8500,
                "target": [
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 106
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 108
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 109
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 110
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 111
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 113
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 114
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 115
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 117
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 118
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 120
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 121
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 122
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 123
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 124
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 199
                        }
                ]
        },
        {
                "id": 53,
                "lifeformId": 1,
                "gkId": 11214,
                "name": "Bomber Mk II",
                "description": "Researching the Bomber Mk II increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Bombers with each level.",
                "shortDesc": "Bomber Boost",
                "metalBaseCost": 160000,
                "crystalBaseCost": 120000,
                "deutBaseCost": 50000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.3,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 9000,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 211
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 211
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 211
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 211
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 211
                        }
                ]
        },
        {
                "id": 54,
                "lifeformId": 2,
                "gkId": 12214,
                "name": "Optimised Silo Construction Method",
                "description": "Researching the Optimised Silo Construction Method reduces the costs and research time of missile silos with each level.",
                "shortDesc": "Missile Silo Cost Reduction",
                "metalBaseCost": 220000,
                "crystalBaseCost": 110000,
                "deutBaseCost": 110000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.3,
                "crystalIncreaseFactor": 1.3,
                "deutIncreaseFactor": 1.3,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "50%",
                "bonus2BaseValue": 0.2,
                "bonus2IncreaseFactor": 1,
                "bonus2Max": "99%",
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 9000,
                "target": [
                        {
                                "bonusBreakdownId": 27
                        },
                        {
                                "bonusBreakdownId": 28
                        }
                ]
        },
        {
                "id": 55,
                "lifeformId": 3,
                "gkId": 13214,
                "name": "General Overhaul (Battlecruiser)",
                "description": "The general overhaul of the Battlecruiser increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Battlecruisers with each level.",
                "shortDesc": "BC Boost",
                "metalBaseCost": 160000,
                "crystalBaseCost": 120000,
                "deutBaseCost": 50000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.3,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 9000,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 215
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 215
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 215
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 215
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 215
                        }
                ]
        },
        {
                "id": 56,
                "lifeformId": 4,
                "gkId": 14214,
                "name": "Overclocking (Large Cargo)",
                "description": "Overclocking Large Cargo ships increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Largo Cargo ships with each level.",
                "shortDesc": "LC Boost",
                "metalBaseCost": 160000,
                "crystalBaseCost": 120000,
                "deutBaseCost": 50000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 9000,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 203
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 203
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 203
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 203
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 203
                        }
                ]
        },
        {
                "id": 57,
                "lifeformId": 1,
                "gkId": 11215,
                "name": "Destroyer Mk II",
                "description": "Researching the Destroyer Mk II increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Destroyers with each level.",
                "shortDesc": "Destroyer Boost",
                "metalBaseCost": 160000,
                "crystalBaseCost": 120000,
                "deutBaseCost": 50000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.3,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 9500,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 213
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 213
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 213
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 213
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 213
                        }
                ]
        },
        {
                "id": 58,
                "lifeformId": 2,
                "gkId": 12215,
                "name": "Diamond Energy Transmitter",
                "description": "Diamond Energy Transmitters reduce the costs and research time of energy technology with each level.",
                "shortDesc": "Energy Tech Cost Reduction",
                "metalBaseCost": 240000,
                "crystalBaseCost": 120000,
                "deutBaseCost": 120000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.3,
                "crystalIncreaseFactor": 1.3,
                "deutIncreaseFactor": 1.3,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "50%",
                "bonus2BaseValue": 0.2,
                "bonus2IncreaseFactor": 1,
                "bonus2Max": "99%",
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 9500,
                "target": [
                        {
                                "bonusBreakdownId": 13,
                                "gameKnowledgeId": 113
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 113
                        }
                ]
        },
        {
                "id": 59,
                "lifeformId": 3,
                "gkId": 13215,
                "name": "General Overhaul (Bomber)",
                "description": "The general overhaul of the Bomber increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Bombers with each level.",
                "shortDesc": "Bomber Boost",
                "metalBaseCost": 320000,
                "crystalBaseCost": 240000,
                "deutBaseCost": 100000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.3,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 9500,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 211
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 211
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 211
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 211
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 211
                        }
                ]
        },
        {
                "id": 60,
                "lifeformId": 4,
                "gkId": 14215,
                "name": "Gravitation Sensors",
                "description": "Gravitation Sensors increase the amount of Dark Matter that can be earned on expeditions with each level.",
                "shortDesc": "Expo DM Find Boost",
                "metalBaseCost": 240000,
                "crystalBaseCost": 120000,
                "deutBaseCost": 120000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 9500,
                "target": [
                        {
                                "bonusBreakdownId": 29
                        }
                ]
        },
        {
                "id": 61,
                "lifeformId": 1,
                "gkId": 11216,
                "name": "Battlecruiser Mk II",
                "description": "Researching the Battlecruiser Mk II increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Battlecruisers with each level.",
                "shortDesc": "BC Boost",
                "metalBaseCost": 320000,
                "crystalBaseCost": 240000,
                "deutBaseCost": 100000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.3,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 10000,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 215
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 215
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 215
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 215
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 215
                        }
                ]
        },
        {
                "id": 62,
                "lifeformId": 2,
                "gkId": 12216,
                "name": "Obsidian Shield Reinforcement",
                "description": "Researching the Obsidian Shield Reinforcement increases the structural integrity, shield strength as well as attack strength of defensive structures.",
                "shortDesc": "Defense Boost",
                "metalBaseCost": 250000,
                "crystalBaseCost": 250000,
                "deutBaseCost": 250000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.4,
                "crystalIncreaseFactor": 1.4,
                "deutIncreaseFactor": 1.4,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.5,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 10000,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 401
                        },
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 402
                        },
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 403
                        },
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 404
                        },
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 405
                        },
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 406
                        },
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 407
                        },
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 408
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 401
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 402
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 403
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 404
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 405
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 406
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 407
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 408
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 401
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 402
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 403
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 404
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 405
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 406
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 407
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 408
                        }
                ]
        },
        {
                "id": 63,
                "lifeformId": 3,
                "gkId": 13216,
                "name": "General Overhaul (Destroyer)",
                "description": "The general overhaul of the Destroyer increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Destroyers with each level.",
                "shortDesc": "Destroyer Boost",
                "metalBaseCost": 320000,
                "crystalBaseCost": 240000,
                "deutBaseCost": 100000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.3,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 10000,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 213
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 213
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 213
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 213
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 213
                        }
                ]
        },
        {
                "id": 64,
                "lifeformId": 4,
                "gkId": 14216,
                "name": "Overclocking (Battleship)",
                "description": "Overclocking the Battleship increases the structural integrity, shield strength, firepower, cargo capacity and basic speed of Battleships with each level.",
                "shortDesc": "Battleship Boost",
                "metalBaseCost": 320000,
                "crystalBaseCost": 240000,
                "deutBaseCost": 100000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.3,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 10000,
                "target": [
                        {
                                "bonusBreakdownId": 16,
                                "gameKnowledgeId": 207
                        },
                        {
                                "bonusBreakdownId": 17,
                                "gameKnowledgeId": 207
                        },
                        {
                                "bonusBreakdownId": 18,
                                "gameKnowledgeId": 207
                        },
                        {
                                "bonusBreakdownId": 10,
                                "gameKnowledgeId": 207
                        },
                        {
                                "bonusBreakdownId": 7,
                                "gameKnowledgeId": 207
                        }
                ]
        },
        {
                "id": 65,
                "lifeformId": 1,
                "gkId": 11217,
                "name": "Robot Assistants",
                "description": "With Robot Assistants, research projects can be completed much faster. Each level increases the speed of research.",
                "shortDesc": "Research Speed Boost",
                "metalBaseCost": 300000,
                "crystalBaseCost": 180000,
                "deutBaseCost": 120000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.2,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "99%",
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 11000,
                "target": [
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 106
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 108
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 109
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 110
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 111
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 113
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 114
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 115
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 117
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 118
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 120
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 121
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 122
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 123
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 124
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 199
                        }
                ]
        },
        {
                "id": 66,
                "lifeformId": 2,
                "gkId": 12217,
                "name": "Rune Shields",
                "description": "Researching Rune Shields reduces the costs and duration of researching Armour Technology with each level.",
                "shortDesc": "Armor Tech Cost Reduction",
                "metalBaseCost": 500000,
                "crystalBaseCost": 300000,
                "deutBaseCost": 200000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.2,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "50%",
                "bonus2BaseValue": 0.2,
                "bonus2IncreaseFactor": 1,
                "bonus2Max": "99%",
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 13000,
                "target": [
                        {
                                "bonusBreakdownId": 13,
                                "gameKnowledgeId": 111
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 111
                        }
                ]
        },
        {
                "id": 67,
                "lifeformId": 3,
                "gkId": 13217,
                "name": "Experimental Weapons Technology",
                "description": "Researching Experimental Weapons Technology reduces the costs and research time of weapons technology with each level.",
                "shortDesc": "Weapons Tech Cost Reduction",
                "metalBaseCost": 500000,
                "crystalBaseCost": 300000,
                "deutBaseCost": 200000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.2,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "50%",
                "bonus2BaseValue": 0.2,
                "bonus2IncreaseFactor": 1,
                "bonus2Max": "99%",
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 13000,
                "target": [
                        {
                                "bonusBreakdownId": 13,
                                "gameKnowledgeId": 109
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 109
                        }
                ]
        },
        {
                "id": 68,
                "lifeformId": 4,
                "gkId": 14217,
                "name": "Psionic Shield Matrix",
                "description": "Enhancing the Psionic Shield Matrix reduces the costs and research time of shield technology with each level.",
                "shortDesc": "Shield Tech Cost Reduction",
                "metalBaseCost": 500000,
                "crystalBaseCost": 300000,
                "deutBaseCost": 200000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.5,
                "crystalIncreaseFactor": 1.5,
                "deutIncreaseFactor": 1.5,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.2,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "50%",
                "bonus2BaseValue": 0.2,
                "bonus2IncreaseFactor": 1,
                "bonus2Max": "99%",
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 13000,
                "target": [
                        {
                                "bonusBreakdownId": 13,
                                "gameKnowledgeId": 110
                        },
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 110
                        }
                ]
        },
        {
                "id": 69,
                "lifeformId": 1,
                "gkId": 11218,
                "name": "Supercomputer",
                "description": "With the Supercomputer, astrophysics research projects can be completed much faster. Each level increases the speed of research.",
                "shortDesc": "Research Speed Boost",
                "metalBaseCost": 500000,
                "crystalBaseCost": 300000,
                "deutBaseCost": 200000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.3,
                "crystalIncreaseFactor": 1.3,
                "deutIncreaseFactor": 1.3,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.1,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": "99%",
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.3,
                "durationBase": 13000,
                "target": [
                        {
                                "bonusBreakdownId": 9,
                                "gameKnowledgeId": 124
                        }
                ]
        },
        {
                "id": 70,
                "lifeformId": 2,
                "gkId": 12218,
                "name": "Rock’tal Collector Enhancement",
                "description": "The class bonuses as Collector increase with each level. All bonuses increase except:\n•\tOverloading Crawlers\n•\tDiscount on acceleration (buildings)",
                "shortDesc": "Collector Class Boost",
                "metalBaseCost": 300000,
                "crystalBaseCost": 180000,
                "deutBaseCost": 120000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.7,
                "crystalIncreaseFactor": 1.7,
                "deutIncreaseFactor": 1.7,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.2,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 11000,
                "target": [
                        {
                                "bonusBreakdownId": 30
                        }
                ]
        },
        {
                "id": 71,
                "lifeformId": 3,
                "gkId": 13218,
                "name": "Mechan General Enhancement",
                "description": "The class bonuses as General increase with each level. All bonuses increase except:\n•\tSmall chance to immediately destroy a Deathstar once in a battle using a light fighter\n•\tWreckage at attack (transport to starting planet)\n•\tDetailed fleet speed settings\n•\tDiscount on acceleration (shipyard)",
                "shortDesc": "General Class Boost",
                "metalBaseCost": 300000,
                "crystalBaseCost": 180000,
                "deutBaseCost": 120000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.7,
                "crystalIncreaseFactor": 1.7,
                "deutIncreaseFactor": 1.7,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.2,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 11000,
                "target": [
                        {
                                "bonusBreakdownId": 31
                        }
                ]
        },
        {
                "id": 72,
                "lifeformId": 4,
                "gkId": 14218,
                "name": "Kaelesh Discoverer Enhancement",
                "description": "The class bonuses as Discoverer increase with each level. All bonuses increase except:\n•\tDebris fields created on expeditions are visible in the Galaxy view\n•\tLoot from inactive players\n•\tDiscount on acceleration (research)",
                "shortDesc": "Discoverer Class Boost",
                "metalBaseCost": 300000,
                "crystalBaseCost": 180000,
                "deutBaseCost": 120000,
                "energyBaseCost": 0,
                "metalIncreaseFactor": 1.7,
                "crystalIncreaseFactor": 1.7,
                "deutIncreaseFactor": 1.7,
                "energyIncreaseFactor": 0,
                "bonus1BaseValue": 0.2,
                "bonus1IncreaseFactor": 1,
                "bonus1Max": null,
                "bonus2BaseValue": null,
                "bonus2IncreaseFactor": null,
                "bonus2Max": null,
                "bonus3BaseValue": null,
                "bonus3IncreaseFactor": null,
                "bonus3Max": null,
                "durationFactor": 1.4,
                "durationBase": 11000,
                "target": [
                        {
                                "bonusBreakdownId": 32
                        }
                ]
        }
];

