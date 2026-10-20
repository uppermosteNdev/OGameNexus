// Official OGame In-Game Entities & Mission Translations
// Extracted directly from Gameforge official localization endpoints:
// - https://s1-en.ogame.gameforge.com/api/localization.xml (EN)
// - https://s284-de.ogame.gameforge.com/api/localization.xml (DE)
// - https://s284-fr.ogame.gameforge.com/api/localization.xml (FR)
// - https://s171-ro.ogame.gameforge.com/api/localization.xml (RO)
// - https://s189-pl.ogame.gameforge.com/api/localization.xml (PL)
// - https://s185-nl.ogame.gameforge.com/api/localization.xml (NL)
// - https://s276-es.ogame.gameforge.com/api/localization.xml (ES)
// - https://s279-it.ogame.gameforge.com/api/localization.xml (IT)
// - https://s270-ru.ogame.gameforge.com/api/localization.xml (RU)
// - https://s273-tr.ogame.gameforge.com/api/localization.xml (TR)
// - https://s182-br.ogame.gameforge.com/api/localization.xml (BR)
// - https://s183-pt.ogame.gameforge.com/api/localization.xml (PT)

export type SupportedLanguage = 'en' | 'de' | 'fr' | 'ro' | 'pl' | 'nl' | 'es' | 'it' | 'ru' | 'tr' | 'br' | 'pt';

export interface GameEntityTranslation {
    id: number;
    en: string;
    de: string;
    fr: string;
    ro: string;
    pl: string;
    nl: string;
    es: string;
    it: string;
    ru: string;
    tr: string;
    br: string;
    pt: string;
}

