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


    // === LIFEFORM BUILDINGS ===
    // Humans (11101 - 11112)
    11101: { id: 11101, en: "Residential Sector", de: "Wohnviertel", fr: "Secteur résidentiel", ro: "Sector Rezidențial", pl: "Sektor mieszkalny", nl: "Woonsector", es: "Sector residencial", it: "Settore residenziale", ru: "Жилой сектор", tr: "Yerleşim Alanı", br: "Setor Residencial", pt: "Setor Residencial" },
    11102: { id: 11102, en: "Biosphere Farm", de: "Biosphärenfarm", fr: "Ferme biosphérique", ro: "Ferma Biosferică", pl: "Farma biosferyczna", nl: "Biosfeerboerderij", es: "Granja biosférica", it: "Fattoria biosferica", ru: "Биосферная ферма", tr: "Biyosfer Çiftliği", br: "Fazenda de Biosfera", pt: "Fazenda de Biosfera" },
    11103: { id: 11103, en: "Research Centre", de: "Forschungszentrum", fr: "Centre de recherche", ro: "Centru de Cercetare", pl: "Centrum badawcze", nl: "Onderzoekscentrum", es: "Centro de investigación", it: "Centro di ricerca", ru: "Исследовательский центр", tr: "Araştırma Merkezi", br: "Centro de Pesquisa", pt: "Centro de Investigação" },
    11104: { id: 11104, en: "Academy of Sciences", de: "Akademie der Wissenschaften", fr: "Académie des sciences", ro: "Academia de Științe", pl: "Akademia nauk", nl: "Academie der wetenschappen", es: "Academia de las ciencias", it: "Accademia delle scienze", ru: "Академия наук", tr: "Bilimler Akademisi", br: "Academia de Ciências", pt: "Academia de Ciências" },
    11105: { id: 11105, en: "Neuro-Calibration Centre", de: "Neuro-Kalibrierzentrum", fr: "Centre de neurocalibrage", ro: "Centru de Neuro-Calibrare", pl: "Centrum neurokalibracji", nl: "Neurokalibratiecentrum", es: "Centro de neurocalibración", it: "Centro di neuro-calibrazione", ru: "Центр нейрокалибровки", tr: "Nöro-Kalibrasyon Merkezi", br: "Centro de Neurocalibração", pt: "Centro de Neurocalibração" },
    11106: { id: 11106, en: "High Energy Smelting", de: "Hochenergie-Schmelze", fr: "Fonderie haute énergie", ro: "Topitorie de Mare Energie", pl: "Huta wysokoenergetyczna", nl: "Hoog-energetische smeltoven", es: "Fundición de alta energía", it: "Fonderia ad alta energia", ru: "Высокоэнергетическая плавильня", tr: "Yüksek Enerjili Dökümhane", br: "Fundição de Alta Energia", pt: "Fundição de Alta Energia" },
    11107: { id: 11107, en: "Food Silo", de: "Nahrungssilo", fr: "Silo de nourriture", ro: "Siloz de Hrană", pl: "Silos na żywność", nl: "Voedselsilo", es: "Silo de alimentos", it: "Silos alimentare", ru: "Хранилище продовольствия", tr: "Besin Silosu", br: "Silo de Alimentos", pt: "Silo de Comida" },
    11108: { id: 11108, en: "Fusion-Powered Production", de: "Fusionsgetriebene Produktion", fr: "Production par fusion", ro: "Producție bazată pe Fuziune", pl: "Produkcja napędzana fuzją", nl: "Productie aangedreven door fusie", es: "Producción por fusión", it: "Produzione alimentata a fusione", ru: "Термоядерное производство", tr: "Füzyon Destekli Üretim", br: "Produção Alimentada por Fusão", pt: "Produção Alimentada por Fusão" },
    11109: { id: 11109, en: "Skyscraper", de: "Wolkenkratzer", fr: "Gratte-ciel", ro: "Zgârie-nori", pl: "Wieżowiec", nl: "Wolkenkrabber", es: "Rascacielos", it: "Grattacielo", ru: "Небоскрёб", tr: "Gökdelen", br: "Arranha-céu", pt: "Arranha-céus" },
    11110: { id: 11110, en: "Biotech Lab", de: "Biotechniklabor", fr: "Laboratoire de biotechnologie", ro: "Laborator Biotehnologic", pl: "Laboratorium biotechnologiczne", nl: "Biotechlab", es: "Laboratorio de biotecnología", it: "Laboratorio biotecnologico", ru: "Биотехнологическая лаборатория", tr: "Biyoteknoloji Laboratuvarı", br: "Laboratório Biotecnológico", pt: "Laboratório Biotecnológico" },
    11111: { id: 11111, en: "Metropolis", de: "Metropole", fr: "Métropole", ro: "Metropolă", pl: "Metropolia", nl: "Metropool", es: "Metrópolis", it: "Metropoli", ru: "Метрополия", tr: "Metropol", br: "Metrópole", pt: "Metrópole" },
    11112: { id: 11112, en: "Planetary Shield", de: "Planetarer Schild", fr: "Bouclier planétaire", ro: "Scut Planetar", pl: "Tarcza planetarna", nl: "Planetair schild", es: "Escudo planetario", it: "Scudo planetario", ru: "Планетарный щит", tr: "Gezegen Kalkanı", br: "Escudo Planetário", pt: "Escudo Planetário" },

    // Rock'tal (12101 - 12112)
    12101: { id: 12101, en: "Meditation Enclave", de: "Meditationsenklave", fr: "Enclave de méditation", ro: "Enclavă de Meditație", pl: "Enklawa medytacji", nl: "Meditatie-enclave", es: "Enclave de meditación", it: "Enclave di meditazione", ru: "Анклав медитации", tr: "Meditasyon Bölgesi", br: "Enclave de Meditação", pt: "Enclave de Meditação" },
    12102: { id: 12102, en: "Crystal Farm", de: "Kristallzucht", fr: "Ferme de cristal", ro: "Fermă de Cristal", pl: "Farma kryształów", nl: "Kristalboerderij", es: "Granja de cristal", it: "Fattoria di cristallo", ru: "Кристальная ферма", tr: "Kristal Çiftliği", br: "Fazenda de Cristais", pt: "Fazenda de Cristais" },
    12103: { id: 12103, en: "Rune Technologium", de: "Runentechnologikum", fr: "Technologium des runes", ro: "Tehnologiu Runic", pl: "Technologium runiczne", nl: "Runentechnologium", es: "Tecnologium rúnico", it: "Technologium delle rune", ru: "Рунический технологиум", tr: "Rün Teknologyumu", br: "Tecnologium de Runas", pt: "Tecnologium de Runas" },
    12104: { id: 12104, en: "Rune Forge", de: "Runenschmiede", fr: "Forge des runes", ro: "Forjă Runică", pl: "Kuźnia runiczna", nl: "Runensmederij", es: "Forja de runas", it: "Forgia delle rune", ru: "Руническая кузница", tr: "Rün Demircisi", br: "Forja de Runas", pt: "Forja de Runas" },
    12105: { id: 12105, en: "Oriktorium", de: "Oriktorium", fr: "Oriktorium", ro: "Oriktorium", pl: "Oriktorium", nl: "Oriktorium", es: "Oriktorium", it: "Oriktorium", ru: "Орикториум", tr: "Oriktorium", br: "Oriktorium", pt: "Oriktorium" },
    12106: { id: 12106, en: "Magma Forge", de: "Magmaschmiede", fr: "Forge magmatique", ro: "Forjă de Magmă", pl: "Kuźnia magmowa", nl: "Magmasmederij", es: "Forja de magma", it: "Forgia di magma", ru: "Магматическая кузница", tr: "Magma Demircisi", br: "Forja de Magma", pt: "Forja de Magma" },
    12107: { id: 12107, en: "Disruption Chamber", de: "Disruptionskammer", fr: "Chambre de perturbation", ro: "Cameră de Perturbare", pl: "Komora zakłóceń", nl: "Storingskamer", es: "Cámara de distorsión", it: "Camera di disturbo", ru: "Палата дезинтеграции", tr: "Parçalama Odası", br: "Câmara de Ruptura", pt: "Câmara de Ruptura" },
    12108: { id: 12108, en: "Megalith", de: "Megalith", fr: "Mégalithe", ro: "Megalit", pl: "Megalit", nl: "Megaliet", es: "Megalito", it: "Megalite", ru: "Мегалит", tr: "Megalit", br: "Megálito", pt: "Megálito" },
    12109: { id: 12109, en: "Crystal Refinery", de: "Kristallraffinerie", fr: "Raffinerie de cristal", ro: "Rafinărie de Cristal", pl: "Rafineria kryształu", nl: "Kristalraffinaderij", es: "Refinería de cristal", it: "Raffineria di cristalli", ru: "Кристальный завод", tr: "Kristal Rafinerisi", br: "Refinaria de Cristal", pt: "Refinaria de Cristal" },
    12110: { id: 12110, en: "Deuterium Synthesiser", de: "Deuteriumsynthetisierer", fr: "Synthétiseur de deutérium", ro: "Sintetizator de Deuteriu", pl: "Ekstraktor deuteru", nl: "Deuteriumfabriek", es: "Sintetizador de deuterio", it: "Sintetizzatore di deuterio", ru: "Синтезатор дейтерия", tr: "Döteryum Sentezleyicisi", br: "Sintetizador de Deutério", pt: "Sintetizador de Deutério" },
    12111: { id: 12111, en: "Mineral Research Centre", de: "Mineralienforschungszentrum", fr: "Centre de recherche minière", ro: "Centru de Cercetare Minerală", pl: "Centrum badań mineralnych", nl: "Mineraalonderzoekscentrum", es: "Centro de investigación mineral", it: "Centro ricerche minerarie", ru: "Центр минеральных исследований", tr: "Mineral Araştırma Merkezi", br: "Centro de Pesquisa Mineral", pt: "Centro de Pesquisa Mineral" },
    12112: { id: 12112, en: "Advanced Recycling Plant", de: "Fortgeschrittene Wiederaufbereitungsanlage", fr: "Usine de recyclage avancée", ro: "Instalație Avansată de Reciclare", pl: "Zaawansowany zakład recyklingu", nl: "Geavanceerde recyclingfabriek", es: "Planta avanzada de reciclaje", it: "Impianto avanzato di riciclaggio", ru: "Передовой завод утилизации", tr: "Gelişmiş Geri Dönüşüm Tesisi", br: "Instalação Avançada de Reciclagem", pt: "Instalação Avançada de Reciclagem" },

    // Mechas (13101 - 13112)
    13101: { id: 13101, en: "Assembly Line", de: "Fertigungsstraße", fr: "Chaîne de montage", ro: "Linie de Asamblare", pl: "Linia montażowa", nl: "Assemblagelijn", es: "Cadena de montaje", it: "Catena di montaggio", ru: "Сборочная линия", tr: "Montaj Hattı", br: "Linha de Montagem", pt: "Linha de Montagem" },
    13102: { id: 13102, en: "Fusion Cell Factory", de: "Fusionszellenfabrik", fr: "Usine de cellules de fusion", ro: "Fabrică de Celule de Fuziune", pl: "Fabryka ogniw fuzyjnych", nl: "Fusiecellenfabriek", es: "Fábrica de células de fusión", it: "Fabbrica di celle a fusione", ru: "Завод термоядерных элементов", tr: "Füzyon Hücresi Fabrikası", br: "Fábrica de Células de Fusão", pt: "Fábrica de Células de Fusão" },
    13103: { id: 13103, en: "Robotics Research Centre", de: "Robotik-Forschungszentrum", fr: "Centre de recherche robotique", ro: "Centru de Cercetare Robotică", pl: "Centrum badań nad robotyką", nl: "Robotica-onderzoekscentrum", es: "Centro de investigación robótica", it: "Centro di ricerca robotica", ru: "Центр робототехники", tr: "Robotik Araştırma Merkezi", br: "Centro de Pesquisa Robótica", pt: "Centro de Pesquisa Robótica" },
    13104: { id: 13104, en: "Update Network", de: "Update-Netzwerk", fr: "Réseau de mise à jour", ro: "Rețea de Actualizare", pl: "Sieć aktualizacji", nl: "Update-netwerk", es: "Red de actualización", it: "Rete di aggiornamento", ru: "Сеть обновлений", tr: "Güncelleme Ağı", br: "Rede de Atualização", pt: "Rede de Atualização" },
    13105: { id: 13105, en: "Quantum Computer Centre", de: "Quantencomputerzentrum", fr: "Centre d'ordinateurs quantiques", ro: "Centru de Calcul Cuantic", pl: "Centrum komputerów kwantowych", nl: "Kwantumcomputercentrum", es: "Centro de ordenadores cuánticos", it: "Centro di calcolo quantistico", ru: "Квантовый компьютерный центр", tr: "Kuantum Bilgisayar Merkezi", br: "Centro de Computação Quântica", pt: "Centro de Computação Quântica" },
    13106: { id: 13106, en: "Automatised Assembly Centre", de: "Automatisiertes Montagezentrum", fr: "Centre d'assemblage automatisé", ro: "Centru Automatizat de Asamblare", pl: "Zautomatyzowane centrum montażu", nl: "Geautomatiseerd montagecentrum", es: "Centro automatizado de montaje", it: "Centro di assemblaggio automatizzato", ru: "Автоматизированный центр сборки", tr: "Otomatik Montaj Merkezi", br: "Centro Automatizado de Montagem", pt: "Centro Automatizado de Montagem" },
    13107: { id: 13107, en: "High-Performance Transformer", de: "Hochleistungstransformator", fr: "Transformateur haute performance", ro: "Transformator de Înaltă Performanță", pl: "Transformator wysokiej wydajności", nl: "Krachtige transformator", es: "Transformador de alto rendimiento", it: "Trasformatore ad alte prestazioni", ru: "Высокопроизводительный трансформатор", tr: "Yüksek Performanslı Transformatör", br: "Transformador de Alto Desempenho", pt: "Transformador de Alto Desempenho" },
    13108: { id: 13108, en: "Microchip Assembly Line", de: "Mikrochipfertigungsstraße", fr: "Chaîne de production de puces", ro: "Linie de Asamblare Microcipuri", pl: "Linia montażowa mikroczipów", nl: "Assemblagelijn voor microchips", es: "Cadena de montaje de microchips", it: "Linea di montaggio dei microchip", ru: "Сборочная линия микрочипов", tr: "Mikroçip Montaj Hattı", br: "Linha de Montagem de Microchips", pt: "Linha de Montagem de Microchips" },
    13109: { id: 13109, en: "Production Assembly Hall", de: "Produktionsmontagehalle", fr: "Hall d'assemblage de production", ro: "Hală de Asamblare a Producției", pl: "Hala montażowa produkcji", nl: "Productiemontagehal", es: "Hangar de montaje de producción", it: "Padiglione di assemblaggio della produzione", ru: "Производственный сборочный цех", tr: "Üretim Montaj Holü", br: "Hangar de Montagem de Produção", pt: "Hangar de Montagem de Produção" },
    13110: { id: 13110, en: "High-Performance Synthesiser", de: "Hochleistungssynthetisierer", fr: "Synthétiseur haute performance", ro: "Sintetizator de Înaltă Performanță", pl: "Syntetyzator wysokiej wydajności", nl: "Hoogwaardige synthesizer", es: "Sintetizador de alto rendimiento", it: "Sintetizzatore ad alte prestazioni", ru: "Высокопроизводительный синтезатор", tr: "Yüksek Performanslı Sentezleyici", br: "Sintetizador de Alto Desempenho", pt: "Sintetizador de Alto Desempenho" },
    13111: { id: 13111, en: "Chip Mass Production", de: "Chipmassenproduktion", fr: "Production de puces en série", ro: "Producție de Masă a Cipurilor", pl: "Masowa produkcja czipów", nl: "Chipmassaproductie", es: "Producción masiva de chips", it: "Produzione di chip di massa", ru: "Массовое производство чипов", tr: "Seri Çip Üretimi", br: "Produção em Massa de Chips", pt: "Produção em Massa de Chips" },
    13112: { id: 13112, en: "Nano Repair Bots", de: "Nanoreparaturbots", fr: "Robots de réparation nanoniques", ro: "Nano-Roboți de Reparație", pl: "Nanoboty naprawcze", nl: "Nanoreparatiebots", es: "Nanobots de reparación", it: "Nanorobot di riparazione", ru: "Нанороботы-ремонтники", tr: "Nano Onarım Botları", br: "Nanobots de Reparação", pt: "Nanobots de Reparação" },

    // Kaelesh (14101 - 14112)
    14101: { id: 14101, en: "Sanctuary", de: "Zuflucht", fr: "Sanctuaire", ro: "Sanctuar", pl: "Sanktuarium", nl: "Heiligdom", es: "Santuario", it: "Santuario", ru: "Святилище", tr: "Sığınak", br: "Santuário", pt: "Santuário" },
    14102: { id: 14102, en: "Antimatter Condenser", de: "Antimateriekondensator", fr: "Condenseur d'antimatière", ro: "Condensator de Antimaterie", pl: "Kondensator antymaterii", nl: "Antimateriecondensor", es: "Condensador de antimateria", it: "Condensatore di antimateria", ru: "Конденсатор антиматерии", tr: "Antimadde Yoğuşturucusu", br: "Condensador de Antimatéria", pt: "Condensador de Antimatéria" },
    14103: { id: 14103, en: "Vortex Chamber", de: "Wirbelkammer", fr: "Chambre de vortex", ro: "Cameră Vortex", pl: "Komora wirowa", nl: "Wervelkamer", es: "Cámara de vórtice", it: "Camera del vortice", ru: "Вихревая камера", tr: "Girdap Odası", br: "Câmara de Vórtice", pt: "Câmara de Vórtice" },
    14104: { id: 14104, en: "Halls of Realisation", de: "Hallen der Verwirklichung", fr: "Salles de réalisation", ro: "Halele Realizării", pl: "Sale urzeczywistnienia", nl: "Hallen van realisatie", es: "Salas de realización", it: "Sale della consapevolezza", ru: "Залы осознания", tr: "Farkındalık Salonları", br: "Salões da Consciência", pt: "Salões da Consciência" },
    14105: { id: 14105, en: "Forum of Transcendence", de: "Forum der Transzendenz", fr: "Forum de transcendance", ro: "Forumul Transcendenței", pl: "Forum transcendencji", nl: "Forum van transcendentie", es: "Foro de trascendencia", it: "Forum della trascendenza", ru: "Форум трансцендентности", tr: "Aşkınlık Forumu", br: "Fórum da Transcendência", pt: "Fórum da Transcendência" },
    14106: { id: 14106, en: "Antimatter Convector", de: "Antimateriekonvektor", fr: "Convecteur d'antimatière", ro: "Convector de Antimaterie", pl: "Konwektor antymaterii", nl: "Antimaterieconvector", es: "Convector de antimateria", it: "Convettore di antimateria", ru: "Конвектор антиматерии", tr: "Antimadde Konvektörü", br: "Convector de Antimatéria", pt: "Convector de Antimatéria" },
    14107: { id: 14107, en: "Cloning Laboratory", de: "Klonlabor", fr: "Laboratoire de clonage", ro: "Laborator de Clonare", pl: "Laboratorium klonowania", nl: "Kloonlaboratorium", es: "Laboratorio de clonación", it: "Laboratorio di clonazione", ru: "Лаборатория клонирования", tr: "Klonlama Laboratuvarı", br: "Laboratório de Clonagem", pt: "Laboratório de Clonagem" },
    14108: { id: 14108, en: "Chrysalis Accelerator", de: "Kokonbeschleuniger", fr: "Accélérateur de chrysalide", ro: "Accelerator de Crizalidă", pl: "Akcelerator poczwarek", nl: "Coconversneller", es: "Acelerador de crisálida", it: "Acceleratore di crisalide", ru: "Ускоритель метаморфоз", tr: "Krizalit Hızlandırıcı", br: "Acelerador de Crisálida", pt: "Acelerador de Crisálida" },
    14109: { id: 14109, en: "Bio Modifier", de: "Biowandler", fr: "Bio-modificateur", ro: "Bio-Modificator", pl: "Biomodyfikator", nl: "Biomodificator", es: "Biotransformador", it: "Bio-modificatore", ru: "Биомодификатор", tr: "Biyomodifiyeci", br: "Biotransformador", pt: "Biotransformador" },
    14110: { id: 14110, en: "Psionic Modulator", de: "Psimodulator", fr: "Modulateur psionique", ro: "Modulator Psionic", pl: "Modulator psioniczny", nl: "Psionische modulator", es: "Modulador psiónico", it: "Modulatore psionico", ru: "Псионический модулятор", tr: "Psiyonik Modülatör", br: "Modulador Psiônico", pt: "Modulador Psiónico" },
    14111: { id: 14111, en: "Ship Manufacturing Hall", de: "Schiffsbauzentrum", fr: "Hall de construction de vaisseaux", ro: "Hală de Fabricație a Navelor", pl: "Hala produkcji statków", nl: "Scheepsbouwloods", es: "Hangar de construcción naval", it: "Hangar di costruzione navale", ru: "Сборочный цех кораблей", tr: "Gemi İmalat Salonu", br: "Hangar de Construção de Naves", pt: "Hangar de Construção de Naves" },
    14112: { id: 14112, en: "Supra Refractor", de: "Suprarefraktor", fr: "Supra-réfracteur", ro: "Supra-Refractor", pl: "Suprarefraktor", nl: "Suprarefractor", es: "Suprarrefractor", it: "Sovra-rifrattore", ru: "Супрарефрактор", tr: "Süpra Kırıcı", br: "Super-refrator", pt: "Super-refrator" },

    // === LIFEFORM RESEARCH ===
    // Humans (11201 - 11218)
    11201: { id: 11201, en: "Intergalactic Envoys", de: "Intergalaktische Botschafter", fr: "Émissaires intergalactiques", ro: "Trimiși Intergalactici", pl: "Międzygalaktyczni posłańcy", nl: "Intergalactische gezanten", es: "Emisarios intergalácticos", it: "Emissari intergalattici", ru: "Межгалактические послы", tr: "Galaksilerarası Elçiler", br: "Emissários Intergalácticos", pt: "Emissários Intergalácticos" },
    11202: { id: 11202, en: "High-Performance Extractors", de: "Hochleistungsextraktoren", fr: "Extracteurs haute performance", ro: "Extractoare de Înaltă Performanță", pl: "Wysokowydajne ekstraktory", nl: "Hoogrendements-extractors", es: "Extractores de alto rendimiento", it: "Estrattori ad alte prestazioni", ru: "Высокопроизводительные экстракторы", tr: "Yüksek Performanslı Çıkarıcılar", br: "Extratores de Alto Desempenho", pt: "Extratores de Alto Desempenho" },
    11203: { id: 11203, en: "Fusion Drives", de: "Fusionsantriebe", fr: "Propulsion par fusion", ro: "Motoare de Fuziune", pl: "Napędy fuzyjne", nl: "Fusiemotoren", es: "Motores de fusión", it: "Motori a fusione", ru: "Термоядерные двигатели", tr: "Füzyon Motorları", br: "Propulsores de Fusão", pt: "Motores de Fusão" },
    11204: { id: 11204, en: "Stealth Field Generator", de: "Tarnfeldgenerator", fr: "Générateur de champ d'invisibilité", ro: "Generator de Câmp de Camuflaj", pl: "Generator pola maskującego", nl: "Camouflageveldgenerator", es: "Generador de campo de camuflaje", it: "Generatore di campo occultante", ru: "Генератор маскировочного поля", tr: "Gizleme Alanı Jeneratörü", br: "Gerador de Campo de Ocultamento", pt: "Gerador de Campo de Ocultamento" },
    11205: { id: 11205, en: "Orbital Den", de: "Orbitales Versteck", fr: "Repaire orbital", ro: "Bârlog Orbital", pl: "Kryjówka orbitalna", nl: "Orbitale schuilplaats", es: "Guarida orbital", it: "Covo orbitale", ru: "Орбитальное убежище", tr: "Yörünge Sığınağı", br: "Esconderijo Orbital", pt: "Esconderijo Orbital" },
    11206: { id: 11206, en: "Research AI", de: "Forschungs-KI", fr: "IA de recherche", ro: "IA de Cercetare", pl: "SI badawcza", nl: "Onderzoeks-AI", es: "IA de investigación", it: "IA di ricerca", ru: "Исследовательский ИИ", tr: "Araştırma Yapay Zekası", br: "IA de Pesquisa", pt: "IA de Investigação" },
    11207: { id: 11207, en: "High-Performance Terraformer", de: "Hochleistungsterraformer", fr: "Terraformeur haute performance", ro: "Formator de Sol de Înaltă Performanță", pl: "Wysokowydajny terraformer", nl: "Hoogrendements-terravormer", es: "Terraformer de alto rendimiento", it: "Terraformer ad alte prestazioni", ru: "Высокопроизводительный терраформер", tr: "Yüksek Performanslı Terraformer", br: "Terra-Formador de Alto Desempenho", pt: "Terra-Formador de Alto Desempenho" },
    11208: { id: 11208, en: "Enhanced Production Technologies", de: "Erweiterte Produktionstechnologien", fr: "Technologies de production améliorées", ro: "Tehnologii Îmbunătățite de Producție", pl: "Ulepszone technologie produkcyjne", nl: "Verbeterde productietechnologieën", es: "Tecnologías de producción mejoradas", it: "Tecnologie produttive migliorate", ru: "Улучшенные производственные технологии", tr: "Gelişmiş Üretim Teknolojileri", br: "Tecnologias Avançadas de Produção", pt: "Tecnologias Avançadas de Produção" },
    11209: { id: 11209, en: "Light Fighter Mk II", de: "Leichter Jäger Mk II", fr: "Chasseur léger Mk II", ro: "Vânător Ușor Mk II", pl: "Lekki myśliwiec Mk II", nl: "Licht gevechtsschip Mk II", es: "Cazador ligero Mk II", it: "Caccia leggero Mk II", ru: "Лёгкий истребитель Mk II", tr: "Hafif Avcı Mk II", br: "Caça Ligeiro Mk II", pt: "Caça Ligeiro Mk II" },
    11210: { id: 11210, en: "Cruiser Mk II", de: "Kreuzer Mk II", fr: "Croiseur Mk II", ro: "Crucișător Mk II", pl: "Krążownik Mk II", nl: "Kruiser Mk II", es: "Crucero Mk II", it: "Incrociatore Mk II", ru: "Крейсер Mk II", tr: "Kruvazör Mk II", br: "Cruzador Mk II", pt: "Cruzador Mk II" },
    11211: { id: 11211, en: "Improved Lab Technology", de: "Verbesserte Labortechnologie", fr: "Technologie de laboratoire améliorée", ro: "Tehnologie de Laborator Îmbunătățită", pl: "Ulepszona technologia laboratoryjna", nl: "Verbeterde labtechnologie", es: "Tecnología de laboratorio mejorada", it: "Tecnologia di laboratorio migliorata", ru: "Улучшенная лабораторная технология", tr: "Gelişmiş Laboratuvar Teknolojisi", br: "Tecnologia de Laboratório Melhorada", pt: "Tecnologia Laboratorial Melhorada" },
    11212: { id: 11212, en: "Plasma Terraformer", de: "Plasmaterraformer", fr: "Terraformeur plasma", ro: "Formator de Sol cu Plasmă", pl: "Terraformer plazmowy", nl: "Plasmaterravormer", es: "Terraformer de plasma", it: "Terraformer al plasma", ru: "Плазменный терраформер", tr: "Plazma Terraformer", br: "Terra-Formador de Plasma", pt: "Terra-Formador de Plasma" },
    11213: { id: 11213, en: "Low-Temperature Drives", de: "Niedrigtemperaturantriebe", fr: "Propulsion cryogénique", ro: "Motoare Criogenice", pl: "Napędy niskotemperaturowe", nl: "Lagetemperatuurmotoren", es: "Motores criogénicos", it: "Propulsori a bassa temperatura", ru: "Низкотемпературные двигатели", tr: "Düşük Sıcaklık Motorları", br: "Propulsores Criogênicos", pt: "Propulsores Criogénicos" },
    11214: { id: 11214, en: "Bomber Mk II", de: "Bomber Mk II", fr: "Bombardier Mk II", ro: "Bombardier Mk II", pl: "Bombowiec Mk II", nl: "Bommenwerper Mk II", es: "Bombardero Mk II", it: "Bombardiere Mk II", ru: "Бомбардировщик Mk II", tr: "Bombardıman Gemisi Mk II", br: "Bombardeiro Mk II", pt: "Bombardeiro Mk II" },
    11215: { id: 11215, en: "Destroyer Mk II", de: "Zerstörer Mk II", fr: "Destructeur Mk II", ro: "Distrugător Mk II", pl: "Niszczyciel Mk II", nl: "Vernietiger Mk II", es: "Destructor Mk II", it: "Corazzata Mk II", ru: "Уничтожитель Mk II", tr: "Muhrip Mk II", br: "Destruidor Mk II", pt: "Destruidor Mk II" },
    11216: { id: 11216, en: "Battlecruiser Mk II", de: "Schlachtkreuzer Mk II", fr: "Traqueur Mk II", ro: "Interceptor Mk II", pl: "Pancernik Mk II", nl: "Interceptor Mk II", es: "Acorazado Mk II", it: "Incrociatore da Battaglia Mk II", ru: "Линейный крейсер Mk II", tr: "Fırkateyn Mk II", br: "Interceptador Mk II", pt: "Interceptor Mk II" },
    11217: { id: 11217, en: "Robot Assistants", de: "Roboterassistenten", fr: "Assistants robotiques", ro: "Asistenți Robotici", pl: "Asystenci robotyczni", nl: "Robotassistenten", es: "Asistentes robóticos", it: "Assistenti robotici", ru: "Роботы-ассистенты", tr: "Robot Asistanlar", br: "Assistentes Robóticos", pt: "Assistentes Robóticos" },
    11218: { id: 11218, en: "Supercomputer", de: "Supercomputer", fr: "Superordinateur", ro: "Supercomputer", pl: "Superkomputer", nl: "Supercomputer", es: "Superordenador", it: "Supercomputer", ru: "Суперкомпьютер", tr: "Süper Bilgisayar", br: "Supercomputador", pt: "Supercomputador" },

    // Rock'tal (12201 - 12218)
    12201: { id: 12201, en: "Volcanic Batteries", de: "Vulkanische Batterien", fr: "Batteries volcaniques", ro: "Baterii Vulcanice", pl: "Baterie wulkaniczne", nl: "Vulkanische batterijen", es: "Baterías volcánicas", it: "Batterie vulcaniche", ru: "Вулканические батареи", tr: "Volkanik Bataryalar", br: "Baterias Vulcânicas", pt: "Baterias Vulcânicas" },
    12202: { id: 12202, en: "Acoustic Scanning", de: "Akustische Sondierung", fr: "Sondage acoustique", ro: "Scanare Acustică", pl: "Skanowanie akustyczne", nl: "Akoestisch scannen", es: "Sondeo acústico", it: "Scansione acustica", ru: "Акустическое сканирование", tr: "Akustik Tarama", br: "Varredura Acústica", pt: "Sondagem Acústica" },
    12203: { id: 12203, en: "High Energy Pump Systems", de: "Hochenergie-Pumpsysteme", fr: "Systèmes de pompage à haute énergie", ro: "Sisteme de Pompare de Mare Energie", pl: "Wysokoenergetyczne systemy pomp", nl: "Hoogenergetische pompsystemen", es: "Sistemas de bombeo de alta energía", it: "Sistemi di pompaggio ad alta energia", ru: "Высокоэнергетические насосные системы", tr: "Yüksek Enerjili Pompa Sistemleri", br: "Sistemas de Bombeamento de Alta Energia", pt: "Sistemas de Bombeamento de Alta Energia" },
    12204: { id: 12204, en: "Cargo Hold Expansion (Civilian Ships)", de: "Laderaumerweiterung (Zivile Schiffe)", fr: "Extension de cale (Vaisseaux civils)", ro: "Extindere Cală (Nave Civile)", pl: "Powiększenie ładowni (Statki cywilne)", nl: "Laadruimte-uitbreiding (Civiele schepen)", es: "Ampliación de bodega (Naves civiles)", it: "Espansione stiva (Navi civili)", ru: "Расширение трюмов (Гражданские корабли)", tr: "Kargo Bölmesi Genişletme (Sivil Gemiler)", br: "Expansão de Porão de Carga (Naves Civis)", pt: "Expansão do Porão (Naves Civis)" },
    12205: { id: 12205, en: "Magma-Powered Production", de: "Magmagetriebene Produktion", fr: "Production par magma", ro: "Producție bazată pe Magmă", pl: "Produkcja napędzana magmą", nl: "Magma-aangedreven productie", es: "Producción geotérmica", it: "Produzione alimentata a magma", ru: "Магматическое производство", tr: "Magma Destekli Üretim", br: "Produção Alimentada por Magma", pt: "Produção Alimentada por Magma" },
    12206: { id: 12206, en: "Geothermal Power Plants", de: "Geothermische Kraftwerke", fr: "Centrales géothermiques", ro: "Centrale Geotermale", pl: "Elektrownie geotermalne", nl: "Geothermische energiecentrales", es: "Centrales geotérmicas", it: "Centrali geotermiche", ru: "Геотермальные электростанции", tr: "Jeotermal Enerji Santralleri", br: "Usinas Geotérmicas", pt: "Centrais Geotérmicas" },
    12207: { id: 12207, en: "Depth Sounding", de: "Tiefensondierung", fr: "Sondage en profondeur", ro: "Sondare de Adâncime", pl: "Sondowanie głębinowe", nl: "Dieptesondering", es: "Sondeo de profundidad", it: "Scandaglio di profondità", ru: "Глубинное зондирование", tr: "Derinlik Sondajı", br: "Sondagem em Profundidade", pt: "Sondagem em Profundidade" },
    12208: { id: 12208, en: "Ion Crystal Enhancement (Heavy Fighter)", de: "Ionenkristall-Aufwertung (Schwerer Jäger)", fr: "Amélioration par cristal ionique (Chasseur lourd)", ro: "Îmbunătățire cu Cristale Ionice (Vânător Greu)", pl: "Wzmocnienie kryształami jonowymi (Ciężki myśliwiec)", nl: "Ionkristalversterking (Zwaar gevechtsschip)", es: "Mejora por cristal iónico (Cazador pesado)", it: "Potenziamento a cristalli ionici (Caccia pesante)", ru: "Ионные кристаллы (Тяжёлый истребитель)", tr: "İyon Kristali Geliştirmesi (Ağır Avcı)", br: "Aprimoramento de Cristais Iônicos (Caça Pesado)", pt: "Aprimoramento de Cristais Iónicos (Caça Pesado)" },
    12209: { id: 12209, en: "Improved Stellarator", de: "Verbesserter Stellarator", fr: "Stellarator amélioré", ro: "Stellarator Îmbunătățit", pl: "Ulepszony stellarator", nl: "Verbeterde stellarator", es: "Stellarator mejorado", it: "Stellarator migliorato", ru: "Улучшенный стелларатор", tr: "Gelişmiş Stellaratör", br: "Stellarator Melhorado", pt: "Stellarator Melhorado" },
    12210: { id: 12210, en: "Hardened Diamond Drill Heads", de: "Gehärtete Diamantbohrköpfe", fr: "Têtes de forage en diamant trempé", ro: "Capete de Foraj cu Diamant Ranforsat", pl: "Wzmocnione diamentowe głowice wiertnicze", nl: "Geharde diamanten boorkoppen", es: "Cabezales de diamante endurecido", it: "Teste di perforazione al diamante temprato", ru: "Алмазные буровые коронки", tr: "Sertleştirilmiş Elmas Matkap Uçları", br: "Brocas de Diamante Endurecido", pt: "Brocas de Diamante Endurecido" },
    12211: { id: 12211, en: "Seismic Mining Technology", de: "Seismische Abbautechnik", fr: "Technologie minière sismique", ro: "Tehnologie Minieră Seismică", pl: "Sejsmiczna technologia wydobywcza", nl: "Seismische mijnbouwtechnologie", es: "Tecnología minera sísmica", it: "Tecnologia mineraria sismica", ru: "Сейсмическая технология добычи", tr: "Sismik Madencilik Teknolojisi", br: "Tecnologia de Mineração Sísmica", pt: "Tecnologia Mineira Sísmica" },
    12212: { id: 12212, en: "Magma-Powered Pump Systems", de: "Magmagetriebene Pumpsysteme", fr: "Systèmes de pompage à magma", ro: "Sisteme de Pompare bazate pe Magmă", pl: "Systemy pomp napędzane magmą", nl: "Magma-aangedreven pompsystemen", es: "Sistemas de bombeo por magma", it: "Sistemi di pompaggio a magma", ru: "Магматические насосные системы", tr: "Magma Destekli Pompa Sistemleri", br: "Sistemas de Bombeamento por Magma", pt: "Sistemas de Bombeamento por Magma" },
    12213: { id: 12213, en: "Ion Crystal Modules", de: "Ionenkristall-Module", fr: "Modules de cristal ionique", ro: "Module de Cristale Ionice", pl: "Moduły kryształów jonowych", nl: "Ionkristalmodules", es: "Módulos de cristal iónico", it: "Moduli a cristalli ionici", ru: "Модули ионных кристаллов", tr: "İyon Kristali Modülleri", br: "Módulos de Cristais Iônicos", pt: "Módulos de Cristais Iónicos" },
    12214: { id: 12214, en: "Optimised Silo Construction Method", de: "Optimierte Silobauweise", fr: "Méthode de construction de silo optimisée", ro: "Metodă Optimizată de Construcție Silozuri", pl: "Zoptymalizowana konstrukcja silosów", nl: "Geoptimaliseerde silobouw", es: "Construcción optimizada de silos", it: "Costruzione ottimizzata dei silos", ru: "Оптимизированное строительство хранилищ", tr: "Optimize Silo İnşa Yöntemi", br: "Método Otimizado de Construção de Silos", pt: "Construção Otimizada de Silos" },
    12215: { id: 12215, en: "Diamond Energy Transmitter", de: "Diamant-Energieübertrager", fr: "Transmetteur d'énergie en diamant", ro: "Transmițător de Energie cu Diamant", pl: "Diamentowy przekaźnik energii", nl: "Diamanten energiezender", es: "Transmisor de energía de diamante", it: "Trasmettitore di energia al diamante", ru: "Алмазный передатчик энергии", tr: "Elmas Enerji Vericisi", br: "Transmissor de Energia de Diamante", pt: "Transmissor de Energia de Diamante" },
    12216: { id: 12216, en: "Obsidian Shield Reinforcement", de: "Obsidianschild-Verstärkung", fr: "Renforcement de bouclier en obsidienne", ro: "Consolidare Scut cu Obsidian", pl: "Obsydianowe wzmocnienie tarczy", nl: "Obsidiaanschildversterking", es: "Refuerzo de escudo de obsidiana", it: "Rinforzo scudi in ossidiana", ru: "Обсидиановое усиление щитов", tr: "Obsidyen Kalkan Güçlendirmesi", br: "Reforço de Escudo de Obsidiana", pt: "Reforço de Escudo de Obsidiana" },
    12217: { id: 12217, en: "Rune Shields", de: "Runenschilde", fr: "Boucliers runiques", ro: "Scuturi Runice", pl: "Tarcze runiczne", nl: "Runenschilden", es: "Escudos rúnicos", it: "Scudi runici", ru: "Рунические щиты", tr: "Rün Kalkanları", br: "Escudos Rúnicos", pt: "Escudos Rúnicos" },
    12218: { id: 12218, en: "Rock’tal Collector Enhancement", de: "Rock’tal-Kollektoraufwertung", fr: "Amélioration de collecteur Rock’tal", ro: "Îmbunătățire Colecționar Rock’tal", pl: "Wzmocnienie zbieracza Rock’tal", nl: "Rock’tal-verzamelaarsverbetering", es: "Mejora de recolector Rock’tal", it: "Potenziamento Collezionista Rock’tal", ru: "Усиление коллекционера Рок'тал", tr: "Rock’tal Toplayıcı Geliştirmesi", br: "Aprimoramento de Coletor Rock’tal", pt: "Aprimoramento de Colecionador Rock’tal" },

    // Mechas (13201 - 13218)
    13201: { id: 13201, en: "Catalyser Technology", de: "Katalysatortechnik", fr: "Technologie catalytique", ro: "Tehnologia Catalizatorilor", pl: "Technologia katalizatorów", nl: "Katalysatortechnologie", es: "Tecnología catalizadora", it: "Tecnologia catalizzatrice", ru: "Катализаторная технология", tr: "Katalizör Teknolojisi", br: "Tecnologia de Catalisadores", pt: "Tecnologia de Catalisadores" },
    13202: { id: 13202, en: "Plasma Drive", de: "Plasmaantrieb", fr: "Propulsion plasma", ro: "Motor cu Plasmă", pl: "Napęd plazmowy", nl: "Plasma-aandrijving", es: "Propulsor de plasma", it: "Propulsore al plasma", ru: "Плазменный двигатель", tr: "Plazma Motoru", br: "Propulsor de Plasma", pt: "Propulsor de Plasma" },
    13203: { id: 13203, en: "Efficiency Module", de: "Effizienzmodul", fr: "Module d'efficacité", ro: "Modul de Eficiență", pl: "Moduł wydajności", nl: "Efficiëntiemodule", es: "Módulo de eficiencia", it: "Modulo di efficienza", ru: "Модуль эффективности", tr: "Verimlilik Modülü", br: "Módulo de Eficiência", pt: "Módulo de Eficiência" },
    13204: { id: 13204, en: "Depot AI", de: "Depot-KI", fr: "IA de dépôt", ro: "IA de Depozit", pl: "SI magazynowa", nl: "Depot-AI", es: "IA de almacén", it: "IA del deposito", ru: "ИИ хранилищ", tr: "Depo Yapay Zekası", br: "IA de Depósito", pt: "IA de Depósito" },
    13205: { id: 13205, en: "General Overhaul (Light Fighter)", de: "Generalüberholung (Leichter Jäger)", fr: "Révision générale (Chasseur léger)", ro: "Revizie Generală (Vânător Ușor)", pl: "Remont generalny (Lekki myśliwiec)", nl: "Grote revisie (Licht gevechtsschip)", es: "Revisión general (Cazador ligero)", it: "Revisione generale (Caccia leggero)", ru: "Капитальный ремонт (Лёгкий истребитель)", tr: "Genel Revizyon (Hafif Avcı)", br: "Revisão Geral (Caça Ligeiro)", pt: "Revisão Geral (Caça Ligeiro)" },
    13206: { id: 13206, en: "Automated Transport Lines", de: "Automatisierte Transportlinien", fr: "Lignes de transport automatisées", ro: "Linii de Transport Automatizate", pl: "Zautomatyzowane linie transportowe", nl: "Geautomatiseerde transportlijnen", es: "Líneas de transporte automatizadas", it: "Linee di trasporto automatizzate", ru: "Автоматизированные транспортные линии", tr: "Otomatik Nakliye Hatları", br: "Linhas Automatizadas de Transporte", pt: "Linhas Automatizadas de Transporte" },
    13207: { id: 13207, en: "Improved Drone AI", de: "Verbesserte Drohnen-KI", fr: "IA de drone améliorée", ro: "IA de Drone Îmbunătățită", pl: "Ulepszona SI dronów", nl: "Verbeterde drone-AI", es: "IA de drones mejorada", it: "IA dei droni migliorata", ru: "Улучшенный ИИ дронов", tr: "Gelişmiş Dron Yapay Zekası", br: "IA de Drones Aprimorada", pt: "IA de Drones Aprimorada" },
    13208: { id: 13208, en: "Experimental Recycling Technology", de: "Experimentelle Recyclingtechnik", fr: "Technologie de recyclage expérimentale", ro: "Tehnologie Experimentală de Reciclare", pl: "Eksperymentalna technologia recyklingu", nl: "Experimentele recyclingtechniek", es: "Tecnología de reciclaje experimental", it: "Tecnologia sperimentale di riciclaggio", ru: "Экспериментальная утилизация", tr: "Deneysel Geri Dönüşüm Teknolojisi", br: "Tecnologia Experimental de Reciclagem", pt: "Tecnologia Experimental de Reciclagem" },
    13209: { id: 13209, en: "General Overhaul (Cruiser)", de: "Generalüberholung (Kreuzer)", fr: "Révision générale (Croiseur)", ro: "Revizie Generală (Crucișător)", pl: "Remont generalny (Krążownik)", nl: "Grote revisie (Kruiser)", es: "Revisión general (Crucero)", it: "Revisione generale (Incrociatore)", ru: "Капитальный ремонт (Крейсер)", tr: "Genel Revizyon (Kruvazör)", br: "Revisão Geral (Cruzador)", pt: "Revisão Geral (Cruzador)" },
    13210: { id: 13210, en: "Slingshot Autopilot", de: "Slingshot-Autopilot", fr: "Pilote automatique à fronde", ro: "Pilot Automat Slingshot", pl: "Autopilot z procą grawitacyjną", nl: "Slingshot-stuurautomaat", es: "Piloto automático por efecto honda", it: "Pilota automatico gravitazionale", ru: "Гравитационный автопилот", tr: "Sapan Otopilotu", br: "Piloto Automático Gravitacional", pt: "Piloto Automático Gravitacional" },
    13211: { id: 13211, en: "High-Temperature Superconductors", de: "Hochtemperatur-Supraleiter", fr: "Supraconducteurs haute température", ro: "Supraconductori de Mare Temperatură", pl: "Nadprzewodniki wysokotemperaturowe", nl: "Supergeleiders voor hoge temperaturen", es: "Superconductores de alta temperatura", it: "Superconduttori ad alta temperatura", ru: "Высокотемпературные сверхпроводники", tr: "Yüksek Sıcaklık Süperiletkenleri", br: "Supercondutores de Alta Temperatura", pt: "Supercondutores de Alta Temperatura" },
    13212: { id: 13212, en: "General Overhaul (Battleship)", de: "Generalüberholung (Schlachtschiff)", fr: "Révision générale (Vaisseau de bataille)", ro: "Revizie Generală (Navă de Război)", pl: "Remont generalny (Okręt wojenny)", nl: "Grote revisie (Slagschip)", es: "Revisión general (Nave de batalla)", it: "Revisione generale (Nave da battaglia)", ru: "Капитальный ремонт (Линкор)", tr: "Genel Revizyon (Komuta Gemisi)", br: "Revisão Geral (Nave de Batalha)", pt: "Revisão Geral (Nave de Batalha)" },
    13213: { id: 13213, en: "Artificial Swarm Intelligence", de: "Künstliche Schwarmintelligenz", fr: "Intelligence collective artificielle", ro: "Inteligență Artificială de Roi", pl: "Sztuczna inteligencja roju", nl: "Kunstmatige zwermintelligentie", es: "Inteligencia artificial de enjambre", it: "Intelligenza di sciame artificiale", ru: "Искусственный интеллект роя", tr: "Yapay Sürü Zekası", br: "Inteligência Artificial de Enxame", pt: "Inteligência Artificial de Enxame" },
    13214: { id: 13214, en: "General Overhaul (Battlecruiser)", de: "Generalüberholung (Schlachtkreuzer)", fr: "Révision générale (Traqueur)", ro: "Revizie Generală (Interceptor)", pl: "Remont generalny (Pancernik)", nl: "Grote revisie (Interceptor)", es: "Revisión general (Acorazado)", it: "Revisione generale (Incrociatore da battaglia)", ru: "Капитальный ремонт (Линейный крейсер)", tr: "Genel Revizyon (Fırkateyn)", br: "Revisão Geral (Interceptador)", pt: "Revisão Geral (Interceptor)" },
    13215: { id: 13215, en: "General Overhaul (Bomber)", de: "Generalüberholung (Bomber)", fr: "Révision générale (Bombardier)", ro: "Revizie Generală (Bombardier)", pl: "Remont generalny (Bombowiec)", nl: "Grote revisie (Bommenwerper)", es: "Revisión general (Bombardero)", it: "Revisione generale (Bombardiere)", ru: "Капитальный ремонт (Бомбардировщик)", tr: "Genel Revizyon (Bombardıman Gemisi)", br: "Revisão Geral (Bombardeiro)", pt: "Revisão Geral (Bombardeiro)" },
    13216: { id: 13216, en: "General Overhaul (Destroyer)", de: "Generalüberholung (Zerstörer)", fr: "Révision générale (Destructeur)", ro: "Revizie Generală (Distrugător)", pl: "Remont generalny (Niszczyciel)", nl: "Grote revisie (Vernietiger)", es: "Revisión general (Destructor)", it: "Revisione generale (Corazzata)", ru: "Капитальный ремонт (Уничтожитель)", tr: "Genel Revizyon (Muhrip)", br: "Revisão Geral (Destruidor)", pt: "Revisão Geral (Destruidor)" },
    13217: { id: 13217, en: "Experimental Weapons Technology", de: "Experimentelle Waffentechnik", fr: "Technologie d'armement expérimentale", ro: "Tehnologie Experimentală a Armelor", pl: "Eksperymentalna technologia bojowa", nl: "Experimentele wapentechnologie", es: "Tecnología militar experimental", it: "Tecnologia bellica sperimentale", ru: "Экспериментальная оружейная технология", tr: "Deneysel Silah Teknolojisi", br: "Tecnologia de Armas Experimental", pt: "Tecnologia de Armas Experimental" },
    13218: { id: 13218, en: "Mechan General Enhancement", de: "Mecha-Generalaufwertung", fr: "Amélioration de général Méca", ro: "Îmbunătățire General Mecha", pl: "Wzmocnienie generała Mecha", nl: "Mecha-generaalverbetering", es: "Mejora de general Mecha", it: "Potenziamento Generale Mecha", ru: "Усиление генерала Мехов", tr: "Mecha General Geliştirmesi", br: "Aprimoramento de General Mecha", pt: "Aprimoramento de General Mecha" },

    // Kaelesh (14201 - 14218)
    14201: { id: 14201, en: "Heat Recovery", de: "Wärmerückgewinnung", fr: "Récupération de chaleur", ro: "Recuperare de Căldură", pl: "Odzyskiwanie ciepła", nl: "Warmteterugwinning", es: "Recuperación de calor", it: "Recupero di calore", ru: "Рекуперация тепла", tr: "Isı Geri Kazanımı", br: "Recuperação de Calor", pt: "Recuperação de Calor" },
    14202: { id: 14202, en: "Sulphide Process", de: "Sulfid-Verfahren", fr: "Procédé au sulfure", ro: "Proces cu Sulfuri", pl: "Proces siarczkowy", nl: "Sulfidisch proces", es: "Proceso de sulfuro", it: "Processo al solfuro", ru: "Сульфидный процесс", tr: "Sülfür Süreci", br: "Processamento de Sulfetos", pt: "Processamento de Sulfetos" },
    14203: { id: 14203, en: "Psionic Network", de: "Psionisches Netzwerk", fr: "Réseau psionique", ro: "Rețea Psionică", pl: "Sieć psioniczna", nl: "Psionisch netwerk", es: "Red psiónica", it: "Rete psionica", ru: "Псионическая сеть", tr: "Psiyonik Ağ", br: "Rede Psiônica", pt: "Rede Psiónica" },
    14204: { id: 14204, en: "Telekinetic Tractor Beam", de: "Telekinetischer Traktorstrahl", fr: "Rayon tracteur télékinétique", ro: "Rază Tractoare Telechinetică", pl: "Telekinetyczny promień ściągający", nl: "Telekinetische trekstraal", es: "Rayo tractor telequinético", it: "Raggio traente telecinetico", ru: "Телекинетический луч захвата", tr: "Telekinetik Çekici Işın", br: "Raio Trator Telecinético", pt: "Raio Trator Telecinético" },
    14205: { id: 14205, en: "Enhanced Sensor Technology", de: "Erweiterte Sensortechnik", fr: "Technologie de capteur améliorée", ro: "Tehnologie Avansată a Senzorilor", pl: "Ulepszona technologia czujników", nl: "Verbeterde sensortechnologie", es: "Tecnología de sensores mejorada", it: "Tecnologia avanzata dei sensori", ru: "Улучшенные сенсоры", tr: "Gelişmiş Sensör Teknolojisi", br: "Tecnologia de Sensores Avançada", pt: "Tecnologia de Sensores Avançada" },
    14206: { id: 14206, en: "Neuromodal Compressor", de: "Neuromodaler Kompressor", fr: "Compresseur neuromodal", ro: "Compresor Neuromodal", pl: "Kompresor neuromodalny", nl: "Neuromodale compressor", es: "Compresor neuromodal", it: "Compressore neuromodale", ru: "Нейромодальный компрессор", tr: "Nöromodal Kompresör", br: "Compressor Neuromodal", pt: "Compressor Neuromodal" },
    14207: { id: 14207, en: "Neuro-Interface", de: "Neuro-Schnittstelle", fr: "Interface neuronale", ro: "Interfață Neuronală", pl: "Interfejs neuronowy", nl: "Neuro-interface", es: "Neurointerfaz", it: "Interfaccia neurale", ru: "Нейроинтерфейс", tr: "Nöro-Arayüz", br: "Neuro-interface", pt: "Neuro-interface" },
    14208: { id: 14208, en: "Interplanetary Analysis Network", de: "Interplanetares Analysenetzwerk", fr: "Réseau d'analyse interplanétaire", ro: "Rețea Interplanetară de Analiză", pl: "Międzyplanetarna sieć analityczna", nl: "Interplanetair analysenetwerk", es: "Red de análisis interplanetario", it: "Rete di analisi interplanetaria", ru: "Межпланетная сеть анализа", tr: "Gezegenlerarası Analiz Ağı", br: "Rede Interplanetária de Análises", pt: "Rede Interplanetária de Análise" },
    14209: { id: 14209, en: "Overclocking (Heavy Fighter)", de: "Übertaktung (Schwerer Jäger)", fr: "Surcadençage (Chasseur lourd)", ro: "Supratactare (Vânător Greu)", pl: "Podkręcanie (Ciężki myśliwiec)", nl: "Overklokken (Zwaar gevechtsschip)", es: "Overclocking (Cazador pesado)", it: "Overclock (Caccia pesante)", ru: "Разгон (Тяжёлый истребитель)", tr: "Hız Aşırtma (Ağır Avcı)", br: "Overclocking (Caça Pesado)", pt: "Overclocking (Caça Pesado)" },
    14210: { id: 14210, en: "Telekinetic Drive", de: "Telekinetischer Antrieb", fr: "Propulsion télékinétique", ro: "Motor Telechinetic", pl: "Napęd telekinetyczny", nl: "Telekinetische aandrijving", es: "Propulsor telequinético", it: "Propulsore telecinetico", ru: "Телекинетический привод", tr: "Telekinetik Sürücü", br: "Propulsor Telecinético", pt: "Propulsor Telecinético" },
    14211: { id: 14211, en: "Sixth Sense", de: "Sechster Sinn", fr: "Sixième sens", ro: "Al Șaselea Simț", pl: "Szósty zmysł", nl: "Zesde zintuig", es: "Sexto sentido", it: "Sesto senso", ru: "Шестое чувство", tr: "Altıncı His", br: "Sexto Sentido", pt: "Sexto Sentido" },
    14212: { id: 14212, en: "Psychoharmoniser", de: "Psychoharmonisierer", fr: "Psychoharmoniseur", ro: "Psihoarmonizator", pl: "Psychoharmonizator", nl: "Psychoharmonisator", es: "Psicoarmonizador", it: "Psicoarmonizzatore", ru: "Психогармонизатор", tr: "Psikouyumlayıcı", br: "Psico-harmonizador", pt: "Psico-harmonizador" },
    14213: { id: 14213, en: "Efficient Swarm Intelligence", de: "Effiziente Schwarmintelligenz", fr: "Intelligence collective efficace", ro: "Inteligență Eficientă de Roi", pl: "Wydajna inteligencja roju", nl: "Efficiënte zwermintelligentie", es: "Inteligencia de enjambre eficiente", it: "Intelligenza di sciame efficiente", ru: "Эффективный интеллект роя", tr: "Verimli Sürü Zekası", br: "Inteligência de Enxame Eficiente", pt: "Inteligência de Enxame Eficiente" },
    14214: { id: 14214, en: "Overclocking (Large Cargo)", de: "Übertaktung (Großer Transporter)", fr: "Surcadençage (Grand transporteur)", ro: "Supratactare (Transportor Mare)", pl: "Podkręcanie (Duży transporter)", nl: "Overklokken (Groot vrachtschip)", es: "Overclocking (Nave grande de carga)", it: "Overclock (Cargo pesante)", ru: "Разгон (Большой транспорт)", tr: "Hız Aşırtma (Büyük Nakliye Gemisi)", br: "Overclocking (Cargueiro Grande)", pt: "Overclocking (Cargueiro Grande)" },
    14215: { id: 14215, en: "Gravitation Sensors", de: "Gravitationssensoren", fr: "Capteurs de gravitation", ro: "Senzori Gravitaționali", pl: "Czujniki grawitacyjne", nl: "Zwaartekrachtsensoren", es: "Sensores gravitacionales", it: "Sensori gravitazionali", ru: "Гравитационные датчики", tr: "Yerçekimi Sensörleri", br: "Sensores de Gravitação", pt: "Sensores de Gravitação" },
    14216: { id: 14216, en: "Overclocking (Battleship)", de: "Übertaktung (Schlachtschiff)", fr: "Surcadençage (Vaisseau de bataille)", ro: "Supratactare (Navă de Război)", pl: "Podkręcanie (Okręt wojenny)", nl: "Overklokken (Slagschip)", es: "Overclocking (Nave de batalla)", it: "Overclock (Nave da battaglia)", ru: "Разгон (Линкор)", tr: "Hız Aşırtma (Komuta Gemisi)", br: "Overclocking (Nave de Batalha)", pt: "Overclocking (Nave de Batalha)" },
    14217: { id: 14217, en: "Psionic Shield Matrix", de: "Psionische Schildmatrix", fr: "Matrice de bouclier psionique", ro: "Matrice de Scut Psionic", pl: "Psioniczna matryca osłon", nl: "Psionische schildmatrix", es: "Matriz de escudo psiónico", it: "Matrice di scudi psionici", ru: "Псионическая матрица щита", tr: "Psiyonik Kalkan Matrisi", br: "Matriz de Escudo Psiônico", pt: "Matriz de Escudo Psiónico" },
    14218: { id: 14218, en: "Kaelesh Discoverer Enhancement", de: "Kaelesh-Entdeckeraufwertung", fr: "Amélioration d'explorateur Kaelesh", ro: "Îmbunătățire Explorator Kaelesh", pl: "Wzmocnienie odkrywcy Kaelesh", nl: "Kaelesh-ontdekkersverbetering", es: "Mejora de descubridor Kaelesh", it: "Potenziamento Esploratore Kaelesh", ru: "Усиление первооткрывателя Каэлеш", tr: "Kaelesh Kaşif Geliştirmesi", br: "Aprimoramento de Explorador Kaelesh", pt: "Aprimoramento de Explorador Kaelesh" }
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