export const OFFICIAL_GAME_ENTITIES: Record<number, GameEntityTranslation> = {
    // === BUILDINGS & STORAGES ===
    1: { id: 1, en: "Metal Mine", de: "Metallmine", fr: "Mine de métal", ro: "Mina de Metal", pl: "Kopalnia metalu", nl: "Metaalmijn", es: "Mina de metal", it: "Miniera di Metallo", ru: "Рудник по добыче металла", tr: "Metal Madeni", br: "Mina de Metal", pt: "Mina de Metal" },
    2: { id: 2, en: "Crystal Mine", de: "Kristallmine", fr: "Mine de cristal", ro: "Mina de Cristal", pl: "Kopalnia kryształu", nl: "Kristalmijn", es: "Mina de cristal", it: "Miniera di Cristalli", ru: "Рудник по добыче кристалла", tr: "Kristal Madeni", br: "Mina de Cristal", pt: "Mina de Cristal" },
    3: { id: 3, en: "Deuterium Synthesizer", de: "Deuteriumsynthetisierer", fr: "Synthétiseur de deutérium", ro: "Sintetizator de Deuteriu", pl: "Ekstraktor deuteru", nl: "Deuteriumfabriek", es: "Sintetizador de deuterio", it: "Sintetizzatore di deuterio", ru: "Синтезатор дейтерия", tr: "Deuterium Sentezleyicisi", br: "Sintetizador de Deutério", pt: "Sintetizador de Deutério" },
    4: { id: 4, en: "Solar Plant", de: "Solarkraftwerk", fr: "Centrale électrique solaire", ro: "Uzina Solara", pl: "Elektrownia słoneczna", nl: "Zonne-energiecentrale", es: "Planta de energía solar", it: "Centrale solare", ru: "Солнечная электростанция", tr: "Solar Enerji Santrali", br: "Planta de Energia Solar", pt: "Planta de Energia Solar" },
    12: { id: 12, en: "Fusion Reactor", de: "Fusionskraftwerk", fr: "Centrale électrique de fusion", ro: "Reactor de Fuziune", pl: "Elektrownia fuzyjna", nl: "Fusiecentrale", es: "Planta de fusión", it: "Centrale a Fusione", ru: "Термоядерная электростанция", tr: "Füzyoenerji Santrali", br: "Planta de Fusão", pt: "Planta de Fusão" },
    14: { id: 14, en: "Robotics Factory", de: "Roboterfabrik", fr: "Usine de robots", ro: "Uzina de Roboti", pl: "Fabryka robotów", nl: "Robotfabriek", es: "Fábrica de robots", it: "Fabbrica dei Robot", ru: "Фабрика роботов", tr: "Robot Fabrikası", br: "Fábrica de Robôs", pt: "Fábrica de Robots" },
    15: { id: 15, en: "Nanite Factory", de: "Nanitenfabrik", fr: "Usine de nanites", ro: "Uzina de Naniti", pl: "Fabryka nanitów", nl: "Nanorobotfabriek", es: "Fábrica de nanobots", it: "Fabbrica dei Naniti", ru: "Фабрика нанитов", tr: "Nanit Fabrikasi", br: "Fábrica de Nanites", pt: "Fábrica de Nanites" },
    21: { id: 21, en: "Shipyard", de: "Raumschiffswerft", fr: "Chantier spatial", ro: "Santier Naval", pl: "Stocznia", nl: "Werf", es: "Hangar", it: "Cantiere Spaziale", ru: "Верфь", tr: "Uzay  Tersanesi", br: "Hangar", pt: "Hangar" },
    22: { id: 22, en: "Metal Storage", de: "Metallspeicher", fr: "Hangar de métal", ro: "Depozit de Metal", pl: "Magazyn metalu", nl: "Metaalopslag", es: "Almacén de metal", it: "Deposito di metallo", ru: "Хранилище металла", tr: "Metal Deposu", br: "Armazém de Metal", pt: "Armazém de Metal" },
    23: { id: 23, en: "Crystal Storage", de: "Kristallspeicher", fr: "Hangar de cristal", ro: "Depozit de Cristal", pl: "Magazyn kryształu", nl: "Kristalopslag", es: "Almacén de cristal", it: "Deposito di cristalli", ru: "Хранилище кристалла", tr: "Kristal Deposu", br: "Armazém de Cristal", pt: "Armazém de Cristal" },
    24: { id: 24, en: "Deuterium Tank", de: "Deuteriumtank", fr: "Réservoir de deutérium", ro: "Bazin de Deuteriu", pl: "Zbiornik deuteru", nl: "Deuteriumtank", es: "Contenedor de deuterio", it: "Cisterna di deuterio", ru: "Ёмкость для дейтерия", tr: "Deuterium Tankeri", br: "Tanque de Deutério", pt: "Tanque de Deutério" },
    31: { id: 31, en: "Research Lab", de: "Forschungslabor", fr: "Laboratoire de recherche", ro: "Laborator de Cercetari", pl: "Laboratorium badawcze", nl: "Onderzoekslab", es: "Laboratorio de investigación", it: "Laboratorio di Ricerca", ru: "Исследовательская лаборатория", tr: "Bilimsel Araştırma Laboratuvarı", br: "Laboratório de Pesquisas", pt: "Laboratório de Pesquisas" },
    33: { id: 33, en: "Terraformer", de: "Terraformer", fr: "Terraformeur", ro: "Formator de Sol", pl: "Terraformer", nl: "Terravormer", es: "Terraformer", it: "Terraformer", ru: "Терраформер", tr: "Terraformer", br: "Terra-Formador", pt: "Terra-Formador" },
    34: { id: 34, en: "Alliance Depot", de: "Allianzdepot", fr: "Dépôt de ravitaillement", ro: "Hangarul Aliantei", pl: "Depozyt sojuszniczy", nl: "Alliantiehangar", es: "Depósito de la alianza", it: "Base di appoggio", ru: "Склад альянса", tr: "Ittifak Deposu", br: "Depósito da Aliança", pt: "Depósito da Aliança" },
    36: { id: 36, en: "Space Dock", de: "Raumdock", fr: "Dock spatial", ro: "Doc Spațial", pl: "Dok kosmiczny", nl: "Ruimtewerf", es: "Astillero orbital", it: "Porto Spaziale", ru: "Космический док", tr: "Uzay İskelesi", br: "Estaleiro Espacial", pt: "Estaleiro Espacial" },
    41: { id: 41, en: "Lunar Base", de: "Mondbasis", fr: "Base lunaire", ro: "Baza Lunara", pl: "Stacja księżycowa", nl: "Maanbasis", es: "Base lunar", it: "Avamposto lunare", ru: "Лунная база", tr: "Ay Merkez Istasyonu", br: "Base Lunar", pt: "Base Lunar" },
    42: { id: 42, en: "Sensor Phalanx", de: "Sensorphalanx", fr: "Phalange de capteur", ro: "Senzor Phalanx", pl: "Falanga czujników", nl: "Sensorphalanx", es: "Sensor Phalanx", it: "Falange di sensori", ru: "Сенсорная фаланга", tr: "Radar Istasyonu", br: "Sensor Phalanx", pt: "Sensor Phalanx" },
    43: { id: 43, en: "Jump Gate", de: "Sprungtor", fr: "Porte de saut spatial", ro: "Portal de Teleportare", pl: "Teleporter", nl: "Sprongpoort", es: "Salto cuántico", it: "Portale iperspaziale", ru: "Ворота", tr: "Siçrama Geçidi", br: "Portal de Salto Quântico", pt: "Portal de Salto Quântico" },
    44: { id: 44, en: "Missile Silo", de: "Raketensilo", fr: "Silo de missiles", ro: "Siloz de Rachete", pl: "Silos rakietowy", nl: "Raketsilo", es: "Silo", it: "Base missilistica", ru: "Ракетная шахта", tr: "Roket Silosu", br: "Silo de Mísseis", pt: "Silo de Mísseis" },

    // === RESEARCH & TECHNOLOGIES ===
    106: { id: 106, en: "Espionage Technology", de: "Spionagetechnik", fr: "Technologie Espionnage", ro: "Tehnologia Spionajului", pl: "Technologia szpiegowska", nl: "Spionagetechniek", es: "Tecnología de espionaje", it: "Tecnologia per lo spionaggio", ru: "Шпионаж", tr: "Casusluk tekniği", br: "Tecnologia de Espionagem", pt: "Tecnologia de Espionagem" },
    108: { id: 108, en: "Computer Technology", de: "Computertechnik", fr: "Technologie Ordinateur", ro: "Tehnologia Calculatoarelor", pl: "Technologia komputerowa", nl: "Computertechniek", es: "Tecnología de computación", it: "Tecnologia informatica", ru: "Компьютерная технология", tr: "Bilgisayar Tekniği", br: "Tecnologia de Computadores", pt: "Tecnologia de Computadores" },
    109: { id: 109, en: "Weapons Technology", de: "Waffentechnik", fr: "Technologie Armes", ro: "Tehnologia Armelor", pl: "Technologia bojowa", nl: "Wapentechniek", es: "Tecnología militar", it: "Tecnologia delle armi", ru: "Оружейная технология", tr: "Silah tekniği", br: "Tecnologia de Armas", pt: "Tecnologia de Armas" },
    110: { id: 110, en: "Shielding Technology", de: "Schildtechnik", fr: "Technologie Bouclier", ro: "Tehnologia Scutului", pl: "Technologia ochronna", nl: "Schildtechniek", es: "Tecnología de defensa", it: "Tecnologia degli scudi", ru: "Щитовая технология", tr: "Kalkan tekniği", br: "Tecnologia de Escudo", pt: "Tecnologia de Escudo" },
    111: { id: 111, en: "Armour Technology", de: "Raumschiffpanzerung", fr: "Technologie Protection des vaisseaux spatiaux", ro: "Tehnologia Armurilor", pl: "Opancerzenie", nl: "Pantsertechniek", es: "Tecnología de blindaje", it: "Tecnologia delle corazze", ru: "Броня космических кораблей", tr: "Uzay gemisi zırhı", br: "Tecnologia de Blindagem", pt: "Tecnologia de Blindagem" },
    113: { id: 113, en: "Energy Technology", de: "Energietechnik", fr: "Technologie énergétique", ro: "Tehnologia Energiei", pl: "Technologia energetyczna", nl: "Energietechniek", es: "Tecnología de energía", it: "Tecnologia Energetica", ru: "Энергетическая технология", tr: "Enerji tekniği", br: "Tecnologia de Energia", pt: "Tecnologia de Energia" },
    114: { id: 114, en: "Hyperspace Technology", de: "Hyperraumtechnik", fr: "Technologie hyperespace", ro: "Tehnologia Hiperspatiala", pl: "Technologia nadprzestrzenna", nl: "Hyperruimtetechniek", es: "Tecnología de hiperespacio", it: "Tecnologia iperspaziale", ru: "Гиперпространственная технология", tr: "Hiperuzay tekniği", br: "Tecnologia de Hiperespaço", pt: "Tecnologia de Hiperespaço" },
    115: { id: 115, en: "Combustion Drive", de: "Verbrennungstriebwerk", fr: "Réacteur à combustion", ro: "Motor pe Combustie", pl: "Napęd spalinowy", nl: "Verbrandingsmotor", es: "Motor de combustión", it: "Propulsore a combustione", ru: "Реактивный двигатель", tr: "Yanma motoru", br: "Motor de Combustão", pt: "Motor de Combustão" },
    117: { id: 117, en: "Impulse Drive", de: "Impulstriebwerk", fr: "Réacteur à impulsion", ro: "Motor cu Impuls", pl: "Napęd impulsowy", nl: "Impulsmotor", es: "Motor de impulso", it: "Propulsore a impulso", ru: "Импульсный двигатель", tr: "İtki motoru", br: "Motor de Impulsão", pt: "Motor de Impulsão" },
    118: { id: 118, en: "Hyperspace Drive", de: "Hyperraumantrieb", fr: "Propulsion hyperespace", ro: "Motor Hiperspatial", pl: "Napęd nadprzestrzenny", nl: "Hyperruimtemotor", es: "Propulsor hiperespacial", it: "Propulsore iperspaziale", ru: "Гиперпространственный двигатель", tr: "Hiperuzay iticisi", br: "Motor Propulsor de Hiperespaço", pt: "Motor Propulsor de Hiperespaço" },
    120: { id: 120, en: "Laser Technology", de: "Lasertechnik", fr: "Technologie Laser", ro: "Tehnologia Laserelor", pl: "Technologia laserowa", nl: "Lasertechniek", es: "Tecnología láser", it: "Tecnologia dei Laser", ru: "Лазерная технология", tr: "Lazer tekniği", br: "Tecnologia Laser", pt: "Tecnologia Laser" },
    121: { id: 121, en: "Ion Technology", de: "Ionentechnik", fr: "Technologie à ions", ro: "Tehnologia Ionilor", pl: "Technologia jonowa", nl: "Iontechniek", es: "Tecnología iónica", it: "Tecnologia ionica", ru: "Ионная технология", tr: "İyon Tekniği", br: "Tecnologia de Íons", pt: "Tecnologia de Iões" },
    122: { id: 122, en: "Plasma Technology", de: "Plasmatechnik", fr: "Technologie Plasma", ro: "Tehnologia Plasmei", pl: "Technologia plazmowa", nl: "Plasmatechniek", es: "Tecnología de plasma", it: "Tecnologia del plasma", ru: "Плазменная технология", tr: "Plazma tekniği", br: "Tecnologia de Plasma", pt: "Tecnologia de Plasma" },
    123: { id: 123, en: "Intergalactic Research Network", de: "Intergalaktisches Forschungsnetzwerk", fr: "Réseau de recherche intergalactique", ro: "Reteaua de Cercetare Intergalactica", pl: "Międzygalaktyczna Sieć Badań Naukowych", nl: "Intergalactisch Onderzoeksnetwerk", es: "Red de investigación intergaláctica", it: "Rete interplanetaria di ricerca", ru: "Межгалактическая исследовательская сеть", tr: "Galaksiler arasi arastirma agi", br: "Rede Intergaláctica de Pesquisas", pt: "Rede Intergaláctica de Pesquisas" },
    124: { id: 124, en: "Astrophysics", de: "Astrophysik", fr: "Astrophysique", ro: "Astrofizica", pl: "Astrofizyka", nl: "Astrofysica", es: "Astrofísica", it: "Astrofisica", ru: "Астрофизика", tr: "Astrofizik", br: "Astrofísica", pt: "Astrofísica" },
    199: { id: 199, en: "Graviton Technology", de: "Gravitonforschung", fr: "Technologie Graviton", ro: "Tehnologia Graviton", pl: "Rozwój grawitonów", nl: "Gravitontechniek", es: "Tecnología de gravitón", it: "Tecnologia Gravitonica", ru: "Гравитационная технология", tr: "Graviton araştırması", br: "Tecnologia de Gravitação", pt: "Tecnologia de Gravitação" },

    // === SHIPS ===
    202: { id: 202, en: "Small Cargo", de: "Kleiner Transporter", fr: "Petit transporteur", ro: "Transportor mic", pl: "Mały transporter", nl: "Klein vrachtschip", es: "Nave pequeña de carga", it: "Cargo leggero", ru: "Малый транспорт", tr: "Küçük Nakliye Gemisi", br: "Cargueiro Pequeno", pt: "Cargueiro Pequeno" },
    203: { id: 203, en: "Large Cargo", de: "Großer Transporter", fr: "Grand transporteur", ro: "Transportor mare", pl: "Duży transporter", nl: "Groot vrachtschip", es: "Nave grande de carga", it: "Cargo Pesante", ru: "Большой транспорт", tr: "Büyük Nakliye Gemisi", br: "Cargueiro Grande", pt: "Cargueiro Grande" },
    204: { id: 204, en: "Light Fighter", de: "Leichter Jäger", fr: "Chasseur léger", ro: "Vanator usor", pl: "Lekki myśliwiec", nl: "Licht gevechtsschip", es: "Cazador ligero", it: "Caccia Leggero", ru: "Лёгкий истребитель", tr: "Hafif Avcı", br: "Caça Ligeiro", pt: "Caça Ligeiro" },
    205: { id: 205, en: "Heavy Fighter", de: "Schwerer Jäger", fr: "Chasseur lourd", ro: "Vanator greu", pl: "Ciężki myśliwiec", nl: "Zwaar gevechtsschip", es: "Cazador pesado", it: "Caccia Pesante", ru: "Тяжёлый истребитель", tr: "Ağır Avcı", br: "Caça Pesado", pt: "Caça Pesado" },
    206: { id: 206, en: "Cruiser", de: "Kreuzer", fr: "Croiseur", ro: "Crucisator", pl: "Krążownik", nl: "Kruiser", es: "Crucero", it: "Incrociatore", ru: "Крейсер", tr: "Kruvazör", br: "Cruzador", pt: "Cruzador" },
    207: { id: 207, en: "Battleship", de: "Schlachtschiff", fr: "Vaisseau de bataille", ro: "Nava de razboi", pl: "Okręt wojenny", nl: "Slagschip", es: "Nave de batalla", it: "Nave da battaglia", ru: "Линкор", tr: "Komuta Gemisi", br: "Nave de Batalha", pt: "Nave de Batalha" },
    208: { id: 208, en: "Colony Ship", de: "Kolonieschiff", fr: "Vaisseau de colonisation", ro: "Nava de Colonizare", pl: "Statek kolonizacyjny", nl: "Kolonisatieschip", es: "Colonizador", it: "Colonizzatrice", ru: "Колонизатор", tr: "Koloni Gemisi", br: "Nave Colonizadora", pt: "Nave de Colonização" },
    209: { id: 209, en: "Recycler", de: "Recycler", fr: "Recycleur", ro: "Reciclator", pl: "Recykler", nl: "Recycler", es: "Reciclador", it: "Riciclatrici", ru: "Переработчик", tr: "Geri Dönüsümcü", br: "Reciclador", pt: "Reciclador" },
    210: { id: 210, en: "Espionage Probe", de: "Spionagesonde", fr: "Sonde d`espionnage", ro: "Proba de spionaj", pl: "Sonda szpiegowska", nl: "Spionagesonde", es: "Sonda de espionaje", it: "Sonda spia", ru: "Шпионский зонд", tr: "Casus Sondasi", br: "Sonda de Espionagem", pt: "Sonda de Espionagem" },
    211: { id: 211, en: "Bomber", de: "Bomber", fr: "Bombardier", ro: "Bombardier", pl: "Bombowiec", nl: "Bommenwerper", es: "Bombardero", it: "Bombardiere", ru: "Бомбардировщик", tr: "Bombardıman Gemisi", br: "Bombardeiro", pt: "Bombardeiro" },
    212: { id: 212, en: "Solar Satellite", de: "Solarsatellit", fr: "Satellite solaire", ro: "Satelit solar", pl: "Satelita słoneczny", nl: "Zonne-energiesatelliet", es: "Satélite solar", it: "Satellite Solare", ru: "Солнечный спутник", tr: "Solar Uydu", br: "Satélite Solar", pt: "Satélite Solar" },
    213: { id: 213, en: "Destroyer", de: "Zerstörer", fr: "Destructeur", ro: "Distrugator", pl: "Niszczyciel", nl: "Vernietiger", es: "Destructor", it: "Corazzata", ru: "Уничтожитель", tr: "Muhrip", br: "Destruidor", pt: "Destruidor" },
    214: { id: 214, en: "Deathstar", de: "Todesstern", fr: "Étoile de la mort", ro: "RIP", pl: "Gwiazda Śmierci", nl: "Ster des Doods", es: "Estrella de la muerte", it: "Morte Nera", ru: "Звезда смерти", tr: "Ölüm Yildizi", br: "Estrela da Morte", pt: "Estrela da Morte" },
    215: { id: 215, en: "Battlecruiser", de: "Schlachtkreuzer", fr: "Traqueur", ro: "Interceptor", pl: "Pancernik", nl: "Interceptor", es: "Acorazado", it: "Incrociatore da Battaglia", ru: "Линейный крейсер", tr: "Firkateyn", br: "Interceptador", pt: "Interceptor" },
    216: { id: 216, en: "Trade Ship", de: "Handelsschiff", fr: "Vaisseau marchand", ro: "Navă Comercială", pl: "Statek handlowy", nl: "Handelsschip", es: "Nave comercial", it: "Nave mercantile", ru: "Торговец", tr: "Ticaret gemisi", br: "Naves de comércio", pt: "Entregadora" },
    217: { id: 217, en: "Crawler", de: "Crawler", fr: "Foreuse", ro: "Crawler", pl: "Pełzacz", nl: "Processer", es: "Taladrador", it: "Crawler", ru: "Гусеничник", tr: "Paletli", br: "Rastejador", pt: "Rastejador" },
    218: { id: 218, en: "Reaper", de: "Reaper", fr: "Faucheur", ro: "Reaper", pl: "Rozpruwacz", nl: "Ruimer", es: "Segador", it: "Reaper", ru: "Жнец", tr: "Azrail", br: "Ceifeira", pt: "Ceifeira" },
    219: { id: 219, en: "Pathfinder", de: "Pathfinder", fr: "Éclaireur", ro: "Pathfinder", pl: "Pionier", nl: "Navigator", es: "Explorador", it: "Pathfinder", ru: "Первопроходец", tr: "Rehber", br: "Explorador", pt: "Exploradora" },

    // === DEFENCE ===
    401: { id: 401, en: "Rocket Launcher", de: "Raketenwerfer", fr: "Lanceur de missiles", ro: "Lansator de Rachete", pl: "Wyrzutnia rakiet", nl: "Raketlanceerder", es: "Lanzamisiles", it: "Lanciamissili", ru: "Ракетная установка", tr: "Roketatar", br: "Lançador de Mísseis", pt: "Lançador de Mísseis" },
    402: { id: 402, en: "Light Laser", de: "Leichtes Lasergeschütz", fr: "Artillerie laser légère", ro: "Laser Usor", pl: "Lekkie działo laserowe", nl: "Kleine laser", es: "Láser pequeño", it: "Laser leggero", ru: "Лёгкий лазер", tr: "Hafif Lazer Topu", br: "Laser Ligeiro", pt: "Laser Ligeiro" },
    403: { id: 403, en: "Heavy Laser", de: "Schweres Lasergeschütz", fr: "Artillerie laser lourde", ro: "Laser Greu", pl: "Ciężkie działo laserowe", nl: "Grote laser", es: "Láser grande", it: "Laser pesante", ru: "Тяжёлый лазер", tr: "Ağır Lazer Topu", br: "Laser Pesado", pt: "Laser Pesado" },
    404: { id: 404, en: "Gauss Cannon", de: "Gaußkanone", fr: "Canon de Gauss", ro: "Tun Gauss", pl: "Działo Gaussa", nl: "Gausskanon", es: "Cañón gauss", it: "Cannone Gauss", ru: "Пушка Гаусса", tr: "Gaus Topu", br: "Canhão de Gauss", pt: "Canhão de Gauss" },
    405: { id: 405, en: "Ion Cannon", de: "Ionengeschütz", fr: "Artillerie à ions", ro: "Tun Magnetic", pl: "Działo jonowe", nl: "Ionkanon", es: "Cañón iónico", it: "Cannone ionico", ru: "Ионное орудие", tr: "Iyon Topu", br: "Canhão de Íons", pt: "Canhão de Iões" },
    406: { id: 406, en: "Plasma Turret", de: "Plasmawerfer", fr: "Lanceur de plasma", ro: "Turela cu Plasma", pl: "Wyrzutnia plazmy", nl: "Plasmakanon", es: "Cañón de plasma", it: "Cannone al Plasma", ru: "Плазменное орудие", tr: "Plazma Atıcı", br: "Canhão de Plasma", pt: "Canhão de Plasma" },
    407: { id: 407, en: "Small Shield Dome", de: "Kleine Schildkuppel", fr: "Petit bouclier", ro: "Scut Planetar Mic", pl: "Mała Osłona Ochronna", nl: "Kleine planetaire schildkoepel", es: "Cúpula pequeña de protección", it: "Cupola scudo piccola", ru: "Малый щитовой купол", tr: "Küçük Kalkan Kubbesi", br: "Pequeno Escudo Planetário", pt: "Pequeno Escudo Planetário" },
    408: { id: 408, en: "Large Shield Dome", de: "Große Schildkuppel", fr: "Grand bouclier", ro: "Scut Planetar Mare", pl: "Duża Osłona Ochronna", nl: "Grote planetaire schildkoepel", es: "Cúpula grande de protección", it: "Cupola scudo potenziata", ru: "Большой щитовой купол", tr: "Büyük Kalkan Kubbesi", br: "Grande Escudo Planetário", pt: "Grande Escudo Planetário" },
    502: { id: 502, en: "Anti-Ballistic Missiles", de: "Abfangrakete", fr: "Missile d`interception", ro: "Racheta Anti-Balistica", pl: "Przeciwrakieta", nl: "Anti-ballistische raketten", es: "Misiles antibalísticos", it: "Missili anti balistici", ru: "Ракета-перехватчик", tr: "Yakalıyıcı Roketler", br: "Míssil de Interceptação", pt: "Míssil de Intercepção" },
    503: { id: 503, en: "Interplanetary Missiles", de: "Interplanetarrakete", fr: "Missile interplanétaire", ro: "Rachete Interplanetare", pl: "Rakieta międzyplanetarna", nl: "Interplanetaire raketten", es: "Misil interplanetario", it: "Missili Interplanetari", ru: "Ме��планетная ракета", tr: "Gezegenlerarasi Roketler", br: "Míssil Interplanetário", pt: "Míssil Interplanetário" },

};

export const OFFICIAL_MISSIONS: Record<number, GameEntityTranslation> = {
    1: { id: 1, en: "Attack", de: "Angreifen", fr: "Attaquer", ro: "Atac", pl: "Atakuj", nl: "Aanvallen", es: "Atacar", it: "Attacco", ru: "Атака", tr: "Saldır", br: "Atacar", pt: "Atacar" },
    2: { id: 2, en: "ACS Attack", de: "Verbandsangriff", fr: "Attaque groupée", ro: "Atac SAL", pl: "Atak łączony", nl: "federatie aanval", es: "Ataque conjunto", it: "Attacco federale", ru: "Совместная атака", tr: "İttifak Saldırısı", br: "Ataque de aliança", pt: "Ataque de Aliança" },
    3: { id: 3, en: "Transport", de: "Transport", fr: "Transporter", ro: "Transport", pl: "Transport", nl: "Transport", es: "Transporte", it: "Trasporto", ru: "Транспорт", tr: "Nakliye", br: "Transportar", pt: "Transportar" },
    4: { id: 4, en: "Deployment", de: "Stationieren", fr: "Stationner", ro: "Desfasurare", pl: "Stacjonuj", nl: "Plaatsen", es: "Desplegar", it: "Schieramento", ru: "Оставить", tr: "Konuşlandır", br: "Transferir", pt: "Transferir" },
    5: { id: 5, en: "ACS Defend", de: "Halten", fr: "Stationner", ro: "Aparare SAL", pl: "Zatrzymaj", nl: "Halt", es: "Mantener posición", it: "Stazionamento", ru: "Держаться", tr: "Dur", br: "Guardar Posições", pt: "manter posições" },
    6: { id: 6, en: "Espionage", de: "Spionage", fr: "Espionner", ro: "Spionaj", pl: "Szpieguj", nl: "Spioneren", es: "Espionaje", it: "Spionaggio", ru: "Шпионаж", tr: "Casusluk", br: "Espionar", pt: "Espiar" },
    7: { id: 7, en: "Colonisation", de: "Kolonisieren", fr: "Coloniser", ro: "Colonizare", pl: "Kolonizuj", nl: "Koloniseren", es: "Colonizar", it: "Colonizzazione", ru: "Колонизировать", tr: "Sömürgeleştir", br: "Colonizar", pt: "Colonizar" },
    8: { id: 8, en: "Recycle Debris Field", de: "Trümmerfeld abbauen", fr: "Recycler le champ de débris", ro: "Recicleaza campul de ramasite", pl: "Recykluj pola zniszczeń", nl: "Recycle puinveld", es: "Reciclar campo de escombros", it: "Ricicla campo detriti", ru: "Переработать", tr: "Enkaz alanını sök", br: "Reciclar campo de destroços", pt: "Reciclar Campo de Destroços" },
    9: { id: 9, en: "Moon Destruction", de: "Zerstören", fr: "Détruire", ro: "Distrugerea Lunii", pl: "Niszcz", nl: "Vernietigen", es: "Destruir", it: "Distruzione Luna", ru: "Уничтожить", tr: "Yok etmek", br: "Destruir", pt: "Destruir Lua" },
    15: { id: 15, en: "Expedition", de: "Expedition", fr: "Expédition", ro: "Expeditie", pl: "Ekspedycja", nl: "Expeditie", es: "Expedición", it: "Spedizione", ru: "Экспедиция", tr: "Keşif", br: "Expedição", pt: "Exp. Espacial" },
};

export const OFFICIAL_RESOURCES: Record<string, Record<SupportedLanguage, string>> = {
    metal: { en: "Metal", de: "Metall", fr: "Métal", ro: "Metal", pl: "Metal", nl: "Metaal", es: "Metal", it: "Metallo", ru: "Металл", tr: "Metal", br: "Metal", pt: "Metal" },
    crystal: { en: "Crystal", de: "Kristall", fr: "Cristal", ro: "Cristal", pl: "Kryształ", nl: "Kristal", es: "Cristal", it: "Cristallo", ru: "Кристалл", tr: "Kristal", br: "Cristal", pt: "Cristal" },
    deuterium: { en: "Deuterium", de: "Deuterium", fr: "Deutérium", ro: "Deuteriu", pl: "Deuter", nl: "Deuterium", es: "Deuterio", it: "Deuterio", ru: "Дейтерий", tr: "Döteryum", br: "Deutério", pt: "Deutério" },
    energy: { en: "Energy", de: "Energie", fr: "Énergie", ro: "Energie", pl: "Energia", nl: "Energie", es: "Energía", it: "Energia", ru: "Энергия", tr: "Enerji", br: "Energia", pt: "Energia" },
    darkmatter: { en: "Dark Matter", de: "Dunkle Materie", fr: "Antimatière", ro: "Materie Întunecată", pl: "Antymateria", nl: "Donkere Materie", es: "Materia Oscura", it: "Materia Oscura", ru: "Темная Материя", tr: "Karanlık Madde", br: "Matéria Negra", pt: "Matéria Negra" }
};

export const OFFICIAL_LIFEFORMS: Record<number, Record<SupportedLanguage, string>> = {
    1: { en: "Humans", de: "Menschen", fr: "Humains", ro: "Oameni", pl: "Ludzie", nl: "Mensen", es: "Humanos", it: "Umani", ru: "Люди", tr: "İnsanlar", br: "Humanos", pt: "Humanos" },
    2: { en: "Rock’tal", de: "Rock’tal", fr: "Rock’tal", ro: "Rock’tal", pl: "Rock’tal", nl: "Rock’tal", es: "Rock’tal", it: "Rock’tal", ru: "Рок'тал", tr: "Rock’tal", br: "Rock’tal", pt: "Rock’tal" },
    3: { en: "Mechas", de: "Mechas", fr: "Mécas", ro: "Mecha", pl: "Mechy", nl: "Mecha's", es: "Mechas", it: "Mecha", ru: "Мехи", tr: "Mecha'lar", br: "Mechas", pt: "Mechas" },
    4: { en: "Kaelesh", de: "Kaelesh", fr: "Kaelesh", ro: "Kaelesh", pl: "Kaelesh", nl: "Kaelesh", es: "Kaelesh", it: "Kaelesh", ru: "Каэлеш", tr: "Kaelesh", br: "Kaelesh", pt: "Kaelesh" }
};

export const OFFICIAL_CLASSES: Record<string, Record<SupportedLanguage, string>> = {
    collector: { en: "Collector", de: "Kollektor", fr: "Collecteur", ro: "Colecționar", pl: "Zbieracz", nl: "Verzamelaar", es: "Recolector", it: "Collezionista", ru: "Коллекционер", tr: "Toplayıcı", br: "Coletor", pt: "Colecionador" },
    general: { en: "General", de: "General", fr: "Général", ro: "General", pl: "Generał", nl: "Generaal", es: "General", it: "Generale", ru: "Генерал", tr: "General", br: "General", pt: "General" },
    discoverer: { en: "Discoverer", de: "Entdecker", fr: "Explorateur", ro: "Explorator", pl: "Odkrywca", nl: "Ontdekker", es: "Descubridor", it: "Esploratore", ru: "Первооткрыватель", tr: "Kaşif", br: "Explorador", pt: "Explorador" }
};

/**
 * Detects language from the '-server' letters in an OGame link, URL, or universe string.
 * Examples:
 * - "https://s189-pl.ogame.gameforge.com/game/index.php" -> "pl"
 * - "s185-nl.ogame.gameforge.com" -> "nl"
 * - "s276-es" -> "es"
 * - "s182-br.ogame.gameforge.com" -> "br"
 * - "s183-pt.ogame.gameforge.com" -> "pt"
 * - "s1-en.ogame.gameforge.com" -> "en"
 * - "s284-de.ogame.gameforge.com" -> "de"
 * - "s284-fr.ogame.gameforge.com" -> "fr"
 * - "s171-ro.ogame.gameforge.com" -> "ro"
 */
export function detectLanguageFromServerLink(raw?: string | null): SupportedLanguage | null {
    if (!raw) return null;
    const str = String(raw).trim().toLowerCase();

    // 1. Direct OGame server pattern: s189-pl or 189-pl (s + digits + '-' + letters)
    const serverNumberMatch = str.match(/(?:^|[^a-z0-9])s?\d+-([a-z]+)(?=[^a-z]|$)/i);
    if (serverNumberMatch && serverNumberMatch[1]) {
        const code = serverNumberMatch[1].toLowerCase();
        const map: Record<string, SupportedLanguage> = {
            us: 'en', uk: 'en', org: 'en',
            mx: 'es', ar: 'es',
            at: 'de', ch: 'de'
        };
        const mapped = map[code] || (code as SupportedLanguage);
        if (['en', 'de', 'fr', 'ro', 'pl', 'nl', 'es', 'it', 'ru', 'tr', 'br', 'pt'].includes(mapped)) {
            return mapped;
        }
    }

    // 2. Subdomain before .ogame.gameforge.com (e.g. xxx-pl.ogame.gameforge.com)
    const hostMatch = str.match(/([a-z0-9]+)-([a-z]+)\.ogame\.gameforge\.com/i);
    if (hostMatch && hostMatch[2]) {
        const code = hostMatch[2].toLowerCase();
        const map: Record<string, SupportedLanguage> = {
            us: 'en', uk: 'en', org: 'en',
            mx: 'es', ar: 'es',
            at: 'de', ch: 'de'
        };
        const mapped = map[code] || (code as SupportedLanguage);
        if (['en', 'de', 'fr', 'ro', 'pl', 'nl', 'es', 'it', 'ru', 'tr', 'br', 'pt'].includes(mapped)) {
            return mapped;
        }
    }

    // 3. Gameforge TLD endings (e.g. .de, .ro, .com.br, .pl, .tr)
    const tldMatch = str.match(/\.(com\.br|pt|pl|nl|es|it|ru|tr|ro|de|fr)(?:[/?#:]|$)/i);
    if (tldMatch && tldMatch[1]) {
        const code = tldMatch[1].toLowerCase();
        if (code === 'com.br') return 'br';
        return code as SupportedLanguage;
    }

    return null;
}

/**
 * Safely retrieve current persisted language, auto-detect from server link, or fallback to 'en'
 */
export function getCurrentLanguage(preferredOrUrl?: string | null): SupportedLanguage {
    try {
        if (preferredOrUrl) {
            const detected = detectLanguageFromServerLink(preferredOrUrl);
            if (detected) return detected;
            if (['en', 'de', 'fr', 'ro', 'pl', 'nl', 'es', 'it', 'ru', 'tr', 'br', 'pt'].includes(preferredOrUrl)) {
                return preferredOrUrl as SupportedLanguage;
            }
        }

        // 1. Check persisted user-selected language first if available
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem('ognexus_selected_language');
            if (saved && ['en', 'de', 'fr', 'ro', 'pl', 'nl', 'es', 'it', 'ru', 'tr', 'br', 'pt'].includes(saved)) {
                return saved as SupportedLanguage;
            }
        }

        // 2. Detect default language from OGame link or server letters
        if (typeof window !== 'undefined') {
            const fromLocation = detectLanguageFromServerLink(window.location.href);
            if (fromLocation) return fromLocation;

            if (typeof document !== 'undefined') {
                const metaUni = document.querySelector('meta[name="ogame-universe"]')?.getAttribute('content');
                const fromMeta = detectLanguageFromServerLink(metaUni);
                if (fromMeta) return fromMeta;

                const metaLang = document.querySelector('meta[name="ogame-language"]')?.getAttribute('content')?.toLowerCase();
                if (metaLang && ['en', 'de', 'fr', 'ro', 'pl', 'nl', 'es', 'it', 'ru', 'tr', 'br', 'pt'].includes(metaLang)) {
                    return metaLang as SupportedLanguage;
                }
            }

            try {
                const params = new URLSearchParams(window.location.search);
                const fromParam = detectLanguageFromServerLink(params.get('universe') || params.get('server'));
                if (fromParam) return fromParam;
            } catch { }
        }

        // 3. Fallback to persisted language if available
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ognexus_selected_language') : null;
        if (saved && ['en', 'de', 'fr', 'ro', 'pl', 'nl', 'es', 'it', 'ru', 'tr', 'br', 'pt'].includes(saved)) {
            return saved as SupportedLanguage;
        }
    } catch {
        // fallback
    }
    return 'en';
}

/**
 * Resolve localized Player Class name (Collector, General, Discoverer)
 */
export function getPlayerClassName(playerClass: string | number | null | undefined, lang?: SupportedLanguage): string {
    const activeLang = lang || getCurrentLanguage();
    const norm = String(playerClass ?? '').toLowerCase();
    let key = 'discoverer';
    if (norm.includes('1') || norm.includes('collector') || norm.includes('colector') || norm.includes('colectionar') || norm.includes('colecționar') || norm.includes('kollektor') || norm.includes('collecteur') || norm.includes('zbieracz') || norm.includes('verzamelaar') || norm.includes('recolector') || norm.includes('collezionista') || norm.includes('коллекционер') || norm.includes('toplayıcı') || norm.includes('coletor') || norm.includes('colecionador')) {
        key = 'collector';
    } else if (norm.includes('2') || norm.includes('general') || norm.includes('warrior') || norm.includes('général') || norm.includes('generał') || norm.includes('generaal') || norm.includes('generale') || norm.includes('генерал')) {
        key = 'general';
    } else if (norm.includes('3') || norm.includes('discoverer') || norm.includes('explorator') || norm.includes('entdecker') || norm.includes('explorateur') || norm.includes('odkrywca') || norm.includes('ontdekker') || norm.includes('descubridor') || norm.includes('esploratore') || norm.includes('первооткрыватель') || norm.includes('kaşif') || norm.includes('explorador')) {
        key = 'discoverer';
    }
    return OFFICIAL_CLASSES[key]?.[activeLang] || OFFICIAL_CLASSES[key]?.en || String(playerClass);
}

// Map of canonical English names to Tech IDs for fast lookup
export const ENGLISH_NAME_TO_ID: Record<string, number> = {
    "deuterium mine": 3,
    "deuterium synthesizer": 3,
};
Object.values(OFFICIAL_GAME_ENTITIES).forEach(e => {
    ENGLISH_NAME_TO_ID[e.en.toLowerCase()] = e.id;
});

/**
 * Resolve localized Game Entity Name by Tech ID or English string name
 */
export function getGameEntityName(identifier: number | string, lang: SupportedLanguage = 'en'): string {
    let id: number | null = null;
    if (typeof identifier === 'number') {
        id = identifier;
    } else {
        const parsed = parseInt(identifier, 10);
        if (!isNaN(parsed) && OFFICIAL_GAME_ENTITIES[parsed]) {
            id = parsed;
        } else {
            id = ENGLISH_NAME_TO_ID[identifier.toLowerCase()] || null;
        }
    }

    if (id && OFFICIAL_GAME_ENTITIES[id]) {
        return OFFICIAL_GAME_ENTITIES[id][lang] || OFFICIAL_GAME_ENTITIES[id].en;
    }

    return String(identifier);
}

/**
 * Resolve localized Mission Name by Mission ID
 */
export function getMissionName(id: number | string, lang: SupportedLanguage = 'en'): string {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (OFFICIAL_MISSIONS[numId]) {
        return OFFICIAL_MISSIONS[numId][lang] || OFFICIAL_MISSIONS[numId].en;
    }
    return `Mission ${id}`;
}

/**
 * Resolve localized Resource Name
 */
export function getResourceName(resource: 'metal' | 'crystal' | 'deuterium' | 'energy' | 'darkmatter' | string, lang: SupportedLanguage = 'en'): string {
    const key = resource.toLowerCase();
    if (OFFICIAL_RESOURCES[key]) {
        return OFFICIAL_RESOURCES[key][lang] || OFFICIAL_RESOURCES[key].en;
    }
    return resource;
}
