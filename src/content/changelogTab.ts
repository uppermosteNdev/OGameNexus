// ==========================================================================
// OGame Nexus - In-Game Changelog & Support Tab inside Messages / News Feed
// ==========================================================================

import { SupportedLanguage, detectLanguageFromServerLink } from '../i18n';

export interface ChangelogItem {
  type: 'Feature' | 'Bugfix' | 'Data' | 'Polishing' | 'External';
  text: string;
}

export interface ChangelogVersion {
  version: string;
  items: ChangelogItem[];
}

export const NEXUS_CHANGELOGS_I18N: Record<SupportedLanguage, ChangelogVersion[]> = {
  en: [
    {
      version: 'v1.2.9',
      items: [
        { type: 'Feature', text: 'Note Taking for Coordinates and Players: Click any slot number in Galaxy View to record and view notes for coordinates and players, with category tagging, timeline history, and on-demand Personal Vault sync.' },
        { type: 'Feature', text: 'Alliance Top / Flop of the Day: Automated daily 24-hour point gain and loss rankings for your alliance with customizable tactical HUD themes, backgrounds, and Discord bot image integration.' },
        { type: 'Feature', text: 'Universe Map to Player Activity Link: One-click navigation from any player on the Overwatch Universe Map directly into their comprehensive activity heatmap and timeline.' },
        { type: 'Feature', text: 'Empire Daily Yield Customization: Fine-tune what counts towards your empire daily yield, with custom scrap merchant percentages and selectable income sources.' },
        { type: 'Bugfix', text: 'Multi-Extension Activity Tracking: Fixed galaxy activity detection conflicts when running alongside other popular browser extensions (OGLight, AGR, etc.).' },
        { type: 'Bugfix', text: 'Multi-Extension Status Tracking: Corrected player status parsing (inactive, vacation, outlaw) during live galaxy views with other extensions installed.' }
      ]
    },
    {
      version: 'v1.2.8',
      items: [
        { type: 'Feature', text: 'Overwatch Universe Map: New alliance networks now automatically start with the entire universe map loaded with all players, planets, and moons.' },
        { type: 'Feature', text: 'Overwatch Beta Access: Request Closed Beta access directly in-game, and customize your alliance tag during setup.' },
        { type: 'Feature', text: 'Sleeker Support Banner: Quick access to donations and free support options at the top of the Update Center.' },
        { type: 'Bugfix', text: 'Costs Planner Multi-Account Fix: Fixed shopping cart items mixing up between different accounts during cloud sync.' },
        { type: 'Bugfix', text: 'Lifeform Levels in Planner: Upgrade costs now accurately use your planet’s real lifeform building levels.' },
        { type: 'Polishing', text: 'Name Corrections: Fixed building and research names across all languages to match the game.' },
        { type: 'Polishing', text: 'Language Settings: Changing languages now updates instantly and remembers your choice.' }
      ]
    },
    {
      version: 'v1.2.7',
      items: [
        { type: 'Feature', text: 'Multi-Language Support: Nexus is now available in 12 languages with an easy language selector in the dashboard header, settings, and in-game messages.' },
        { type: 'Feature', text: 'Costs Planner All Planets & Cart Editing: Add upgrades across all planets with one click, and edit desired levels directly inside your shopping cart.' },
        { type: 'Feature', text: 'Astrophysics Payback Calculator: Calculate payback times and payoff speed for unlocking new colony slots through Astrophysics in the Amortization tool.' },
        { type: 'Feature', text: 'Scrap Merchant Overhaul: Redesigned scrap calculation tool with accurate resource returns and full fleet mission support.' },
        { type: 'Bugfix', text: 'Sensor Phalanx Moon Count: Corrected moon count and sensor phalanx coverage mapping across all sectors.' },
        { type: 'Bugfix', text: 'Overwatch Galaxy Sync & Live Feed [Closed Beta]: Fixed new colony and moon alerts on the live universe feed, and corrected player class displays.' }
      ]
    },
    {
      version: 'v1.2.6',
      items: [
        { type: 'Feature', text: 'Overwatch Sensor Phalanx [Closed Beta]: Tactical sensor grid showing the scan range of all alliance moons across the galaxy, with circular universe wrap-around mapping.' },
        { type: 'Feature', text: 'Individual Resource Payback Calculator: Calculate investment return times separately for Metal, Crystal, or Deuterium with customizable goals and instant ROI updates.' },
        { type: 'Feature', text: 'Multi-Account Switcher: Easily switch between all your universe accounts directly from the bottom-left command dock without losing your active view.' },
        { type: 'Feature', text: 'Live Galaxy Feed Unread Badge [Closed Beta]: Real-time counter on the Universe Intel tab alerting you immediately when new player movements or alliance events occur.' },
        { type: 'Bugfix', text: 'Circular Universe Flight Distances: Corrected shortest flight routes and distance calculations for circular/donut universes in Raid Radar and Phalanx scans.' },
        { type: 'Bugfix', text: 'Overwatch Stability Improvements [Closed Beta]: Resolved view crashes when loading alliance tabs and ensured clean display states in 1v1 duels.' },
        { type: 'Bugfix', text: 'Live Player Comparison Highscores: Comparing players now immediately updates with their latest live rankings.' },
        { type: 'Bugfix', text: 'Accurate Galaxy Activity Alerts: Fixed false notifications for planet abandonment, colonization, and player status changes.' },
        { type: 'Bugfix', text: 'Origin Coordinates Protection: Protected origin system coordinates (1:1) and administrator accounts from triggering false galaxy alerts.' },
        { type: 'Bugfix', text: 'Vacation Mode & Moon Safeguards: Prevented accounts in vacation mode and planets with active moons from being mistakenly reported as abandoned.' }
      ]
    },
    {
      version: 'v1.2.5',
      items: [
        { type: 'Feature', text: 'Nexus Overwatch [Closed Beta]: Alliance intelligence sharing, live universe activity, and multi-device cloud backup.' },
        { type: 'Feature', text: 'Multi-Device Personal Vault: Secure cloud backup and cross-device sync for expeditions, combats, debris harvests, and costs planner via your private Vault Key.' },
        { type: 'Feature', text: 'Raid Radar Inactive Target Scout: Scan the universe for prime unmonitored inactive farming targets sorted by rank and distance from your colonies.' },
        { type: 'Feature', text: 'Research Time Optimizer: Dedicated tool to calculate exact research durations, optimal lab levels, and IRN breakpoints.' },
        { type: 'Bugfix', text: 'Raid Radar Live Status: Target inactive/active statuses now immediately update from live galaxy scans so you never raid targets that became active.' },
        { type: 'Bugfix', text: 'Raid Radar Non-Destructive Sync: Guaranteed safe target resolution during multi-device synchronization to prevent any target deletion.' },
        { type: 'Bugfix', text: 'Flying Ships in Scrap Tool: Fleets currently on missions are now fully accounted for in Scraptool and fleet capacity breakdowns.' },
        { type: 'Bugfix', text: 'Costs Planner Resource Packs: Fixed resource pack calculations and cart import behavior when planning large empire goals.' },
        { type: 'Polishing', text: 'Message Processing Pipeline: Cleaner message metadata processing and extended in-game UI box enhancements.' }
      ]
    },
    {
      version: 'v1.2.4',
      items: [
        { type: 'Feature', text: 'Raid Helper Min MSU Filter: Exponential 0–1B slider with editable value to filter and dim inactive planets below your desired Resource MSU in Raid Helper & Galaxy view.' },
        { type: 'Bugfix', text: 'Collector & Crawler Calculations: Fixed 50% mine bonus hard cap, overload %, geologist multiplier (8.8x/8.0x), and empire-wide Rock\'tal T18 Collector boost.' },
        { type: 'Feature', text: 'Ongoing Upgrades in Amortization & Overseer: Active building and research queues now display live countdown timers in Amortization To-Do and the Overseer bar.' },
        { type: 'Polishing', text: 'Costs Planner Gather Times: Total and Remaining Gather Times now accurately calculate using shopping cart MSU cost and total empire resources divided by Empire Daily Yield.' },
        { type: 'Bugfix', text: 'Language-Agnostic Queues: Fixed building and research queue scraping across all non-English OGame servers.' },
        { type: 'Bugfix', text: 'Alliance Shared Expeditions: Prevented shared alliance expedition reports from being counted in personal stats.' },
        { type: 'Polishing', text: 'Background Sync: Removed redundant CP calls from background workers.' }
      ]
    },
    {
      version: 'v1.2.3',
      items: [
        { type: 'Feature', text: 'Instant Multi-Page Message Scanning: Opening Expeditions or Combat Reports tabs automatically imports and saves all pending reports across all pages in 1 background shot without needing to click through pagination.' },
        { type: 'Bugfix', text: 'Full Moon Background Synchronization: Background and manual sync now correctly synchronizes all moons (resources, fleets, defenses, lunar base, phalanx, jump gate, and active items) directly alongside planets.' },
        { type: 'Feature', text: 'Nexus Overseer Mouse Wheel Navigation: Scroll directly over the Overseer bar or click the animated mouse scroll indicator to cycle forward and backward through all empire alerts.' },
        { type: 'Feature', text: 'Integrated In-Game OGNexus Changelog & Support Tab inside Messages.' },
        { type: 'Polishing', text: 'Empire Daily Yield Calculation Formula: Added interactive info breakdown tooltip next to Empire Daily Yield in Overview.' },
        { type: 'Polishing', text: 'Dynamic Rolling Yield for < 7 Days: Fixed daily average yield divisor to calculate accurately on newly tracked or freshly imported accounts.' },
        { type: 'Polishing', text: 'Synchronized Amortization ROI recommendations and conversion rates between Dashboard and Nexus Overseer.' },
        { type: 'Bugfix', text: 'Fixed cross-account speedup item inventory leakage across multi-account tabs.' },
        { type: 'Bugfix', text: 'Crawlers & Production Calculations: Fixed scraping, saving, and calculation of production percentages (Metal/Crystal/Deuterium Mines, Fusion Reactor, Solar Satellites, and Crawlers overload up to 150%) across the Nexus Terminal Production tab and Amortization Engine.' },
        { type: 'Bugfix', text: "Expedition & Today's Bounty Tracking: Fixed race condition where concurrent multi-page background scans and active tab message scraping caused newly tracked expeditions/discoveries to duplicate counts, and added full Trader, delay/speedup, item, and combat breakdown into the expanded Direct Bounty view." },
        { type: 'Polishing', text: 'Added live countdown ticking badges for ongoing planetary and research queues in Amortization Dashboard.' }
      ]
    }
  ],
  ro: [
    {
      version: 'v1.2.9',
      items: [
        { type: 'Feature', text: 'Notițe pentru coordonate și jucători: Apasă pe numărul oricărei poziții din Galaxie pentru a adăuga și vizualiza notițe pentru coordonate și jucători, cu etichete pe categorii și istoric complet.' },
        { type: 'Feature', text: 'Top / Flop Alianță: Clasamente zilnice automate pe 24h cu punctele câștigate și pierdute, teme tactice HUD personalizabile și imagini pentru Discord.' },
        { type: 'Feature', text: 'Legătură directă Hartă -> Activitate jucător: Navigare rapidă cu un singur clic din Harta universului direct în istoricul de activitate al jucătorului.' },
        { type: 'Feature', text: 'Personalizare Producție zilnică imperiu: Alege ce surse intră în calculul producției zilnice și configurează procentul returnat de Negustorul de fier vechi.' },
        { type: 'Bugfix', text: 'Urmărire activitate cu alte extensii: Rezolvat conflictele de detectare a activității în galaxie când sunt active și alte extensii (OGLight, AGR etc.).' },
        { type: 'Bugfix', text: 'Urmărire status jucători cu alte extensii: Corectat sincronizarea statusurilor (inactiv, vacanță, bandit) în timpul scanărilor din galaxie.' }
      ]
    },
    {
      version: 'v1.2.8',
      items: [
        { type: 'Feature', text: 'Harta universului în Overwatch: Alianțele noi pornesc acum cu întreaga hartă a universului gata încărcată (toți jucătorii, planetele și lunile).' },
        { type: 'Feature', text: 'Acces Beta Overwatch: Poți cere acces la Closed Beta direct din joc și poți personaliza tag-ul alianței la creare.' },
        { type: 'Feature', text: 'Bara de susținere nouă: Acces rapid la donații și opțiuni de susținere gratuită în partea de sus a Centrului de actualizări.' },
        { type: 'Bugfix', text: 'Coșul Planificatorului multi-cont: Rezolvată problema unde articolele din coș se amestecau între conturi diferite la sincronizare.' },
        { type: 'Bugfix', text: 'Forme de viață în Planificator: Costurile calculează acum corect nivelurile reale ale clădirilor de forme de viață.' },
        { type: 'Polishing', text: 'Corecții de denumiri: Numele clădirilor și cercetărilor se potrivesc acum exact cu cele din joc în toate limbile.' },
        { type: 'Polishing', text: 'Schimbare limbă: Schimbarea limbii se aplică acum instant și se salvează corect.' }
      ]
    },
    {
      version: 'v1.2.7',
      items: [
        { type: 'Feature', text: 'Suport multi-lingvistic: Nexus este acum tradus în 12 limbi, cu un selector rapid în bara de navigare, setări și mesaje din joc.' },
        { type: 'Feature', text: 'Planificator de costuri pentru toate planetele și editare coș: Adaugă clădiri pe toate planetele cu un singur clic și modifică nivelurile dorite direct în coșul de cumpărături.' },
        { type: 'Feature', text: 'Calculator de amortizare Astrofizică: Calculează perioada de amortizare și rentabilitatea pentru deblocarea noilor colonii prin Astrofizică în instrumentul Amortizare.' },
        { type: 'Feature', text: 'Actualizare Negustor de fier vechi: Instrument complet refăcut pentru calculul exact al resurselor returnate și suport pentru flotele aflate în misiune.' },
        { type: 'Bugfix', text: 'Numărare luni în Falanga Senzorială: Corectat numărul de luni și harta de acoperire a falangei în toate sectoarele.' },
        { type: 'Bugfix', text: 'Sincronizare galaxie și flux live Overwatch [Closed Beta]: Corectat alertele de colonii noi și luni pe fluxul live din univers și afișarea claselor de jucător.' }
      ]
    },
    {
      version: 'v1.2.6',
      items: [
        { type: 'Feature', text: 'Falangă Senzorială Overwatch [Closed Beta]: Grilă tactică ce afișează raza de scanare a tuturor lunilor alianței în galaxie, inclusiv pe universuri circulare.' },
        { type: 'Feature', text: 'Calculator de rentabilitate pe resurse individuale: Calculează perioada de amortizare separat pentru Metal, Cristal sau Deuteriu cu filtre personalizate și actualizări instantanee.' },
        { type: 'Feature', text: 'Comutator multi-cont: Schimbă rapid între toate conturile tale din diferite universuri direct din meniul stânga-jos fără a pierde pagina curentă.' },
        { type: 'Feature', text: 'Contor activitate galaxie [Closed Beta]: Notificare în timp real pe meniul Overwatch ce te alertează când au loc mișcări de jucători sau evenimente de alianță.' },
        { type: 'Bugfix', text: 'Distanțe de zbor în universuri circulare: Corectat calculul celor mai scurte rute de zbor și al distanțelor pentru universurile circulare în Radar atacuri și Falangă.' },
        { type: 'Bugfix', text: 'Stabilitate îmbunătățită Overwatch [Closed Beta]: Rezolvat blocările de ecran la încărcarea tab-urilor de alianță și corectat afișarea în duelurile 1v1.' },
        { type: 'Bugfix', text: 'Clasamente live în panoul de comparație: Schimbarea jucătorului comparat actualizează acum instantaneu cele mai recente poziții din clasament.' },
        { type: 'Bugfix', text: 'Alerte precise de activitate galactică: Eliminat notificările false pentru abandonarea planetelor, colonizări noi și schimbări de status ale jucătorilor.' },
        { type: 'Bugfix', text: 'Protecție coordonate de origine: Coordonatele de origine (1:1) și conturile de administrare nu mai declanșează alerte false în galaxie.' },
        { type: 'Bugfix', text: 'Siguranță mod vacanță și luni: Conturile în mod vacanță și planetele cu lună activă nu mai sunt raportate eronat ca fiind abandonate.' }
      ]
    },
    {
      version: 'v1.2.5',
      items: [
        { type: 'Feature', text: 'Nexus Overwatch [Closed Beta]: Partajarea informațiilor în alianță, activitate live în univers și salvare multi-dispozitiv în cloud.' },
        { type: 'Feature', text: 'Seif personal multi-dispozitiv: Salvare securizată în cloud și sincronizare între dispozitive pentru expediții, bătălii, reciclări și planificator de costuri prin cheia ta privată de Seif.' },
        { type: 'Feature', text: 'Radar atacuri căutare inactivi: Scanează universul pentru ținte inactive optime de farmat sortate după rang și distanța față de coloniile tale.' },
        { type: 'Feature', text: 'Optimizator durată cercetare: Instrument dedicat pentru calculul exact al duratelor de cercetare, nivelurilor optime de laborator și pragurilor RRI.' },
        { type: 'Bugfix', text: 'Stare live Radar atacuri: Statusul de inactiv/activ al țintelor se actualizează acum instantaneu din scanările galactice pentru a nu ataca ținte devenite active.' },
        { type: 'Bugfix', text: 'Sincronizare sigură Radar atacuri: Rezolvare garantată a conflictelor în timpul sincronizării între dispozitive pentru a preveni ștergerea accidentală a țintelor.' },
        { type: 'Bugfix', text: 'Nave în zbor în Dezmembrator: Flotele aflate în misiune sunt acum luate complet în calcul la dezmembrare și capacitatea flotei.' },
        { type: 'Bugfix', text: 'Pachete de resurse în Planificator costuri: Corectat calculul pachetelor de resurse și importul listei la planificarea obiectivelor mari.' },
        { type: 'Polishing', text: 'Procesare mesaje: Procesare îmbunătățită a metadatelor mesajelor și optimizări ale ferestrelor din interfața jocului.' }
      ]
    },
    {
      version: 'v1.2.4',
      items: [
        { type: 'Feature', text: 'Filtru minim MSU în Radar atacuri: Glisor exponențial 0–1Miliard pentru a filtra și diminua planetele inactive sub valoarea dorită de resurse MSU în Radar și Galaxie.' },
        { type: 'Bugfix', text: 'Calcule Colecționar & Foreze: Corectat limita maximă de 50% bonus de mină, supraîncărcarea %, multiplicatorul geologului (8.8x/8.0x) și bonusul Rock\'tal T18.' },
        { type: 'Feature', text: 'Numărătoare inversă în Amortizare & Supraveghetor: Clădirile și cercetările active afișează acum cronometre în timp real în Amortizare și bara Supraveghetorului.' },
        { type: 'Polishing', text: 'Timp necesar în Planificator costuri: Timpii totali și rămași se calculează acum exact folosind costul MSU și resursele imperiului împărțite la randamentul zilnic.' },
        { type: 'Bugfix', text: 'Cozi independente de limbă: Corectat colectarea cozilor de clădiri și cercetare pe toate serverele OGame non-engleze.' },
        { type: 'Bugfix', text: 'Expediții partajate în alianță: Rapoartele de expediție partajate de membrii alianței nu mai sunt adăugate în statisticile personale.' },
        { type: 'Polishing', text: 'Sincronizare în fundal: Eliminat apelurile redundante CP din scripturile de fundal.' }
      ]
    },
    {
      version: 'v1.2.3',
      items: [
        { type: 'Feature', text: 'Scanare instantanee a tuturor paginilor de mesaje: Deschiderea tab-urilor Expediții sau Rapoarte de luptă importă și salvează automat toate rapoartele de pe toate paginile într-o singură scanare în fundal.' },
        { type: 'Bugfix', text: 'Sincronizare completă a lunilor: Sincronizarea manuală și automată include acum corect toate lunile (resurse, flote, apărări, bază lunară, falangă, poartă de salt și obiecte active).' },
        { type: 'Feature', text: 'Navigare cu rotița mouse-ului în Supraveghetor: Derulează direct pe bara Supraveghetorului pentru a naviga înainte și înapoi prin toate alertele imperiului.' },
        { type: 'Feature', text: 'Tab integrat OGNexus cu Istoric actualizări & Suport în ecranul de Mesaje.' },
        { type: 'Polishing', text: 'Formulă Randament Zilnic Imperiu: Adăugat tooltip interactiv detaliat lângă Randamentul Zilnic din Privire Generală.' },
        { type: 'Polishing', text: 'Randament dinamic mobil pentru conturi noi: Ajustat divizorul mediei zilnice pentru acuratețe imediat după importul unui cont nou.' },
        { type: 'Polishing', text: 'Sincronizat recomandările de rentabilitate a amortizării între Panou și Supraveghetor.' },
        { type: 'Bugfix', text: 'Corectat izolarea inventarului de acceleratoare între conturi diferite.' },
        { type: 'Bugfix', text: 'Calcule producție & Foreze: Corectat colectarea și calculul procentelor de producție (Mine, Reactor de fuziune, Sateliți și Foreze până la 150%) în ecranul Producție și Amortizare.' },
        { type: 'Bugfix', text: 'Urmărire pradă expediții: Corectat dublarea numărătorilor la scanări concomitente și adăugat detalii complete pentru Negustor, accelerări, obiecte și lupte în ecranul extins.' },
        { type: 'Polishing', text: 'Adăugat etichete live cu numărătoare inversă pentru cozile în desfășurare în Amortizare.' }
      ]
    }
  ],
  de: [
    {
      version: 'v1.2.7',
      items: [
        { type: 'Feature', text: 'Mehrsprachige Unterstützung: Nexus ist jetzt in 12 Sprachen verfügbar mit einfacher Sprachauswahl in der Navigationsleiste, in den Einstellungen und in den Spielnachrichten.' },
        { type: 'Feature', text: 'Kostenplaner für alle Planeten & Warenkorb-Bearbeitung: Gebäude-Upgrades für alle Planeten mit einem Klick hinzufügen und Zielstufen direkt im Warenkorb anpassen.' },
        { type: 'Feature', text: 'Astrophysik-Amortisationsrechner: Berechne Amortisationszeiten und Rentabilität für neue Kolonieplätze durch Astrophysik im Amortisations-Rechner.' },
        { type: 'Feature', text: 'Schrotthändler-Überarbeitung: Neu gestalteter Rechner für Schrotterträge mit exakten Ressourcenwerten und voller Unterstützung fliegender Flotten.' },
        { type: 'Bugfix', text: 'Mondzählung in Sensorphalanx: Mondanzahl und Abdeckungskarte der Sensorphalanx über alle Sektoren korrigiert.' },
        { type: 'Bugfix', text: 'Overwatch Galaxie-Synchronisation & Live-Feed [Closed Beta]: Meldungen zu neuen Kolonien und Monden im Live-Feed sowie Anzeige der Spielerklassen korrigiert.' }
      ]
    },
    {
      version: 'v1.2.6',
      items: [
        { type: 'Feature', text: 'Overwatch Sensorphalanx [Closed Beta]: Taktisches Sensorgitter zur Anzeige der Scanreichweite aller Allianzmonde in der Galaxie inklusive Rundum-Erfassung in kreisförmigen Universen.' },
        { type: 'Feature', text: 'Ressourcen-Amortisationsrechner: Berechne Amortisationszeiten separat für Metall, Kristall oder Deuterium mit anpassbaren Zielen und sofortiger Rentabilitätsberechnung.' },
        { type: 'Feature', text: 'Multi-Account-Wechsler: Wechsle nahtlos zwischen all deinen Universums-Accounts direkt über das Menü unten links, ohne deine Ansicht zu verlieren.' },
        { type: 'Feature', text: 'Zähler für ungelesene Galaxie-Ereignisse [Closed Beta]: Echtzeit-Benachrichtigung im Universums-Feed über neue Spieleraktivitäten und Allianz-Ereignisse.' },
        { type: 'Bugfix', text: 'Flugdistanzen in kreisförmigen Universen: Kürzeste Flugrouten und Distanzberechnungen für kreisförmige Universen in Raid-Radar und Sensorphalanx korrigiert.' },
        { type: 'Bugfix', text: 'Overwatch Stabilitätsverbesserungen [Closed Beta]: Abstürze beim Laden von Allianz-Tabs behoben und saubere Anzeige in 1v1-Duell-Ansichten sichergestellt.' },
        { type: 'Bugfix', text: 'Live-Highscores im Vergleichsdeck: Beim Wechseln von verglichenen Spielern werden die Highscore-Platzierungen nun sofort live aktualisiert.' },
        { type: 'Bugfix', text: 'Präzise Galaxie-Aktivitätsmeldungen: Falschmeldungen bei Planetenaufgaben, neuen Kolonisierungen und Spielerstatus-Änderungen behoben.' },
        { type: 'Bugfix', text: 'Schutz für Ursprungskoordinaten: Ursprungskoordinaten (1:1) und Administrator-Accounts lösen keine fehlerhaften Galaxie-Warnungen mehr aus.' },
        { type: 'Bugfix', text: 'Urlaubsmodus & Mond-Schutz: Accounts im Urlaubsmodus und Planeten mit aktiven Monden werden nicht mehr fälschlicherweise als aufgegeben gemeldet.' }
      ]
    },
    {
      version: 'v1.2.5',
      items: [
        { type: 'Feature', text: 'Nexus Overwatch [Closed Beta]: Teilen von Allianz-Informationen, Live-Universumsaktivität und Cloud-Backup für mehrere Geräte.' },
        { type: 'Feature', text: 'Geräteübergreifender persönlicher Tresor: Sicheres Cloud-Backup und geräteübergreifende Synchronisierung für Expeditionen, Kämpfe, Trümmerfeld-Ernten und Kostenplaner über deinen privaten Tresorschlüssel.' },
        { type: 'Feature', text: 'Raid-Radar Inaktiven-Scout: Scanne das Universum nach lohnenden inaktiven Farmzielen, sortiert nach Rang und Entfernung zu deinen Kolonien.' },
        { type: 'Feature', text: 'Forschungszeit-Optimierer: Spezielles Werkzeug zur genauen Berechnung von Forschungsdauern, optimalen Laborstufen und IRN-Schwellenwerten.' },
        { type: 'Bugfix', text: 'Raid-Radar Live-Status: Inaktivitäts- und Aktivitätsstatus von Zielen werden jetzt sofort aus Live-Galaxie-Scans aktualisiert.' },
        { type: 'Bugfix', text: 'Verlustfreie Raid-Radar-Synchronisation: Sichere Zielauflösung bei geräteübergreifender Synchronisation verhindert das Löschen von Zielen.' },
        { type: 'Bugfix', text: 'Fliegende Schiffe im Schrotthändler: Flotten auf Missionen werden jetzt im Schrotthändler und bei der Flottenkapazität voll berücksichtigt.' },
        { type: 'Bugfix', text: 'Kostenplaner Ressourcenpakete: Berechnung von Ressourcenpaketen und Warenkorb-Import bei großen Imperiumszielen korrigiert.' },
        { type: 'Polishing', text: 'Nachrichtenverarbeitung: Sauberere Verarbeitung von Nachrichten-Metadaten und erweiterte Verbesserungen der Spiel-Oberfläche.' }
      ]
    },
    {
      version: 'v1.2.4',
      items: [
        { type: 'Feature', text: 'Raid-Helfer Min-MSU-Filter: Exponentieller 0–1 Mrd. Schieberegler zum Filtern und Abblenden von inaktiven Planeten unter dem gewünschten MSU-Wert.' },
        { type: 'Bugfix', text: 'Kollektor- & Crawler-Berechnungen: 50% Minenbonus-Grenze, Überlastung %, Geologen-Multiplikator und Rock\'tal T18 Kollektor-Boost korrigiert.' },
        { type: 'Feature', text: 'Laufende Upgrades in Amortisation & Aufseher: Aktive Bau- und Forschungs-Warteschlangen zeigen jetzt Live-Countdowns an.' },
        { type: 'Polishing', text: 'Kostenplaner Sammelzeiten: Gesamte und verbleibende Sammelzeiten werden jetzt exakt anhand der täglichen Imperiumsproduktion berechnet.' },
        { type: 'Bugfix', text: 'Sprachunabhängige Warteschlangen: Erfassung der Bau- und Forschungswarteschlangen auf nicht-englischen OGame-Servern korrigiert.' },
        { type: 'Bugfix', text: 'Geteilte Allianz-Expeditionen: Geteilte Expeditionsberichte von Allianzmitgliedern werden nicht mehr in persönlichen Statistiken erfasst.' },
        { type: 'Polishing', text: 'Hintergrund-Synchronisierung: Redundante CP-Aufrufe von Hintergrund-Workern entfernt.' }
      ]
    },
    {
      version: 'v1.2.3',
      items: [
        { type: 'Feature', text: 'Sofortiger Mehrseiten-Nachrichtenscan: Öffnen von Expeditions- oder Kampfberichten importiert alle Berichte über alle Seiten hinweg in einem Durchgang.' },
        { type: 'Bugfix', text: 'Vollständige Mond-Synchronisierung: Hintergrund- und manuelle Synchronisierung erfasst nun alle Monde inklusive Ressourcen, Flotten und Gebäuden.' },
        { type: 'Feature', text: 'Aufseher-Mausradnavigation: Scrolle über die Aufseher-Leiste, um vor- und zurück durch alle Imperiumswarnungen zu wechseln.' },
        { type: 'Feature', text: 'Integriertes OGNexus Changelog- und Support-Tab im Nachrichtenbereich.' },
        { type: 'Polishing', text: 'Imperiums-Tagesertragsformel: Interaktiver Info-Tooltip beim täglichen Ertrag in der Übersicht hinzugefügt.' },
        { type: 'Polishing', text: 'Dynamischer Durchschnittsertrag: Divisor für neu hinzugefügte Accounts angepasst.' },
        { type: 'Polishing', text: 'Synchronisierte Amortisations-Empfehlungen zwischen Dashboard und Aufseher.' },
        { type: 'Bugfix', text: 'Account-Trennung von Beschleunigungs-Items im Inventar sichergestellt.' },
        { type: 'Bugfix', text: 'Crawler- und Minen-Berechnungen: Erfassung von Produktionsprozentsätzen und Überlastung bis 150% korrigiert.' },
        { type: 'Bugfix', text: 'Expeditionsbeute-Erfassung: Race-Conditions bei zeitgleichen Scans behoben und Händler-, Item- und Kampfdetails hinzugefügt.' },
        { type: 'Polishing', text: 'Live-Countdown-Badges für laufende Planeten- und Forschungswarteschlangen hinzugefügt.' }
      ]
    }
  ],
  fr: [
    {
      version: 'v1.2.7',
      items: [
        { type: 'Feature', text: 'Support multilingue : Nexus est désormais disponible en 12 langues avec un sélecteur simple dans l\'en-tête, les paramètres et les messages en jeu.' },
        { type: 'Feature', text: 'Planificateur de coûts pour toutes les planètes et modification du panier : Ajoutez des améliorations sur toutes les planètes en un clic et modifiez les niveaux souhaités directement dans votre panier.' },
        { type: 'Feature', text: 'Calculateur d\'amortissement Astrophysique : Calculez les délais de retour sur investissement et la rentabilité pour le deblocage de nouvelles colonies via Astrophysique dans l\'outil Amortissement.' },
        { type: 'Feature', text: 'Refonte du Ferrailleur : Outil de calcul entièrement revu avec estimation exacte des ressources récupérées et prise en compte des flottes en mission.' },
        { type: 'Bugfix', text: 'Comptage des lunes dans la Phalange : Correction du nombre de lunes et de la couverture de détection sur l\'ensemble des secteurs.' },
        { type: 'Bugfix', text: 'Synchronisation galactique & flux en direct Overwatch [Bêta Fermée] : Correction des alertes de nouvelles colonies et lunes dans le flux en direct et affichage des classes de joueurs.' }
      ]
    },
    {
      version: 'v1.2.6',
      items: [
        { type: 'Feature', text: 'Phalange de capteur Overwatch [Bêta Fermée] : Grille tactique affichant la portée de scan de toutes les lunes d\'alliance à travers la galaxie, avec prise en compte des univers circulaires.' },
        { type: 'Feature', text: 'Calculateur d\'amortissement par ressource : Calculez les délais de retour sur investissement séparément pour le Métal, le Cristal ou le Deutérium avec objectifs personnalisés.' },
        { type: 'Feature', text: 'Sélecteur multi-comptes : Passez facilement d\'un compte d\'univers à un autre directement depuis le menu inférieur gauche sans perdre votre page en cours.' },
        { type: 'Feature', text: 'Compteur d\'événements galactiques non lus [Bêta Fermée] : Notification en temps réel vous alertant immédiatement des mouvements de joueurs et activités d\'alliance.' },
        { type: 'Bugfix', text: 'Distances de vol en univers circulaire : Correction des trajectoires de vol les plus courtes et des calculs de distance pour les univers circulaires dans le Radar de raid et la Phalange.' },
        { type: 'Bugfix', text: 'Amélioration de la stabilité Overwatch [Bêta Fermée] : Résolution des plantages lors du chargement des onglets d\'alliance et affichage sécurisé dans les duels 1v1.' },
        { type: 'Bugfix', text: 'Classements en direct dans le comparateur : Le changement de joueur comparé actualise désormais immédiatement les derniers classements en direct.' },
        { type: 'Bugfix', text: 'Alertes d\'activité galactique précises : Correction des fausses alertes concernant l\'abandon de planètes, nouvelles colonisations et changements de statut.' },
        { type: 'Bugfix', text: 'Protection des coordonnées d\'origine : Les coordonnées d\'origine (1:1) et comptes administrateurs ne déclenchent plus de fausses alertes galactiques.' },
        { type: 'Bugfix', text: 'Sécurité mode vacances et lunes : Les comptes en mode vacances et les planètes avec lune active ne sont plus signalés à tort comme abandonnés.' }
      ]
    },
    {
      version: 'v1.2.5',
      items: [
        { type: 'Feature', text: 'Nexus Overwatch [Bêta Fermée] : Partage d\'informations d\'alliance, activité de l\'univers en direct et sauvegarde cloud multi-appareils.' },
        { type: 'Feature', text: 'Coffre-fort personnel multi-appareils : Sauvegarde cloud sécurisée et synchronisation multi-appareils pour expéditions, combats, débris et planificateur de coûts via votre clé privée.' },
        { type: 'Feature', text: 'Radar de raid explorateur d\'inactifs : Analysez l\'univers pour trouver des cibles inactives idéales à piller, triées par rang et distance de vos colonies.' },
        { type: 'Feature', text: 'Optimiseur de temps de recherche : Outil dédié pour calculer les durées de recherche exactes, niveaux optimaux de laboratoires et seuils du RIP.' },
        { type: 'Bugfix', text: 'Statut en direct Radar de raid : Le statut inactif/actif des cibles est mis à jour immédiatement d\'après les scans de galaxie.' },
        { type: 'Bugfix', text: 'Synchronisation non-destructive du Radar de raid : Résolution sécurisée lors de la synchronisation multi-appareils empêchant la perte de cibles.' },
        { type: 'Bugfix', text: 'Vaisseaux en vol chez le Ferrailleur : Les flottes en mission sont désormais prises en compte dans le Ferrailleur et la capacité de flotte.' },
        { type: 'Bugfix', text: 'Packs de ressources dans le Planificateur : Correction du calcul des packs de ressources et de l\'import du panier.' },
        { type: 'Polishing', text: 'Traitement des messages : Meilleur traitement des métadonnées des messages et améliorations de l\'interface en jeu.' }
      ]
    },
    {
      version: 'v1.2.4',
      items: [
        { type: 'Feature', text: 'Filtre MSU minimum dans le Radar de raid : Curseur exponentiel 0–1 milliard pour filtrer et estomper les planètes inactives sous la valeur souhaitée.' },
        { type: 'Bugfix', text: 'Calculs Collecteur & Foreuses : Correction du plafond de 50% de bonus mine, de la surcharge %, du multiplicateur géologue et du bonus Rock\'tal T18.' },
        { type: 'Feature', text: 'Améliorations en cours dans Amortissement & Superviseur : Les files de construction et recherche affichent désormais des comptes à rebours en temps réel.' },
        { type: 'Polishing', text: 'Temps de récolte du Planificateur : Calcul précis des temps total et restant à partir de la production quotidienne de l\'Empire.' },
        { type: 'Bugfix', text: 'Files de construction multilingues : Récupération des files de construction et de recherche corrigée sur tous les serveurs non-anglophones.' },
        { type: 'Bugfix', text: 'Expéditions partagées d\'alliance : Les rapports d\'expédition partagés ne sont plus comptabilisés dans les statistiques personnelles.' },
        { type: 'Polishing', text: 'Synchronisation en arrière-plan : Suppression des requêtes redondantes CP en arrière-plan.' }
      ]
    },
    {
      version: 'v1.2.3',
      items: [
        { type: 'Feature', text: 'Scan instantané multi-pages des messages : L\'ouverture des expéditions ou combats importe automatiquement tous les rapports de toutes les pages en un passage.' },
        { type: 'Bugfix', text: 'Synchronisation complète des lunes : La synchronisation manuelle et automatique intègre désormais correctement toutes les lunes et leurs infrastructures.' },
        { type: 'Feature', text: 'Navigation molette dans le Superviseur : Faites défiler la molette sur la barre du Superviseur pour naviguer parmi les alertes de l\'empire.' },
        { type: 'Feature', text: 'Onglet OGNexus intégré avec journal des modifications et assistance dans les messages.' },
        { type: 'Polishing', text: 'Formule de rendement quotidien : Info-bulle interactive ajoutée à côté du rendement quotidien dans la Vue générale.' },
        { type: 'Polishing', text: 'Moyenne dynamique pour les comptes récents : Diviseur ajusté avec précision pour les comptes nouvellement importés.' },
        { type: 'Polishing', text: 'Recommandations d\'amortissement synchronisées entre le tableau de bord et le Superviseur.' },
        { type: 'Bugfix', text: 'Isolation des objets d\'accélération de l\'inventaire entre comptes différents.' },
        { type: 'Bugfix', text: 'Calculs Foreuses et production : Récupération et calcul des pourcentages de production corrigés dans les onglets Production et Amortissement.' },
        { type: 'Bugfix', text: 'Suivi du butin d\'expédition : Résolution des doublons lors de scans concurrents et ajout des détails marchands, objets et combats.' },
        { type: 'Polishing', text: 'Badges de compte à rebours en direct ajoutés pour les files planétaires et de recherche dans l\'Amortissement.' }
      ]
    }
  ]
,
  pl: [
    {
      "version": "v1.2.7",
      "items": [
        { "type": "Feature", "text": "Obsługa wielu języków: Nexus jest teraz dostępny w 12 językach z łatwym przełącznikiem w nagłówku, ustawieniach i wiadomościach w grze." },
        { "type": "Feature", "text": "Planer kosztów dla wszystkich planet i edycja koszyka: Dodawaj ulepszenia budynków na wszystkich planetach jednym kliknięciem i zmieniaj poziomy bezpośrednio w koszyku." },
        { "type": "Feature", "text": "Kalkulator amortyzacji Astrofizyki: Obliczaj czas zwrotu i opłacalność odblokowywania nowych kolonii przez Astrofizykę w narzędziu Amortyzacja." },
        { "type": "Feature", "text": "Przebudowa Handlarza Złomem: Zmodernizowane narzędzie kalkulacji złomu z dokładnymi wartościami surowców i uwzględnieniem flot w locie." },
        { "type": "Bugfix", "text": "Liczba księżyców w Falandze Czujników: Poprawiono zliczanie księżyców oraz mapę zasięgu falangi we wszystkich sektorach." },
        { "type": "Bugfix", "text": "Synchronizacja galaktyki i podgląd na żywo Overwatch [Zamknięta Beta]: Naprawiono powiadomienia o nowych koloniach i księżycach w strumieniu na żywo oraz wyświetlanie klas graczy." }
      ]
    },
    {
      "version": "v1.2.6",
      "items": [
        {
          "type": "Feature",
          "text": "Falanga Czujników Overwatch [Zamknięta Beta]: Taktyczna siatka sensorów wyświetlająca zasięg skanowania wszystkich księżyców sojuszu w galaktyce z obsługą uniwersów cyklicznych."
        },
        {
          "type": "Feature",
          "text": "Kalkulator zwrotu z pojedynczych surowców: Obliczaj czas amortyzacji oddzielnie dla Metalu, Kryształu lub Deuteru z własnymi celami i natychmiastowym ROI."
        },
        {
          "type": "Feature",
          "text": "Przełącznik wielu kont: Płynnie przełączaj się między wszystkimi kontami uniwersum bezpośrednio z lewego dolnego doku bez utraty aktywnego widoku."
        },
        {
          "type": "Feature",
          "text": "Licznik nieprzeczytanych zdarzeń w galaktyce [Zamknięta Beta]: Licznik na żywo w zakładce wywiadu natychmiast powiadamia o nowych ruchach graczy i wydarzeniach sojuszu."
        },
        {
          "type": "Bugfix",
          "text": "Dystanse lotu w uniwersach cyklicznych: Poprawiono najkrótsze trasy lotu i obliczenia odległości dla uniwersów pączkowych w Radarze rajdów i Falangi."
        },
        {
          "type": "Bugfix",
          "text": "Poprawa stabilności Overwatch [Zamknięta Beta]: Rozwiązano zawieszanie widoku przy ładowaniu zakładek sojuszu i zapewniono stabilny stan pojedynków 1v1."
        },
        {
          "type": "Bugfix",
          "text": "Klasyfikacje na żywo w panelu porównawczym: Przełączanie porównywanych graczy natychmiast aktualizuje ich najnowsze pozycje w rankingu."
        },
        {
          "type": "Bugfix",
          "text": "Dokładne alerty aktywności galaktycznej: Wyeliminowano fałszywe powiadomienia o opuszczeniu planet, nowych koloniach i zmianach statusu graczy."
        },
        {
          "type": "Bugfix",
          "text": "Ochrona współrzędnych początkowych: Koordynaty początkowe (1:1) i konta administratorów nie wyzwalają już błędnych alertów w galaktyce."
        },
        {
          "type": "Bugfix",
          "text": "Zabezpieczenia trybu urlopu i księżyców: Konta na urlopie i planety z aktywnym księżycem nie są już błędnie zgłaszane jako porzucone."
        }
      ]
    },
    {
      "version": "v1.2.5",
      "items": [
        {
          "type": "Feature",
          "text": "Nexus Overwatch [Zamknięta Beta]: Dzielenie się wywiadem sojuszniczym, aktywność uniwersum na żywo i kopia w chmurze."
        },
        {
          "type": "Feature",
          "text": "Prywatny sejf wielu urządzeń: Bezpieczna kopia w chmurze i synchronizacja ekspedycji, walk, zbiórek i planera kosztów."
        },
        {
          "type": "Feature",
          "text": "Radar rajdów wyszukiwanie nieaktywnych: Skanuj uniwersum w poszukiwaniu optymalnych nieaktywnych celów posortowanych według rangi i odległości."
        },
        {
          "type": "Feature",
          "text": "Optymalizator czasu badań: Dedykowane narzędzie do wyliczania dokładnych czasów badań, poziomów laboratoriów i progów MSBN."
        },
        {
          "type": "Bugfix",
          "text": "Status na żywo w Radarze rajdów: Statusy nieaktywnych celów aktualizują się natychmiast ze skanów galaktyki."
        },
        {
          "type": "Bugfix",
          "text": "Bezpieczna synchronizacja Radaru rajdów: Gwarantowane bezpieczne scalanie celów przy synchronizacji między urządzeniami."
        },
        {
          "type": "Bugfix",
          "text": "Statki w locie w Handlarzu Złomem: Floty będące na misjach są w pełni uwzględniane w wyliczeniach złomowania."
        },
        {
          "type": "Bugfix",
          "text": "Paczki surowców w Planerze kosztów: Poprawiono kalkulacje paczek i import koszyka przy planowaniu dużych celów."
        },
        {
          "type": "Polishing",
          "text": "Przetwarzanie wiadomości: Ulepszone przetwarzanie metadanych wiadomości i rozszerzenia ramek w grze."
        }
      ]
    }
  ],
  nl: [
    {
      "version": "v1.2.7",
      "items": [
        { "type": "Feature", "text": "Meertalige ondersteuning: Nexus is nu beschikbaar in 12 talen met een handige taalkiezer in de navigatiebalk, instellingen en in-game berichten." },
        { "type": "Feature", "text": "Kostenplanner voor alle planeten & winkelmand bewerken: Voeg upgrades voor alle planeten met één klik toe en pas gewenste niveaus direct aan in je winkelmand." },
        { "type": "Feature", "text": "Astrofysica terugverdientijdcalculator: Bereken terugverdientijden en rendement voor het vrijspelen van nieuwe kolonies via Astrofysica in de Amortisatietool." },
        { "type": "Feature", "text": "Schroothandelaar vernieuwing: Vernieuwde berekeningstool met exacte grondstofopbrengsten en volledige ondersteuning voor vloten op missie." },
        { "type": "Bugfix", "text": "Aantal manen in Sensorfalangs: Berekening van aantal manen en dekkingskaart van de sensorfalangs in alle sectoren gecorrigeerd." },
        { "type": "Bugfix", "text": "Overwatch melkwegsynchronisatie & livefeed [Gesloten Bèta]: Meldingen voor nieuwe kolonies en manen op de livefeed gecorrigeerd, evenals weergave van spelerklassen." }
      ]
    },
    {
      "version": "v1.2.6",
      "items": [
        {
          "type": "Feature",
          "text": "Overwatch Sensor Phalanx [Gesloten Beta]: Tactisch sensorraster dat het scanbereik van alle alliantie-manen in het universum toont met circulaire projectie."
        },
        {
          "type": "Feature",
          "text": "Individuele grondstof terugverdientijd-calculator: Bereken investeringsrendement apart voor Metaal, Kristal of Deuterium met directe ROI-updates."
        },
        {
          "type": "Feature",
          "text": "Multi-account wisselaar: Wissel soepel tussen al je universumaccounts direct vanuit het dock linksonder zonder je weergave te verliezen."
        },
        {
          "type": "Feature",
          "text": "Ongelezen universumgebeurtenissen teller [Gesloten Beta]: Realtime badge op de universumfeed waarschuwt direct bij spelersbewegingen of alliantie-evenementen."
        },
        {
          "type": "Bugfix",
          "text": "Vluchtafstanden in circulaire universums: Kortste vluchtroutes en afstandsberekeningen gecorrigeerd in Aanvalsradar en Phalanx."
        },
        {
          "type": "Bugfix",
          "text": "Overwatch stabiliteitsverbeteringen [Gesloten Beta]: Crashes bij laden van alliantietabbladen opgelost en stabiele weergave in 1v1 duels verzekerd."
        },
        {
          "type": "Bugfix",
          "text": "Live topscores in vergelijkingsdeck: Spelersvergelijking toont nu direct de meest actuele live rankings."
        },
        {
          "type": "Bugfix",
          "text": "Accurate activiteitsmeldingen: Valse meldingen over verlaten planeten, kolonisaties en statuswijzigingen gecorrigeerd."
        },
        {
          "type": "Bugfix",
          "text": "Beveiliging oorsprongcoördinaten: Oorsprongcoördinaten (1:1) en beheerderaccounts activeren geen valse meldingen meer."
        },
        {
          "type": "Bugfix",
          "text": "Vakantiemodus & maanbeveiliging: Accounts in vakantiemodus en planeten met actieve manen worden niet meer als verlaten gerapporteerd."
        }
      ]
    },
    {
      "version": "v1.2.5",
      "items": [
        {
          "type": "Feature",
          "text": "Nexus Overwatch [Gesloten Beta]: Alliantie-intelligentie delen, live universumactiviteit en cloudback-up."
        },
        {
          "type": "Feature",
          "text": "Persoonlijke kluis voor meerdere apparaten: Veilige cloudback-up en synchronisatie voor expedities, gevechten, puinoogsten en kostenplanner."
        },
        {
          "type": "Feature",
          "text": "Aanvalsradar inactievenscout: Doorzoek het universum naar inactieve farmdoelen gesorteerd op rang en afstand."
        },
        {
          "type": "Feature",
          "text": "Onderzoekstijd-optimizer: Speciaal hulpmiddel voor het berekenen van exacte onderzoeksduur, laboratoriumniveaus en ION-breekpunten."
        },
        {
          "type": "Bugfix",
          "text": "Live status in Aanvalsradar: Inactieve status wordt nu direct bijgewerkt via actuele melkwegscans."
        },
        {
          "type": "Bugfix",
          "text": "Veilige synchronisatie in Aanvalsradar: Veilige doelsynchronisatie voorkomt verwijdering van doelen tussen apparaten."
        },
        {
          "type": "Bugfix",
          "text": "Vliegende schepen in slootool: Vloten op missie worden nu volledig meegerekend in slootoolberekeningen."
        },
        {
          "type": "Bugfix",
          "text": "Grondstofpakketten in Kostenplanner: Berekening van pakketten en winkelwagenimport gecorrigeerd."
        },
        {
          "type": "Polishing",
          "text": "Berichtenverwerking: Schone metagegevensverwerking en verbeterde in-game vensters."
        }
      ]
    }
  ],
  es: [
    {
      "version": "v1.2.7",
      "items": [
        { "type": "Feature", "text": "Soporte multilingüe: Nexus ahora está disponible en 12 idiomas con un selector fácil en la barra superior, ajustes y mensajes dentro del juego." },
        { "type": "Feature", "text": "Planificador de costos para todos los planetas y edición del carrito: Añade mejoras en todos los planetas con un solo clic y edita niveles objetivo directamente en tu carrito de compras." },
        { "type": "Feature", "text": "Calculadora de amortización de Astrofísica: Calcula los tiempos de retorno y rentabilidad al desbloquear nuevas colonias mediante Astrofísica en la herramienta de Amortización." },
        { "type": "Feature", "text": "Renovación del Chatarrero: Herramienta rediseñada para el cálculo exacto de recursos recuperados y soporte completo para flotas en vuelo." },
        { "type": "Bugfix", "text": "Conteo de lunas en Falange de Sensores: Corregido el número de lunas y el mapa de cobertura de la falange en todos los sectores." },
        { "type": "Bugfix", "text": "Sincronización galáctica y feed en vivo de Overwatch [Beta Cerrada]: Corregidas las alertas de nuevas colonias y lunas en el feed en vivo y visualización de clases de jugador." }
      ]
    },
    {
      "version": "v1.2.6",
      "items": [
        {
          "type": "Feature",
          "text": "Sensor Phalanx Overwatch [Beta Cerrada]: Red táctica de sensores de alianza que visualiza el alcance de todas las lunas en la galaxia con soporte de universos circulares."
        },
        {
          "type": "Feature",
          "text": "Calculadora de amortización por recurso individual: Calcula el retorno de inversión por separado para Metal, Cristal o Deuterio con objetivos personalizables y ROI al instante."
        },
        {
          "type": "Feature",
          "text": "Selector de múltiples cuentas: Cambia fácilmente entre todas tus cuentas de universos desde el menú inferior izquierdo sin perder tu pantalla activa."
        },
        {
          "type": "Feature",
          "text": "Contador de eventos de galaxia no leídos [Beta Cerrada]: Indicador en tiempo real en la pestaña de Inteligencia que te avisa ante movimientos de jugadores o alianzas."
        },
        {
          "type": "Bugfix",
          "text": "Distancias de vuelo en universos circulares: Corregidas las rutas más cortas y distancias para universos circulares en Radar de ataques y Phalanx."
        },
        {
          "type": "Bugfix",
          "text": "Estabilidad de Overwatch [Beta Cerrada]: Resueltos bloqueos al cargar pestañas de alianza y asegurados estados estables en duelos 1v1."
        },
        {
          "type": "Bugfix",
          "text": "Clasificaciones en vivo en mazo comparativo: Comparar jugadores ahora actualiza inmediatamente sus puestos en el ranking."
        },
        {
          "type": "Bugfix",
          "text": "Alertas de actividad precisas: Eliminadas notificaciones falsas de abandono de planetas, nuevas colonizaciones y cambios de estado."
        },
        {
          "type": "Bugfix",
          "text": "Protección de coordenadas de origen: Coordenadas iniciales (1:1) y cuentas de administración no activan alertas erróneas."
        },
        {
          "type": "Bugfix",
          "text": "Protección de modo vacaciones y lunas: Cuentas en vacaciones y planetas con luna activa ya no se reportan erróneamente como abandonados."
        }
      ]
    },
    {
      "version": "v1.2.5",
      "items": [
        {
          "type": "Feature",
          "text": "Nexus Overwatch [Beta Cerrada]: Intercambio de inteligencia de alianza, actividad del universo en vivo y copia en la nube."
        },
        {
          "type": "Feature",
          "text": "Bóveda personal multidispositivo: Copia de seguridad segura en la nube y sincronización entre dispositivos para expediciones, combates y planificador."
        },
        {
          "type": "Feature",
          "text": "Radar de ataques explorador de inactivos: Escanea el universo buscando objetivos inactivos óptimos ordenados por rango y distancia."
        },
        {
          "type": "Feature",
          "text": "Optimizador de tiempo de investigación: Herramienta dedicada para calcular duraciones exactas, niveles de laboratorio y umbrales de RII."
        },
        {
          "type": "Bugfix",
          "text": "Estado en vivo en Radar de ataques: El estado de inactividad se actualiza de inmediato mediante escaneos de galaxia."
        },
        {
          "type": "Bugfix",
          "text": "Sincronización segura en Radar de ataques: Resolución sin pérdidas durante la sincronización multidispositivo."
        },
        {
          "type": "Bugfix",
          "text": "Naves en vuelo en el Chatarrero: Las flotas en misión ahora se contabilizan por completo en el desguace."
        },
        {
          "type": "Bugfix",
          "text": "Paquetes de recursos en Planificador: Corregido el cálculo de paquetes y la importación de cestas."
        },
        {
          "type": "Polishing",
          "text": "Procesamiento de mensajes: Procesamiento limpio de metadatos y mejoras visuales en el juego."
        }
      ]
    }
  ],
  it: [
    {
      "version": "v1.2.7",
      "items": [
        { "type": "Feature", "text": "Supporto multilingue: Nexus è ora disponibile in 12 lingue con un comodo selettore nella barra di navigazione, nelle impostazioni e nei messaggi in gioco." },
        { "type": "Feature", "text": "Pianificatore costi per tutti i pianeti e modifica carrello: Aggiungi potenziamenti su tutti i pianeti con un clic e modifica i livelli desiderati direttamente nel carrello." },
        { "type": "Feature", "text": "Calcolatore ammortamento Astrofisica: Calcola i tempi di recupero e la redditività per lo sblocco di nuove colonie tramite Astrofisica nello strumento Ammortamento." },
        { "type": "Feature", "text": "Revisione Mercante di Rottami: Strumento di calcolo ridisegnato con resa esatta delle risorse e supporto per le flotte in missione." },
        { "type": "Bugfix", "text": "Conteggio lune nella Falange di Sensori: Corretto il conteggio delle lune e la mappa di copertura della falange in tutti i settori." },
        { "type": "Bugfix", "text": "Sincronizzazione galassia e feed live Overwatch [Closed Beta]: Corrette le notifiche di nuove colonie e lune nel feed live e la visualizzazione delle classi dei giocatori." }
      ]
    },
    {
      "version": "v1.2.6",
      "items": [
        {
          "type": "Feature",
          "text": "Falange di Sensori Overwatch [Beta Chiusa]: Griglia tattica di sensori che visualizza il raggio di scansione di tutte le lune dell'alleanza con supporto per universi circolari."
        },
        {
          "type": "Feature",
          "text": "Calcolatore di ammortamento per singola risorsa: Calcola il tempo di recupero separatamente per Metallo, Cristallo o Deuterio con aggiornamenti immediati del ROI."
        },
        {
          "type": "Feature",
          "text": "Selettore multi-account: Passa facilmente tra tutti i tuoi account universo dal dock in basso a sinistra senza perdere la schermata attiva."
        },
        {
          "type": "Feature",
          "text": "Contatore eventi galassia non letti [Beta Chiusa]: Notifica in tempo reale nella scheda Intelligence che ti avvisa di movimenti di giocatori o eventi dell'alleanza."
        },
        {
          "type": "Bugfix",
          "text": "Distanze di volo in universi circolari: Corrette le rotte di volo più brevi e il calcolo delle distanze nel Radar attacchi e nella Falange."
        },
        {
          "type": "Bugfix",
          "text": "Miglioramenti stabilità Overwatch [Beta Chiusa]: Risolti blocchi al caricamento delle schede alleanza e garantita stabilità nei duelli 1v1."
        },
        {
          "type": "Bugfix",
          "text": "Classifiche in tempo reale nel deck di confronto: Il confronto tra giocatori aggiorna ora istantaneamente le ultime posizioni in classifica."
        },
        {
          "type": "Bugfix",
          "text": "Avvisi attività precisi: Eliminati i falsi allarmi per abbandono pianeti, nuove colonizzazioni e cambi di stato dei giocatori."
        },
        {
          "type": "Bugfix",
          "text": "Protezione coordinate di origine: Le coordinate iniziali (1:1) e gli account amministratore non generano più falsi avvisi."
        },
        {
          "type": "Bugfix",
          "text": "Protezione modalità vacanza e lune: Gli account in vacanza e i pianeti con luna non vengono più segnalati come abbandonati."
        }
      ]
    },
    {
      "version": "v1.2.5",
      "items": [
        {
          "type": "Feature",
          "text": "Nexus Overwatch [Beta Chiusa]: Condivisione informazioni alleanza, attività in tempo reale e backup su cloud."
        },
        {
          "type": "Feature",
          "text": "Caveau personale multidispositivo: Backup sicuro su cloud e sincronizzazione per spedizioni, combattimenti e pianificatore costi."
        },
        {
          "type": "Feature",
          "text": "Radar attacchi ricognitore inattivi: Scansiona l'universo alla ricerca di bersagli inattivi ordinati per punteggio e distanza."
        },
        {
          "type": "Feature",
          "text": "Ottimizzatore tempi di ricerca: Strumento dedicato per calcolare durate esatte, livelli ottimali di laboratorio e soglie RIR."
        },
        {
          "type": "Bugfix",
          "text": "Stato in tempo reale Radar attacchi: Gli stati attivo/inattivo si aggiornano all'istante dalle scansioni galassia."
        },
        {
          "type": "Bugfix",
          "text": "Sincronizzazione sicura Radar attacchi: Risoluzione sicura dei bersagli durante la sincronizzazione tra dispositivi."
        },
        {
          "type": "Bugfix",
          "text": "Navi in volo nel Rottamaio: Le flotte in missione sono ora pienamente incluse nei calcoli di rottamazione."
        },
        {
          "type": "Bugfix",
          "text": "Pacchetti risorse nel Pianificatore: Corretto il calcolo dei pacchetti e l'importazione del carrello."
        },
        {
          "type": "Polishing",
          "text": "Elaborazione messaggi: Pulizia dei metadati dei messaggi e ottimizzazione delle finestre in-game."
        }
      ]
    }
  ],
  ru: [
    {
      "version": "v1.2.7",
      "items": [
        { "type": "Feature", "text": "Многоязычная поддержка: Nexus теперь доступен на 12 языках с удобным переключателем в заголовке, настройках и игровых сообщениях." },
        { "type": "Feature", "text": "Планировщик затрат для всех планет и редактирование корзины: Добавляйте улучшения для всех планет в один клик и меняйте целевые уровни прямо в корзине." },
        { "type": "Feature", "text": "Калькулятор окупаемости Астрофизики: Рассчитывайте сроки окупаемости и доходность открытия новых колоний через Астрофизику в калькуляторе окупаемости." },
        { "type": "Feature", "text": "Обновление Торговца ломом: Переработанный инструмент расчета лома с точным возвратом ресурсов и учетом флотов на заданиях." },
        { "type": "Bugfix", "text": "Подсчет лун в Сенсорном фаланге: Исправлен подсчет лун и карта зоны покрытия фаланги во всех секторах." },
        { "type": "Bugfix", "text": "Синхронизация галактики и живая лента Overwatch [Закрытая бета]: Исправлены уведомления о новых колониях и лунах в живой ленте и отображение классов игроков." }
      ]
    },
    {
      "version": "v1.2.6",
      "items": [
        {
          "type": "Feature",
          "text": "Сенсорная фаланга Overwatch [Закрытая Бета]: Тактическая сетка сенсоров альянса с отображением радиуса обзора всех лун и поддержкой круговых вселенных."
        },
        {
          "type": "Feature",
          "text": "Калькулятор окупаемости по отдельным ресурсам: Расчёт окупаемости инвестиций отдельно для Металла, Кристалла или Дейтерия с мгновенным обновлением ROI."
        },
        {
          "type": "Feature",
          "text": "Переключатель мульти-аккаунтов: Быстрое переключение между аккаунтами вселенных из левого нижнего дока без потери открытого экрана."
        },
        {
          "type": "Feature",
          "text": "Счётчик непрочитанных событий галактики [Закрытая Бета]: Индикатор в реальном времени во вкладке разведки оповещает о новых движениях игроков и событиях альянса."
        },
        {
          "type": "Bugfix",
          "text": "Дистанции полёта в круговых вселенных: Исправлен расчёт кратчайших путей для тороидальных вселенных в Радаре рейдов и Фаланге."
        },
        {
          "type": "Bugfix",
          "text": "Повышение стабильности Overwatch [Закрытая Бета]: Устранены сбои при загрузке вкладок альянса и обеспечена стабильность дуэлей 1 на 1."
        },
        {
          "type": "Bugfix",
          "text": "Живые рекорды в панели сравнения: Сравнение игроков теперь мгновенно обновляет актуальные ранги в статистике."
        },
        {
          "type": "Bugfix",
          "text": "Точные оповещения активности галактики: Устранены ложные уведомления об оставлении планет, колонизации и смене статусов."
        },
        {
          "type": "Bugfix",
          "text": "Защита начальных координат: Координаты 1:1 и аккаунты администрации больше не вызывают ложных срабатываний."
        },
        {
          "type": "Bugfix",
          "text": "Защита режима отпуска и лун: Аккаунты в РО и планеты с активными лунами больше не определяются как заброшенные."
        }
      ]
    },
    {
      "version": "v1.2.5",
      "items": [
        {
          "type": "Feature",
          "text": "Nexus Overwatch [Закрытая Бета]: Обмен разведданными в альянсе, живая активность вселенной и облачный бэкап."
        },
        {
          "type": "Feature",
          "text": "Личный сейф на нескольких устройствах: Надёжное облачное сохранение и синхронизация экспедиций, боёв, сборов и планировщика."
        },
        {
          "type": "Feature",
          "text": "Радар рейдов сканер ишек: Поиск выгодных неактивных целей в галактике с сортировкой по рангу и расстоянию."
        },
        {
          "type": "Feature",
          "text": "Оптимизатор времени исследований: Инструмент для расчёта точной длительности исследований, уровней лабораторий и МИС."
        },
        {
          "type": "Bugfix",
          "text": "Статус целей в Радаре рейдов: Статусы активности целей мгновенно обновляются при сканировании галактики."
        },
        {
          "type": "Bugfix",
          "text": "Безопасная синхронизация Радара рейдов: Исключено случайное удаление целей при синхронизации между устройствами."
        },
        {
          "type": "Bugfix",
          "text": "Корабли в полёте у скупщика лома: Флот на заданиях теперь полностью учитывается при расчёте утилизации."
        },
        {
          "type": "Bugfix",
          "text": "Пакеты ресурсов в Планировщике: Исправлен расчёт пакетов ресурсов и добавление корзины."
        },
        {
          "type": "Polishing",
          "text": "Обработка сообщений: Улучшен парсинг метаданных сообщений и элементы интерфейса игры."
        }
      ]
    }
  ],
  tr: [
    {
      "version": "v1.2.7",
      "items": [
        { "type": "Feature", "text": "Çoklu Dil Desteği: Nexus artık kontrol paneli başlığında, ayarlarda ve oyun içi mesajlarda kolay dil seçici ile 12 dilde kullanılabilir." },
        { "type": "Feature", "text": "Tüm Gezegenler İçin Maliyet Planlayıcı ve Sepet Düzenleme: Tek tıkla tüm gezegenlere geliştirme ekleyin ve sepetinizdeki hedef seviyeleri doğrudan düzenleyin." },
        { "type": "Feature", "text": "Astrofizik Amortisman Hesaplayıcı: Amortisman aracında Astrofizik ile yeni koloni yuvaları açmanın geri ödeme sürelerini ve karlılığını hesaplayın." },
        { "type": "Feature", "text": "Hurda Tüccarı Yenilemesi: Kesin kaynak getirisi ve görevdeki filoların tam desteğiyle yeniden tasarlanmış hurda hesaplama aracı." },
        { "type": "Bugfix", "text": "Radar Sensöründe Ay Sayımı: Tüm sektörlerde ay sayısı ve radar tarama kapsama haritası düzeltildi." },
        { "type": "Bugfix", "text": "Overwatch Galaksi Eşitleme ve Canlı Akış [Kapalı Beta]: Canlı evren akışında yeni koloni ve ay bildirimleri ile oyuncu sınıfı gösterimleri düzeltildi." }
      ]
    },
    {
      "version": "v1.2.6",
      "items": [
        {
          "type": "Feature",
          "text": "Overwatch Sensör Radarı [Kapalı Beta]: Dairesel evren eşlemesiyle tüm ittifak aylarının tarama menzilini gösteren taktiksel sensör ağı."
        },
        {
          "type": "Feature",
          "text": "Ayrı Kaynak Amortisman Hesaplayıcı: Yatırım geri dönüş sürelerini Metal, Kristal veya Döteryum için ayrı ayrı anlık ROI ile hesaplayın."
        },
        {
          "type": "Feature",
          "text": "Çoklu Hesap Değiştirici: Açık olan ekranınızı kaybetmeden sol alt panelden tüm evren hesaplarınız arasında kolayca geçiş yapın."
        },
        {
          "type": "Feature",
          "text": "Okunmamış Evren Olayları Sayacı [Kapalı Beta]: İstihbarat sekmesindeki canlı sayaç, yeni oyuncu hareketleri veya ittifak olaylarında anında uyarır."
        },
        {
          "type": "Bugfix",
          "text": "Dairesel Evren Uçuş Mesafeleri: Baskın Radarı ve Radar taramalarında dairesel evrenler için en kısa rotalar düzeltildi."
        },
        {
          "type": "Bugfix",
          "text": "Overwatch Kararlılık İyileştirmeleri [Kapalı Beta]: İttifak sekmeleri yüklenirken oluşan çökmeler ve 1v1 düello ekranları düzeltildi."
        },
        {
          "type": "Bugfix",
          "text": "Canlı Oyuncu Karşılaştırma Skorları: Oyuncu karşılaştırması artık anlık en son canlı sıralamalarla güncellenir."
        },
        {
          "type": "Bugfix",
          "text": "Doğru Galaksi Uyarıları: Terk edilen gezegenler, yeni koloniler ve oyuncu durumu değişikliklerindeki yanlış uyarılar düzeltildi."
        },
        {
          "type": "Bugfix",
          "text": "Başlangıç Koordinatları Koruması: Başlangıç sistemi koordinatları (1:1) ve yönetici hesaplarının yanlış uyarı vermesi engellendi."
        },
        {
          "type": "Bugfix",
          "text": "Tatil Modu ve Ay Koruması: Tatil modundaki hesapların ve aktif ayı olan gezegenlerin terk edilmiş görünmesi engellendi."
        }
      ]
    },
    {
      "version": "v1.2.5",
      "items": [
        {
          "type": "Feature",
          "text": "Nexus Overwatch [Kapalı Beta]: İttifak istihbarat paylaşımı, canlı evren etkinliği ve çoklu cihaz bulut yedekleme."
        },
        {
          "type": "Feature",
          "text": "Çoklu Cihaz Kişisel Kasa: Keşifler, savaşlar, enkaz toplamaları ve maliyet planlayıcı için özel Kasa Anahtarınızla güvenli bulut yedekleme."
        },
        {
          "type": "Feature",
          "text": "Baskın Radarı İnaktif Tarayıcı: Sıralama ve mesafeye göre sıralanmış kazançlı inaktif hedefleri evrende tarayın."
        },
        {
          "type": "Feature",
          "text": "Araştırma Süresi Optimize Edici: Kesin araştırma süreleri, en uygun laboratuvar kademeleri ve GAÖ eşikleri hesaplayıcı."
        },
        {
          "type": "Bugfix",
          "text": "Baskın Radarı Canlı Durum: Hedeflerin inaktif/aktif durumları artık canlı galaksi taramalarından anında güncellenir."
        },
        {
          "type": "Bugfix",
          "text": "Baskın Radarı Güvenli Senkronizasyon: Cihazlar arası senkronizasyon sırasında hedeflerin silinmesini önleyen güvenli hedef çözümleme."
        },
        {
          "type": "Bugfix",
          "text": "Hurda Aracında Uçuşta Olan Gemiler: Görevdeki filolar artık hurda ve filo kapasitesi dökümlerine tam olarak dahil edilir."
        },
        {
          "type": "Bugfix",
          "text": "Maliyet Planlayıcı Hammadde Paketleri: Büyük hedefler planlanırken hammadde paketi hesaplamaları düzeltildi."
        },
        {
          "type": "Polishing",
          "text": "Mesaj İşleme Hattı: Daha temiz mesaj meta veri işleme ve genişletilmiş oyun içi kutu geliştirmeleri."
        }
      ]
    }
  ],
  br: [
    {
      "version": "v1.2.7",
      "items": [
        { "type": "Feature", "text": "Suporte Multi-Idioma: O Nexus agora está disponível em 12 idiomas com um seletor fácil no cabeçalho do painel, configurações e mensagens do jogo." },
        { "type": "Feature", "text": "Planejador de Custos para Todos os Planetas e Edição do Carrinho: Adicione melhorias em todos os planetas com um clique e edite os níveis desejados diretamente no carrinho." },
        { "type": "Feature", "text": "Calculadora de Amortização de Astrofísica: Calcule o tempo de retorno e a velocidade de amortização para desbloquear novas colônias via Astrofísica na ferramenta de Amortização." },
        { "type": "Feature", "text": "Reformulação do Mercador de Sucata: Ferramenta redesenhada com retorno exato de recursos e suporte a frotas em missão." },
        { "type": "Bugfix", "text": "Contagem de Luas na Falange de Sensores: Corrigida a contagem de luas e o mapa de cobertura de sensores em todos os setores." },
        { "type": "Bugfix", "text": "Sincronização de Galáxia e Feed em Tempo Real Overwatch [Beta Fechado]: Corrigidos os alertas de novas colônias e luas no feed do universo e exibição de classes de jogador." }
      ]
    },
    {
      "version": "v1.2.6",
      "items": [
        {
          "type": "Feature",
          "text": "Sensor Phalanx Overwatch [Beta Fechado]: Grade tática de sensores de aliança exibindo o alcance de escaneamento de todas as luas com suporte a universos circulares."
        },
        {
          "type": "Feature",
          "text": "Calculadora de Amortização por Recurso Individual: Calcule o retorno de investimento separadamente para Metal, Cristal ou Deutério com ROI instantâneo."
        },
        {
          "type": "Feature",
          "text": "Alternador de Múltiplas Contas: Alterne suavemente entre todas as suas contas de universos diretamente pelo dock inferior esquerdo sem perder a visão ativa."
        },
        {
          "type": "Feature",
          "text": "Contador de Eventos da Galáxia [Beta Fechado]: Notificação em tempo real na aba de Inteligência alerta imediatamente sobre novos movimentos de jogadores ou eventos."
        },
        {
          "type": "Bugfix",
          "text": "Distâncias de voo em universos circulares: Corrigidas as rotas mais curtas e distâncias para universos circulares no Radar de Ataques e Phalanx."
        },
        {
          "type": "Bugfix",
          "text": "Estabilidade do Overwatch [Beta Fechado]: Resolvidos travamentos no carregamento de abas da aliança e garantida estabilidade em duelos 1v1."
        },
        {
          "type": "Bugfix",
          "text": "Classificações ao vivo no painel de comparação: A comparação entre jogadores atualiza imediatamente os rankings mais recentes."
        },
        {
          "type": "Bugfix",
          "text": "Alertas de atividade precisos: Eliminadas notificações falsas de abandono de planetas, novas colonizações e mudanças de status."
        },
        {
          "type": "Bugfix",
          "text": "Proteção de coordenadas de origem: Coordenadas de origem (1:1) e contas de administração não disparam mais alertas falsos."
        },
        {
          "type": "Bugfix",
          "text": "Proteção de modo de férias e luas: Contas em modo de férias e planetas com lua não são mais reportados erroneamente como abandonados."
        }
      ]
    },
    {
      "version": "v1.2.5",
      "items": [
        {
          "type": "Feature",
          "text": "Nexus Overwatch [Beta Fechado]: Compartilhamento de inteligência de aliança, atividade do universo ao vivo e backup na nuvem."
        },
        {
          "type": "Feature",
          "text": "Cofre Pessoal Multidispositivo: Backup seguro na nuvem e sincronização para expedições, combates, coletas e planejador de custos."
        },
        {
          "type": "Feature",
          "text": "Radar de Ataques rastreador de inativos: Escaneie o universo buscando alvos inativos ordenados por classificação e distância."
        },
        {
          "type": "Feature",
          "text": "Otimizador de tempo de pesquisa: Ferramenta dedicada para calcular durações exatas de pesquisa, níveis de laboratório e limiares de RII."
        },
        {
          "type": "Bugfix",
          "text": "Status ao vivo no Radar de Ataques: O status de inativo/ativo atualiza instantaneamente a partir de escaneamentos da galáxia."
        },
        {
          "type": "Bugfix",
          "text": "Sincronização segura no Radar de Ataques: Resolução segura durante a sincronização entre dispositivos sem perda de alvos."
        },
        {
          "type": "Bugfix",
          "text": "Naves em voo no Sucateiro: Frotas em missão agora são contabilizadas por completo nos cálculos de desmanche."
        },
        {
          "type": "Bugfix",
          "text": "Pacotes de recursos no Planejador: Corrigidos os cálculos de pacotes e importação do carrinho ao planejar metas."
        },
        {
          "type": "Polishing",
          "text": "Processamento de mensagens: Limpeza no processamento de metadados de mensagens e aprimoramentos no jogo."
        }
      ]
    }
  ],
  pt: [
    {
      "version": "v1.2.7",
      "items": [
        { "type": "Feature", "text": "Suporte Multi-Língua: O Nexus está agora disponível em 12 idiomas com um seletor simples no cabeçalho do painel, definições e mensagens do jogo." },
        { "type": "Feature", "text": "Planeador de Custos para Todos os Planetas e Edição do Carrinho: Adicione melhorias em todos os planetas com um clique e edite os níveis desejados diretamente no carrinho." },
        { "type": "Feature", "text": "Calculadora de Amortização de Astrofísica: Calcule os tempos de retorno e rentabilidade ao desbloquear novas colónias através de Astrofísica na ferramenta de Amortização." },
        { "type": "Feature", "text": "Remodelação do Mercado de Sucata: Ferramenta redesenhada com cálculo exato de recursos recuperados e suporte total a frotas em missão." },
        { "type": "Bugfix", "text": "Contagem de Luas na Falange de Sensores: Corrigida a contagem de luas e o mapa de cobertura da falange em todos os setores." },
        { "type": "Bugfix", "text": "Sincronização de Galáxia e Feed em Direto Overwatch [Beta Fechado]: Corrigidos os alertas de novas colónias e luas no feed do universo e a apresentação das classes de jogador." }
      ]
    },
    {
      "version": "v1.2.6",
      "items": [
        {
          "type": "Feature",
          "text": "Sensor Phalanx Overwatch [Beta Fechado]: Grelha táctica de sensores da aliança exibindo o alcance de varrimento de todas as luas com suporte a universos circulares."
        },
        {
          "type": "Feature",
          "text": "Calculadora de Amortização por Recurso Individual: Calcule o retorno de investimento separadamente para Metal, Cristal ou Deutério com ROI imediato."
        },
        {
          "type": "Feature",
          "text": "Alternador de Múltiplas Contas: Alterne comodamente entre todas as suas contas de universos directamente pelo menu inferior esquerdo sem perder o ecrã activo."
        },
        {
          "type": "Feature",
          "text": "Contador de Eventos da Galáxia [Beta Fechado]: Notificação em tempo real no separador de Inteligência alerta de imediato sobre movimentações de jogadores ou eventos."
        },
        {
          "type": "Bugfix",
          "text": "Distâncias de voo em universos circulares: Corrigidas as rotas mais curtas e distâncias para universos circulares no Radar de Ataques e Phalanx."
        },
        {
          "type": "Bugfix",
          "text": "Estabilidade do Overwatch [Beta Fechado]: Resolvidos bloqueios no carregamento de separadores da aliança e garantida estabilidade em duelos 1v1."
        },
        {
          "type": "Bugfix",
          "text": "Tabelas em directo no painel de comparação: A comparação entre jogadores actualiza de imediato as classificações mais recentes."
        },
        {
          "type": "Bugfix",
          "text": "Alertas de actividade precisos: Eliminadas notificações falsas de abandono de planetas, novas colonizações e alterações de estado."
        },
        {
          "type": "Bugfix",
          "text": "Protecção de coordenadas de origem: Coordenadas de origem (1:1) e contas de administração já não accionam alertas falsos."
        },
        {
          "type": "Bugfix",
          "text": "Protecção de modo de férias e luas: Contas em modo de férias e planetas com lua activa já não são reportados erradamente como abandonados."
        }
      ]
    },
    {
      "version": "v1.2.5",
      "items": [
        {
          "type": "Feature",
          "text": "Nexus Overwatch [Beta Fechado]: Partilha de inteligência da aliança, actividade do universo em directo e cópia na nuvem."
        },
        {
          "type": "Feature",
          "text": "Cofre Pessoal Multidispositivo: Cópia segura na nuvem e sincronização para expedições, combates, recolhas e planeador de custos."
        },
        {
          "type": "Feature",
          "text": "Radar de Ataques explorador de inactivos: Faça a busca no universo por alvos inactivos ordenados por classificação e distância."
        },
        {
          "type": "Feature",
          "text": "Optimizador de tempos de pesquisa: Ferramenta dedicada para calcular durações exactas de pesquisas, níveis de laboratório e patamares da RII."
        },
        {
          "type": "Bugfix",
          "text": "Estado em directo no Radar de Ataques: O estado de inactivo/activo é actualizado de imediato a partir de pesquisas na galáxia."
        },
        {
          "type": "Bugfix",
          "text": "Sincronização segura no Radar de Ataques: Resolução segura durante a sincronização entre dispositivos sem perda de alvos."
        },
        {
          "type": "Bugfix",
          "text": "Naves em voo no Sucateiro: Frotas em missão são agora contabilizadas na íntegra nos cálculos de desmantelamento."
        },
        {
          "type": "Bugfix",
          "text": "Pacotes de recursos no Planeador: Corrigidos os cálculos de pacotes e importação do carrinho ao planear metas."
        },
        {
          "type": "Polishing",
          "text": "Processamento de mensagens: Limpeza no tratamento de metadados das mensagens e melhorias na interface do jogo."
        }
      ]
    }
  ],
};

// Backwards-compatibility export
export const NEXUS_CHANGELOGS: ChangelogVersion[] = NEXUS_CHANGELOGS_I18N.en;

const TYPE_LABELS: Record<SupportedLanguage, Record<ChangelogItem['type'], string>> = {
  "en": {
    "Feature": "Feature",
    "Bugfix": "Bugfix",
    "Polishing": "Polishing",
    "Data": "Data",
    "External": "External"
  },
  "ro": {
    "Feature": "Funcție",
    "Bugfix": "Corecție",
    "Polishing": "Optimizare",
    "Data": "Date",
    "External": "Extern"
  },
  "de": {
    "Feature": "Funktion",
    "Bugfix": "Fehlerbehebung",
    "Polishing": "Optimierung",
    "Data": "Daten",
    "External": "Extern"
  },
  "fr": {
    "Feature": "Nouveauté",
    "Bugfix": "Correctif",
    "Polishing": "Amélioration",
    "Data": "Données",
    "External": "Externe"
  },
  "pl": {
    "Feature": "Funkcja",
    "Bugfix": "Poprawka",
    "Polishing": "Optymalizacja",
    "Data": "Dane",
    "External": "Zewnętrzne"
  },
  "nl": {
    "Feature": "Functie",
    "Bugfix": "Bugfix",
    "Polishing": "Optimalisatie",
    "Data": "Gegevens",
    "External": "Extern"
  },
  "es": {
    "Feature": "Función",
    "Bugfix": "Corrección",
    "Polishing": "Optimización",
    "Data": "Datos",
    "External": "Externo"
  },
  "it": {
    "Feature": "Funzione",
    "Bugfix": "Correzione",
    "Polishing": "Ottimizzazione",
    "Data": "Dati",
    "External": "Esterno"
  },
  "ru": {
    "Feature": "Функция",
    "Bugfix": "Исправление",
    "Polishing": "Оптимизация",
    "Data": "Данные",
    "External": "Внешнее"
  },
  "tr": {
    "Feature": "Özellik",
    "Bugfix": "Hata Düzeltme",
    "Polishing": "İyileştirme",
    "Data": "Veri",
    "External": "Harici"
  },
  "br": {
    "Feature": "Recurso",
    "Bugfix": "Correção",
    "Polishing": "Otimização",
    "Data": "Dados",
    "External": "Externo"
  },
  "pt": {
    "Feature": "Funcionalidade",
    "Bugfix": "Correcção",
    "Polishing": "Optimização",
    "Data": "Dados",
    "External": "Externo"
  }
};

const UI_TEXTS: Record<SupportedLanguage, {
  headerTitle: string;
  changelogTitle: string;
  donationsTitle: string;
  donationsIntro: string;
  donationLinkPrefix: string;
  donationLinkText: string;
  affiliateTitle: string;
  affiliateStep1: string;
  affiliateStep2: string;
  affiliateStep3Html: string;
  affiliateNote: string;
  thankYou: string;
}> = {
  en: {
    headerTitle: "OGame Nexus Update Center",
    changelogTitle: "Changelog",
    donationsTitle: "Donations & Support",
    donationsIntro: "There are two ways to support the development of this extension:",
    donationLinkPrefix: "Using the donation link here : ",
    donationLinkText: "Buy me a coffee <3",
    affiliateTitle: "Using the official Gameforge affiliation link (only works when starting a new universe)",
    affiliateStep1: "1. Go here : ",
    affiliateStep2: "2. Click on the \"play button\" and login with your Gameforge Account to it",
    affiliateStep3Html: "3. Your lobby is now connected to OGame Nexus for the next <span style=\"color: #f97316; font-weight: 700;\">24h</span>, then, starting a <span style=\"text-decoration: underline;\">new universe</span> will link it to the OGame Nexus affiliate programme for the next <span style=\"color: #f97316; font-weight: 700;\">12 months</span>",
    affiliateNote: "For this period, each time you purchase Darkmatter on this universe, a portion goes to support OGame Nexus development (while keeping the exact same price and DM amount for you)",
    thankYou: "Thank you !"
  },
  ro: {
    headerTitle: "Centrul de actualizări OGame Nexus",
    changelogTitle: "Istoric actualizări",
    donationsTitle: "Donații & Susținere",
    donationsIntro: "Există două modalități de a susține dezvoltarea acestei extensii:",
    donationLinkPrefix: "Folosind linkul de donații aici : ",
    donationLinkText: "Cumpără-mi o cafea <3",
    affiliateTitle: "Folosind linkul oficial de afiliere Gameforge (funcționează doar la începerea unui univers nou)",
    affiliateStep1: "1. Accesează aici : ",
    affiliateStep2: "2. Apasă pe butonul \"Play\" și autentifică-te cu contul tău Gameforge",
    affiliateStep3Html: "3. Lobby-ul tău este conectat la OGame Nexus pentru următoarele <span style=\"color: #f97316; font-weight: 700;\">24h</span>; începerea unui <span style=\"text-decoration: underline;\">univers nou</span> îl va conecta la programul de afiliere OGame Nexus pentru următoarele <span style=\"color: #f97316; font-weight: 700;\">12 luni</span>",
    affiliateNote: "În această perioadă, de fiecare dată când cumperi Materie Întunecată pe acest univers, o parte susține dezvoltarea OGame Nexus (fără niciun cost suplimentar pentru tine, prețul și cantitatea de MO rămân identice)",
    thankYou: "Mulțumim !"
  },
  de: {
    headerTitle: "OGame Nexus Update-Zentrale",
    changelogTitle: "Änderungsprotokoll",
    donationsTitle: "Spenden & Unterstützung",
    donationsIntro: "Es gibt zwei Möglichkeiten, die Weiterentwicklung dieser Erweiterung zu unterstützen:",
    donationLinkPrefix: "Über den Spendenlink hier : ",
    donationLinkText: "Spendier mir einen Kaffee <3",
    affiliateTitle: "Über den offiziellen Gameforge-Affiliate-Link (funktioniert nur beim Start in einem neuen Universum)",
    affiliateStep1: "1. Hier aufrufen : ",
    affiliateStep2: "2. Klicke auf den \"Spielen\"-Button und logge dich mit deinem Gameforge-Account ein",
    affiliateStep3Html: "3. Deine Lobby ist nun für die nächsten <span style=\"color: #f97316; font-weight: 700;\">24h</span> mit OGame Nexus verbunden; der Start in ein <span style=\"text-decoration: underline;\">neues Universum</span> verknüpft deinen Account für die nächsten <span style=\"color: #f97316; font-weight: 700;\">12 Monate</span> mit dem OGame Nexus Partnerprogramm",
    affiliateNote: "In diesem Zeitraum fließt bei jedem Dunkle-Materie-Kauf in diesem Universum ein Anteil in die Entwicklung von OGame Nexus (bei absolut gleichem Preis und gleicher DM-Menge für dich)",
    thankYou: "Vielen Dank !"
  },
  fr: {
    headerTitle: "Centre de mises à jour OGame Nexus",
    changelogTitle: "Journal des modifications",
    donationsTitle: "Dons & Soutien",
    donationsIntro: "Il existe deux façons de soutenir le développement de cette extension :",
    donationLinkPrefix: "En utilisant le lien de don ici : ",
    donationLinkText: "Offrez-moi un café <3",
    affiliateTitle: "En utilisant le lien d'affiliation officiel Gameforge (fonctionne uniquement au démarrage d'un nouvel univers)",
    affiliateStep1: "1. Rendez-vous ici : ",
    affiliateStep2: "2. Cliquez sur le bouton \"Jouer\" et connectez-vous avec votre compte Gameforge",
    affiliateStep3Html: "3. Votre lobby est connecté à OGame Nexus pour les prochaines <span style=\"color: #f97316; font-weight: 700;\">24h</span> ; démarrer un <span style=\"text-decoration: underline;\">nouvel univers</span> le liera au programme d'affiliation OGame Nexus pour les <span style=\"color: #f97316; font-weight: 700;\">12 prochains mois</span>",
    affiliateNote: "Pendant cette période, chaque achat d'Antimatière sur cet univers contribue au développement d'OGame Nexus (au même prix et avec la même quantité d'AM pour vous)",
    thankYou: "Merci !"
  },
  pl: {
    "headerTitle": "Centrum aktualizacji OGame Nexus",
    "changelogTitle": "Dziennik zmian",
    "donationsTitle": "Darowizny i wsparcie",
    "donationsIntro": "Istnieją dwa sposoby na wsparcie rozwoju tego rozszerzenia:",
    "donationLinkPrefix": "Korzystając z linku do darowizn tutaj : ",
    "donationLinkText": "Postaw mi kawę <3",
    "affiliateTitle": "Korzystając z oficjalnego linku partnerskiego Gameforge (działa tylko przy starcie w nowym uniwersum)",
    "affiliateStep1": "1. Przejdź tutaj : ",
    "affiliateStep2": "2. Kliknij przycisk \"Graj\" i zaloguj się swoim kontem Gameforge",
    "affiliateStep3Html": "3. Twoje lobby jest połączone z OGame Nexus przez najbliższe <span style=\"color: #f97316; font-weight: 700;\">24h</span>; rozpoczęcie gry w <span style=\"text-decoration: underline;\">nowym uniwersum</span> połączy je z programem partnerskim OGame Nexus na kolejne <span style=\"color: #f97316; font-weight: 700;\">12 miesięcy</span>",
    "affiliateNote": "W tym okresie przy każdym zakupie Antymaterii w tym uniwersum część kwoty wspiera rozwój OGame Nexus (przy zachowaniu dokładnie tej samej ceny i ilości AM dla Ciebie)",
    "thankYou": "Dziękujemy !"
  },
  nl: {
    "headerTitle": "OGame Nexus Update-Centrum",
    "changelogTitle": "Changelog",
    "donationsTitle": "Donaties & Ondersteuning",
    "donationsIntro": "Er zijn twee manieren om de ontwikkeling van deze extensie te ondersteunen:",
    "donationLinkPrefix": "Via de donatielink hier : ",
    "donationLinkText": "Koop een koffie voor me <3",
    "affiliateTitle": "Via de officiële Gameforge-affiliatelink (werkt alleen bij de start in een nieuw universum)",
    "affiliateStep1": "1. Ga hierheen : ",
    "affiliateStep2": "2. Klik op de knop \"Spelen\" en log in met je Gameforge-account",
    "affiliateStep3Html": "3. Je lobby is nu voor de komende <span style=\"color: #f97316; font-weight: 700;\">24u</span> verbonden met OGame Nexus; starten in een <span style=\"text-decoration: underline;\">nieuw universum</span> koppelt je account voor de komende <span style=\"color: #f97316; font-weight: 700;\">12 maanden</span> aan het affiliateprogramma van OGame Nexus",
    "affiliateNote": "Gedurende deze periode gaat bij elke aankoop van Donkere Materie in dit universum een deel naar de ondersteuning van OGame Nexus (met exact dezelfde prijs en hoeveelheid DM voor jou)",
    "thankYou": "Bedankt !"
  },
  es: {
    "headerTitle": "Centro de actualizaciones OGame Nexus",
    "changelogTitle": "Registro de cambios",
    "donationsTitle": "Donaciones y apoyo",
    "donationsIntro": "Hay dos formas de apoyar el desarrollo de esta extensión:",
    "donationLinkPrefix": "Usando el enlace de donación aquí : ",
    "donationLinkText": "Invítame a un café <3",
    "affiliateTitle": "Usando el enlace de afiliación oficial de Gameforge (solo funciona al comenzar en un nuevo universo)",
    "affiliateStep1": "1. Ve aquí : ",
    "affiliateStep2": "2. Haz clic en el botón \"Jugar\" e inicia sesión con tu cuenta de Gameforge",
    "affiliateStep3Html": "3. Tu lobby estará conectado a OGame Nexus durante las próximas <span style=\"color: #f97316; font-weight: 700;\">24h</span>; comenzar un <span style=\"text-decoration: underline;\">nuevo universo</span> lo vinculará al programa de afiliados de OGame Nexus durante los próximos <span style=\"color: #f97316; font-weight: 700;\">12 meses</span>",
    "affiliateNote": "Durante este período, cada vez que compres Materia Oscura en este universo, una parte apoyará el desarrollo de OGame Nexus (manteniendo exactamente el mismo precio y cantidad de MO para ti)",
    "thankYou": "¡Muchas gracias!"
  },
  it: {
    "headerTitle": "Centro aggiornamenti OGame Nexus",
    "changelogTitle": "Registro delle modifiche",
    "donationsTitle": "Donazioni e supporto",
    "donationsIntro": "Ci sono due modi per supportare lo sviluppo di questa estensione:",
    "donationLinkPrefix": "Usando il link per le donazioni qui : ",
    "donationLinkText": "Offrimi un caffè <3",
    "affiliateTitle": "Usando il link di affiliazione ufficiale Gameforge (funziona solo all'inizio in un nuovo universo)",
    "affiliateStep1": "1. Vai qui : ",
    "affiliateStep2": "2. Clicca sul pulsante \"Gioca\" e accedi con il tuo account Gameforge",
    "affiliateStep3Html": "3. La tua lobby sarà collegata a OGame Nexus per le prossime <span style=\"color: #f97316; font-weight: 700;\">24h</span>; iniziare in un <span style=\"text-decoration: underline;\">nuovo universo</span> la collegherà al programma di affiliazione OGame Nexus per i successivi <span style=\"color: #f97316; font-weight: 700;\">12 mesi</span>",
    "affiliateNote": "Durante questo periodo, ogni volta che acquisti Materia Oscura in questo universo, una parte supporta lo sviluppo di OGame Nexus (allo stesso identico prezzo e quantità di MO per te)",
    "thankYou": "Grazie !"
  },
  ru: {
    "headerTitle": "Центр обновлений OGame Nexus",
    "changelogTitle": "Список изменений",
    "donationsTitle": "Пожертвования и поддержка",
    "donationsIntro": "Есть два способа поддержать разработку этого расширения:",
    "donationLinkPrefix": "Используя ссылку для пожертвований : ",
    "donationLinkText": "Купить мне кофе <3",
    "affiliateTitle": "Используя официальную партнёрскую ссылку Gameforge (работает только при старте в новой вселенной)",
    "affiliateStep1": "1. Перейдите сюда : ",
    "affiliateStep2": "2. Нажмите кнопку \"Играть\" и войдите со своим аккаунтом Gameforge",
    "affiliateStep3Html": "3. Ваше лобби подключено к OGame Nexus на ближайшие <span style=\"color: #f97316; font-weight: 700;\">24ч</span>; старт в <span style=\"text-decoration: underline;\">новой вселенной</span> привяжет её к партнёрской программе OGame Nexus на <span style=\"color: #f97316; font-weight: 700;\">12 месяцев</span>",
    "affiliateNote": "В течение этого периода при каждой покупке Тёмной Материи в этой вселенной часть средств идёт на поддержку разработки OGame Nexus (по точно такой же цене и количеству ТМ для вас)",
    "thankYou": "Спасибо !"
  },
  tr: {
    "headerTitle": "OGame Nexus Güncelleme Merkezi",
    "changelogTitle": "Değişiklik Günlüğü",
    "donationsTitle": "Bağışlar ve Destek",
    "donationsIntro": "Bu eklentinin gelişimini desteklemenin iki yolu vardır:",
    "donationLinkPrefix": "Buradaki bağış bağlantısını kullanarak : ",
    "donationLinkText": "Bana bir kahve ısmarla <3",
    "affiliateTitle": "Resmi Gameforge ortaklık bağlantısını kullanarak (yalnızca yeni bir evrene başlarken çalışır)",
    "affiliateStep1": "1. Buraya gidin : ",
    "affiliateStep2": "2. \"Oyna\" düğmesine tıklayın ve Gameforge Hesabınızla giriş yapın",
    "affiliateStep3Html": "3. Lobiniz sonraki <span style=\"color: #f97316; font-weight: 700;\">24 saat</span> boyunca OGame Nexus'a bağlanır; ardından <span style=\"text-decoration: underline;\">yeni bir evrende</span> başlamak, onu sonraki <span style=\"color: #f97316; font-weight: 700;\">12 ay</span> boyunca OGame Nexus ortaklık programına bağlar",
    "affiliateNote": "Bu süre boyunca, bu evrende Karanlık Madde satın aldığınız her seferde bir kısmı OGame Nexus gelişimine destek olur (sizin için tamamen aynı fiyat ve KM miktarıyla)",
    "thankYou": "Teşekkürler !"
  },
  br: {
    "headerTitle": "Central de Atualizações OGame Nexus",
    "changelogTitle": "Registro de Alterações",
    "donationsTitle": "Doações & Suporte",
    "donationsIntro": "Existem duas maneiras de apoiar o desenvolvimento desta extensão:",
    "donationLinkPrefix": "Usando o link de doação aqui : ",
    "donationLinkText": "Pague-me um café <3",
    "affiliateTitle": "Usando o link oficial de afiliação da Gameforge (funciona apenas ao iniciar em um novo universo)",
    "affiliateStep1": "1. Acesse aqui : ",
    "affiliateStep2": "2. Clique no botão \"Jogar\" e faça login com sua Conta Gameforge",
    "affiliateStep3Html": "3. Seu lobby agora está conectado ao OGame Nexus pelas próximas <span style=\"color: #f97316; font-weight: 700;\">24h</span>; iniciar em um <span style=\"text-decoration: underline;\">novo universo</span> o vinculará ao programa de afiliados do OGame Nexus pelos próximos <span style=\"color: #f97316; font-weight: 700;\">12 meses</span>",
    "affiliateNote": "Durante este período, cada vez que comprar Matéria Negra neste universo, uma parte apoia o desenvolvimento do OGame Nexus (mantendo exatamente o mesmo preço e quantidade de MN para você)",
    "thankYou": "Muito obrigado !"
  },
  pt: {
    "headerTitle": "Centro de Actualizações OGame Nexus",
    "changelogTitle": "Registo de Alterações",
    "donationsTitle": "Donativos & Apoio",
    "donationsIntro": "Existem duas formas de apoiar o desenvolvimento desta extensão:",
    "donationLinkPrefix": "Através da ligação de donativos aqui : ",
    "donationLinkText": "Pague-me um café <3",
    "affiliateTitle": "Através da ligação oficial de afiliação Gameforge (apenas funciona ao iniciar num novo universo)",
    "affiliateStep1": "1. Aceda aqui : ",
    "affiliateStep2": "2. Clique no botão \"Jogar\" e inicie sessão com a sua Conta Gameforge",
    "affiliateStep3Html": "3. O seu lobby fica ligado ao OGame Nexus durante as próximas <span style=\"color: #f97316; font-weight: 700;\">24h</span>; iniciar num <span style=\"text-decoration: underline;\">novo universo</span> irá associá-lo ao programa de afiliados OGame Nexus durante os próximos <span style=\"color: #f97316; font-weight: 700;\">12 meses</span>",
    "affiliateNote": "Durante este período, sempre que adquirir Matéria Negra neste universo, uma percentagem apoia o desenvolvimento do OGame Nexus (mantendo exactamente o mesmo preço e quantidade de MN para si)",
    "thankYou": "Muito obrigado !"
  }
};

/**
 * Retrieve the active language: checks manual override, server link letters, or fallback
 */
export async function getSelectedLanguage(): Promise<SupportedLanguage> {
  const ALL_LANGS: SupportedLanguage[] = ['en', 'de', 'fr', 'ro', 'pl', 'nl', 'es', 'it', 'ru', 'tr', 'br', 'pt'];

  // 1. Check chrome.storage.local for user-selected language first
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await chrome.storage.local.get(['ognexus_selected_language', 'ognexus_language_manual']);
      const val = res?.['ognexus_selected_language'];
      if (val && ALL_LANGS.includes(val as SupportedLanguage)) {
        return val as SupportedLanguage;
      }
    }
  } catch { }

  // 2. Check localStorage on current page
  try {
    const local = localStorage.getItem('ognexus_selected_language');
    if (local && ALL_LANGS.includes(local as SupportedLanguage)) {
      return local as SupportedLanguage;
    }
  } catch { }

  // 3. Fallback: Detect default language from OGame server link letters (e.g. s189-pl -> pl, s182-br -> br, s284-fr -> fr)
  try {
    const fromLocation = detectLanguageFromServerLink(window.location.href);
    if (fromLocation) return fromLocation;

    const metaUni = document.querySelector('meta[name="ogame-universe"]')?.getAttribute('content');
    const fromMetaUni = detectLanguageFromServerLink(metaUni);
    if (fromMetaUni) return fromMetaUni;

    const metaLang = document.querySelector('meta[name="ogame-language"]')?.getAttribute('content')?.toLowerCase();
    if (metaLang && ALL_LANGS.includes(metaLang as SupportedLanguage)) {
      return metaLang as SupportedLanguage;
    }
  } catch { }

  return 'en';
}

function getFlagSvg(lang: SupportedLanguage): string {
  switch (lang) {
    case 'ro':
      return `<svg width="18" height="12" viewBox="0 0 60 42" style="border-radius: 2px; vertical-align: middle; flex-shrink: 0;"><rect width="20" height="42" x="0" fill="#002B7F"/><rect width="20" height="42" x="20" fill="#FCD116"/><rect width="20" height="42" x="40" fill="#CE1126"/></svg>`;
    case 'de':
      return `<svg width="18" height="12" viewBox="0 0 60 42" style="border-radius: 2px; vertical-align: middle; flex-shrink: 0;"><rect width="60" height="14" y="0" fill="#212529"/><rect width="60" height="14" y="14" fill="#DD0000"/><rect width="60" height="14" y="28" fill="#FFCE00"/></svg>`;
    case 'fr':
      return `<svg width="18" height="12" viewBox="0 0 60 42" style="border-radius: 2px; vertical-align: middle; flex-shrink: 0;"><rect width="20" height="42" x="0" fill="#002395"/><rect width="20" height="42" x="20" fill="#FFFFFF"/><rect width="20" height="42" x="40" fill="#ED2939"/></svg>`;
    case 'pl':
      return `<svg width="18" height="12" viewBox="0 0 60 42" style="border-radius: 2px; vertical-align: middle; flex-shrink: 0;"><rect width="60" height="21" y="0" fill="#FFFFFF"/><rect width="60" height="21" y="21" fill="#DC143C"/></svg>`;
    case 'nl':
      return `<svg width="18" height="12" viewBox="0 0 60 42" style="border-radius: 2px; vertical-align: middle; flex-shrink: 0;"><rect width="60" height="14" y="0" fill="#AE1C28"/><rect width="60" height="14" y="14" fill="#FFFFFF"/><rect width="60" height="14" y="28" fill="#21468B"/></svg>`;
    case 'es':
      return `<svg width="18" height="12" viewBox="0 0 60 42" style="border-radius: 2px; vertical-align: middle; flex-shrink: 0;"><rect width="60" height="42" fill="#AA151B"/><rect width="60" height="21" y="10.5" fill="#F1BF00"/></svg>`;
    case 'it':
      return `<svg width="18" height="12" viewBox="0 0 60 42" style="border-radius: 2px; vertical-align: middle; flex-shrink: 0;"><rect width="20" height="42" x="0" fill="#009246"/><rect width="20" height="42" x="20" fill="#FFFFFF"/><rect width="20" height="42" x="40" fill="#CE2B37"/></svg>`;
    case 'ru':
      return `<svg width="18" height="12" viewBox="0 0 60 42" style="border-radius: 2px; vertical-align: middle; flex-shrink: 0;"><rect width="60" height="14" y="0" fill="#FFFFFF"/><rect width="60" height="14" y="14" fill="#0039A6"/><rect width="60" height="14" y="28" fill="#D52B1E"/></svg>`;
    case 'tr':
      return `<svg width="18" height="12" viewBox="0 0 60 42" style="border-radius: 2px; vertical-align: middle; flex-shrink: 0;"><rect width="60" height="42" fill="#E30A17"/><circle cx="23" cy="21" r="10" fill="#FFFFFF"/><circle cx="26" cy="21" r="8" fill="#E30A17"/><polygon points="34,16.5 35.8,20.2 39.8,20.2 36.6,22.6 37.8,26.5 34.5,24 31.2,26.5 32.4,22.6 29.2,20.2 33.2,20.2" fill="#FFFFFF"/></svg>`;
    case 'br':
      return `<svg width="18" height="12" viewBox="0 0 60 42" style="border-radius: 2px; vertical-align: middle; flex-shrink: 0;"><rect width="60" height="42" fill="#009739"/><polygon points="30,5 55,21 30,37 5,21" fill="#FEDD00"/><circle cx="30" cy="21" r="8" fill="#012169"/><path d="M22,23 Q30,17 38,21" stroke="#FFFFFF" stroke-width="1.5" fill="none"/></svg>`;
    case 'pt':
      return `<svg width="18" height="12" viewBox="0 0 60 42" style="border-radius: 2px; vertical-align: middle; flex-shrink: 0;"><rect width="24" height="42" x="0" fill="#006600"/><rect width="36" height="42" x="24" fill="#FF0000"/><circle cx="24" cy="21" r="7.5" fill="#FFCC00" stroke="#000000" stroke-width="0.5"/><path d="M20,16 h8 v7 a4,4 0 0,1 -8,0 z" fill="#FFFFFF" stroke="#000000" stroke-width="0.5"/><path d="M21,17 h6 v5 a3,3 0 0,1 -6,0 z" fill="#FF0000"/><rect width="3" height="4" x="22.5" y="18" fill="#FFFFFF"/></svg>`;
    case 'en':
    default:
      return `<svg width="18" height="12" viewBox="0 0 60 42" style="border-radius: 2px; vertical-align: middle; flex-shrink: 0;"><clipPath id="uk-c-tab"><rect width="60" height="42" rx="2"/></clipPath><g clipPath="url(#uk-c-tab)"><rect width="60" height="42" fill="#012169"/><path d="M0,0 L60,42 M60,0 L0,42" stroke="#fff" stroke-width="8"/><path d="M0,0 L60,42 M60,0 L0,42" stroke="#C8102E" stroke-width="4"/><path d="M30,0 v42 M0,21 h60" stroke="#fff" stroke-width="12"/><path d="M30,0 v42 M0,21 h60" stroke="#C8102E" stroke-width="7"/></g></svg>`;
  }
}

export function injectChangelogTab(): void {
  const mainTabs = document.querySelector('.mainTabs') as HTMLElement | null;
  if (!mainTabs) return;

  const existingTab = mainTabs.querySelector('.nexus_boardMessageTab');
  if (existingTab) return;

  // IMPORTANT: Do NOT include 'singleTab' class here so OGame's jQuery AJAX interceptor doesn't hijack the click!
  const div = document.createElement('div');
  div.className = 'ogl_boardMessageTab nexus_boardMessageTab';

  let iconUrl = '';
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      iconUrl = chrome.runtime.getURL('icons/nexus.png');
    }
  } catch (e) { }

  const CURRENT_CHANGELOG_VERSION = 'v1.2.9';
  const hasSeenChangelog = localStorage.getItem('og-nexus-changelog-seen') === CURRENT_CHANGELOG_VERSION;

  div.innerHTML = `
    <div class="tabImage">
      ${iconUrl ? `<img src="${iconUrl}" class="nexus-main-tab-img" alt="OGNexus" />` : `<div class="nexus-main-tab-fallback">🌌</div>`}
    </div>
    <div class="tabLabel">OGNexus</div>
    <div class="newMessagesCount ${hasSeenChangelog ? 'nexus_hidden' : ''}">new</div>
  `;

  // Attach click listener
  div.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Mark current changelog version as seen and dismiss "new" badge
    localStorage.setItem('og-nexus-changelog-seen', CURRENT_CHANGELOG_VERSION);
    const badge = div.querySelector('.newMessagesCount');
    if (badge) {
      badge.classList.add('nexus_hidden');
    }

    const wrapper = document.querySelector('#messagewrapper, #messages') as HTMLElement | null;
    if (!wrapper) return;

    wrapper.innerText = '';
    const inner = document.createElement('div');
    inner.id = 'nexusBoardTab';
    wrapper.appendChild(inner);

    const messageComponent = document.querySelector('#messagescomponent, #messagecontainercomponent .messageContent') as HTMLElement | null;
    if (messageComponent) {
      messageComponent.dataset.tab = '0';
    }

    document.querySelectorAll('.mainTabs .marker').forEach(el => el.classList.remove('marker'));
    div.classList.add('marker');

    const activeLang = await getSelectedLanguage();
    renderNexusChangelogAndDonations(inner, activeLang);
  });

  mainTabs.appendChild(div);

  // When any regular OGame tab is clicked, remove our active marker
  const otherTabs = mainTabs.querySelectorAll('.singleTab');
  otherTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      div.classList.remove('marker');
    });
  });
}

function renderNexusChangelogAndDonations(inner: HTMLElement, currentLang: SupportedLanguage = 'en'): void {
  const releases = NEXUS_CHANGELOGS_I18N[currentLang] || NEXUS_CHANGELOGS_I18N.en;
  const labels = TYPE_LABELS[currentLang] || TYPE_LABELS.en;
  const texts = UI_TEXTS[currentLang] || UI_TEXTS.en;

  const supportedLanguages: { code: SupportedLanguage; label: string; name: string }[] = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'ro', label: 'RO', name: 'Română' },
    { code: 'de', label: 'DE', name: 'Deutsch' },
    { code: 'fr', label: 'FR', name: 'Français' },
    { code: 'pl', label: 'PL', name: 'Polski' },
    { code: 'nl', label: 'NL', name: 'Nederlands' },
    { code: 'es', label: 'ES', name: 'Español' },
    { code: 'it', label: 'IT', name: 'Italiano' },
    { code: 'ru', label: 'RU', name: 'Русский' },
    { code: 'tr', label: 'TR', name: 'Türkçe' },
    { code: 'br', label: 'BR', name: 'Português (BR)' },
    { code: 'pt', label: 'PT', name: 'Português (PT)' }
  ];

  const currentFlagSvg = getFlagSvg(currentLang);
  const currentLangLabel = supportedLanguages.find(l => l.code === currentLang)?.label || currentLang.toUpperCase();

  const dropdownOptionsHtml = supportedLanguages.map(item => {
    const isCurrent = item.code === currentLang;
    const flagSvg = getFlagSvg(item.code);
    return `
      <div
        class="nexus-lang-option"
        data-lang="${item.code}"
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 9px;
          border-radius: 6px;
          background: ${isCurrent ? 'rgba(0, 242, 255, 0.15)' : 'transparent'};
          color: ${isCurrent ? '#00f2ff' : '#cbd5e1'};
          font-weight: ${isCurrent ? '700' : '500'};
          font-size: 11.5px;
          cursor: pointer;
          transition: all 0.15s ease;
        "
      >
        <div style="display: flex; align-items: center; gap: 8px;">
          ${flagSvg}
          <span>${item.name} (${item.code.toUpperCase()})</span>
        </div>
        ${isCurrent ? `<span style="color: #00f2ff; font-weight: 800; font-size: 12px;">✓</span>` : ''}
      </div>
    `;
  }).join('');

  let changelogsHtml = '';

  releases.forEach((release, index) => {
    const itemsHtml = release.items.map(item => {
      let tagColor = '#38bdf8'; // Polishing default
      if (item.type === 'Feature') tagColor = '#c084fc';
      else if (item.type === 'Bugfix') tagColor = '#fbbf24';
      else if (item.type === 'Data') tagColor = '#34d399';
      else if (item.type === 'External') tagColor = '#2dd4bf';

      const typeLabel = labels[item.type] || item.type;

      return `
        <div style="margin-bottom: 7px; line-height: 1.55;">
          <span style="color: ${tagColor}; font-weight: 700;">[${typeLabel}]</span>
          <span style="color: #cbd5e1; margin-left: 5px;">${item.text}</span>
        </div>
      `;
    }).join('');

    changelogsHtml += `
      <div class="nexus_changelog_entry" style="margin-bottom: 24px;">
        <h1 style="color: #ffffff; font-size: 19px; font-weight: 700; margin: 0 0 14px 0;">${texts.changelogTitle} ${release.version}</h1>
        ${itemsHtml}
      </div>
      ${index < releases.length - 1 ? `<hr style="background: #282d34; border: none; height: 1px; margin: 26px 0;" />` : ''}
    `;
  });

function getAffiliateButtonText(lang: SupportedLanguage): string {
  switch (lang) {
    case 'ro': return "Susține gratuit (Link GF)";
    case 'de': return "Kostenlos helfen (GF-Link)";
    case 'fr': return "Soutien gratuit (Lien GF)";
    case 'pl': return "Darmowe wsparcie (Link GF)";
    case 'nl': return "Gratis steunen (GF-link)";
    case 'es': return "Apoyo gratuito (Enlace GF)";
    case 'it': return "Supporto gratuito (Link GF)";
    case 'ru': return "Бесплатная поддержка (GF)";
    case 'tr': return "Ücretsiz Destek (GF)";
    case 'br': return "Apoie gratuitamente (Link GF)";
    case 'pt': return "Apoie gratuitamente (Ligação GF)";
    case 'en':
    default:
      return "Free Support (GF Link)";
  }
}

function getCloseGuideText(lang: SupportedLanguage): string {
  switch (lang) {
    case 'ro': return "Închide ghidul";
    case 'de': return "Anleitung schließen";
    case 'fr': return "Fermer le guide";
    case 'pl': return "Zamknij instrukcję";
    case 'nl': return "Gids sluiten";
    case 'es': return "Cerrar guía";
    case 'it': return "Chiudi guida";
    case 'ru': return "Закрыть руководство";
    case 'tr': return "Rehberi kapat";
    case 'br': return "Fechar guia";
    case 'pt': return "Fechar guia";
    case 'en':
    default:
      return "Close guide";
  }
}

  const affiliateBtnText = getAffiliateButtonText(currentLang);
  const closeGuideText = getCloseGuideText(currentLang);

  const donationsHtml = `
    <div class="nexus_donations_banner" style="
      background: linear-gradient(135deg, rgba(14, 22, 38, 0.92) 0%, rgba(10, 16, 26, 0.96) 100%);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-left: 3px solid #f59e0b;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 22px;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <!-- Top Compact Bar -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <!-- Left: Icon + Title + Intro text -->
        <div style="display: flex; align-items: center; gap: 10px; min-width: 220px; flex: 1;">
          <div style="width: 30px; height: 30px; border-radius: 6px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 0 10px rgba(245, 158, 11, 0.2); flex-shrink: 0;">
            ☕
          </div>
          <div>
            <div style="color: #ffffff; font-size: 12.5px; font-weight: 700; letter-spacing: 0.3px; display: flex; align-items: center; gap: 6px;">
              <span>${texts.donationsTitle}</span>
            </div>
            <div style="color: #94a3b8; font-size: 11px; margin-top: 1px; line-height: 1.35;">
              ${texts.donationsIntro}
            </div>
          </div>
        </div>

        <!-- Right: Action Pills -->
        <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
          <!-- Ko-fi Pill -->
          <a
            href="https://ko-fi.com/W0M821KSSE"
            target="_blank"
            rel="noopener noreferrer"
            id="nexus-kofi-link-btn"
            style="
              display: inline-flex;
              align-items: center;
              gap: 6px;
              background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
              color: #ffffff;
              font-weight: 700;
              font-size: 11.5px;
              padding: 5px 12px;
              border-radius: 6px;
              text-decoration: none;
              box-shadow: 0 2px 10px rgba(217, 119, 6, 0.35);
              border: 1px solid rgba(251, 191, 36, 0.5);
              cursor: pointer;
              transition: all 0.18s ease;
            "
          >
            <span>☕</span>
            <span>${texts.donationLinkText}</span>
          </a>

          <!-- Gameforge Affiliate Pill (Toggle) -->
          <button
            type="button"
            id="nexus-affiliate-toggle-btn"
            style="
              display: inline-flex;
              align-items: center;
              gap: 6px;
              background: rgba(0, 242, 255, 0.08);
              color: #00f2ff;
              font-weight: 700;
              font-size: 11.5px;
              padding: 5px 12px;
              border-radius: 6px;
              box-shadow: 0 2px 10px rgba(0, 242, 255, 0.12);
              border: 1px solid rgba(0, 242, 255, 0.35);
              cursor: pointer;
              transition: all 0.18s ease;
            "
          >
            <span>🎮</span>
            <span>${affiliateBtnText}</span>
            <svg id="nexus-affiliate-toggle-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" style="vertical-align: middle; transition: transform 0.2s ease;">
              <path d="M1 1L5 5L9 1" stroke="#38bdf8" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Expandable Affiliate Drawer -->
      <div
        id="nexus-affiliate-drawer"
        style="
          display: none;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(56, 189, 248, 0.18);
        "
      >
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <div style="color: #38bdf8; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 6px;">
            <span>⭐</span>
            <span>${texts.affiliateTitle}</span>
          </div>
          <button
            type="button"
            id="nexus-affiliate-close-btn"
            style="
              background: transparent;
              border: none;
              color: #94a3b8;
              font-size: 11px;
              cursor: pointer;
              padding: 2px 6px;
              border-radius: 4px;
              transition: color 0.15s ease;
            "
          >
            ✕ ${closeGuideText}
          </button>
        </div>

        <!-- 3 Cards Layout -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 10px;">
          <!-- Step 1 -->
          <div style="background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 6px; padding: 10px 12px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-weight: 800; font-size: 10px; padding: 1px 6px; border-radius: 10px;">1</span>
              <span style="color: #cbd5e1; font-size: 11.5px; font-weight: 600;">${texts.affiliateStep1.replace(/^\d+\.\s*/, '')}</span>
            </div>
            <a
              href="https://hero.li/OGame-Vendetta"
              target="_blank"
              rel="noopener noreferrer"
              style="
                display: inline-flex;
                align-items: center;
                gap: 4px;
                color: #00f2ff;
                background: rgba(0, 242, 255, 0.1);
                border: 1px solid rgba(0, 242, 255, 0.3);
                border-radius: 4px;
                padding: 3px 8px;
                font-size: 11px;
                font-weight: 600;
                text-decoration: none;
              "
            >
              <span>hero.li/OGame-Vendetta</span>
              <span style="font-size: 10px;">↗</span>
            </a>
          </div>

          <!-- Step 2 -->
          <div style="background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 6px; padding: 10px 12px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-weight: 800; font-size: 10px; padding: 1px 6px; border-radius: 10px;">2</span>
              <span style="color: #cbd5e1; font-size: 11px; line-height: 1.45;">${texts.affiliateStep2.replace(/^\d+\.\s*/, '')}</span>
            </div>
          </div>

          <!-- Step 3 -->
          <div style="background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 6px; padding: 10px 12px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="background: rgba(249, 115, 22, 0.25); color: #f97316; font-weight: 800; font-size: 10px; padding: 1px 6px; border-radius: 10px;">3</span>
              <span style="color: #cbd5e1; font-size: 11px; line-height: 1.45;">${texts.affiliateStep3Html.replace(/^\d+\.\s*/, '')}</span>
            </div>
          </div>
        </div>

        <!-- Note & Thank you -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; background: rgba(56, 189, 248, 0.05); border-left: 3px solid #38bdf8; border-radius: 0 4px 4px 0; padding: 7px 12px;">
          <div style="color: #94a3b8; font-size: 11px; line-height: 1.5; flex: 1; min-width: 200px;">
            ${texts.affiliateNote}
          </div>
          <div style="color: #38bdf8; font-size: 11.5px; font-weight: 700; white-space: nowrap;">
            ${texts.thankYou} 🚀
          </div>
        </div>
      </div>
    </div>
  `;

  inner.innerHTML = `
    <div class="msg ogl_feedMessage" style="color: #b1b1b2; background: #101419; padding: 26px 25px; line-height: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-sizing: border-box;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid rgba(56, 189, 248, 0.25);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">🌌</span>
          <span style="color: #ffffff; font-size: 15px; font-weight: 700; letter-spacing: 0.5px;">${texts.headerTitle}</span>
        </div>
        <div class="nexus-changelog-lang-wrapper" style="position: relative; flex-shrink: 0;">
          <button
            type="button"
            id="nexus-lang-dropdown-trigger"
            style="
              display: inline-flex;
              align-items: center;
              gap: 7px;
              background: rgba(10, 18, 30, 0.85);
              border: 1px solid rgba(56, 189, 248, 0.4);
              border-radius: 7px;
              padding: 4px 10px;
              color: #00f2ff;
              font-weight: 700;
              font-size: 11.5px;
              cursor: pointer;
              transition: all 0.18s ease;
              box-shadow: 0 0 10px rgba(0, 242, 255, 0.12);
            "
          >
            ${currentFlagSvg}
            <span>${currentLangLabel}</span>
            <svg id="nexus-lang-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" style="vertical-align: middle; transition: transform 0.2s ease;">
              <path d="M1 1L5 5L9 1" stroke="#38bdf8" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <div
            id="nexus-lang-dropdown-menu"
            style="
              display: none;
              position: absolute;
              top: calc(100% + 5px);
              right: 0;
              z-index: 9999;
              min-width: 160px;
              max-height: 340px;
              overflow-y: auto;
              background: rgba(9, 14, 24, 0.98);
              border: 1px solid rgba(56, 189, 248, 0.35);
              border-radius: 8px;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9), 0 0 15px rgba(0, 242, 255, 0.15);
              padding: 5px;
              flex-direction: column;
              gap: 2px;
            "
          >
            ${dropdownOptionsHtml}
          </div>
        </div>
      </div>
      ${donationsHtml}
      ${changelogsHtml}
    </div>
  `;

  // Affiliate drawer toggle & button listeners
  const affiliateToggleBtn = inner.querySelector<HTMLButtonElement>('#nexus-affiliate-toggle-btn');
  const affiliateDrawer = inner.querySelector<HTMLDivElement>('#nexus-affiliate-drawer');
  const affiliateChevron = inner.querySelector<SVGElement>('#nexus-affiliate-toggle-chevron');
  const affiliateCloseBtn = inner.querySelector<HTMLButtonElement>('#nexus-affiliate-close-btn');
  const kofiBtn = inner.querySelector<HTMLAnchorElement>('#nexus-kofi-link-btn');

  if (affiliateToggleBtn && affiliateDrawer) {
    let isAffiliateOpen = false;
    const toggleAffiliateDrawer = (show?: boolean) => {
      isAffiliateOpen = show !== undefined ? show : !isAffiliateOpen;
      affiliateDrawer.style.display = isAffiliateOpen ? 'block' : 'none';
      if (affiliateChevron) {
        affiliateChevron.style.transform = isAffiliateOpen ? 'rotate(180deg)' : 'rotate(0deg)';
      }
      if (isAffiliateOpen) {
        affiliateToggleBtn.style.background = 'rgba(0, 242, 255, 0.18)';
        affiliateToggleBtn.style.borderColor = '#00f2ff';
      } else {
        affiliateToggleBtn.style.background = 'rgba(0, 242, 255, 0.08)';
        affiliateToggleBtn.style.borderColor = 'rgba(0, 242, 255, 0.35)';
      }
    };

    affiliateToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAffiliateDrawer();
    });

    if (affiliateCloseBtn) {
      affiliateCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAffiliateDrawer(false);
      });
      affiliateCloseBtn.addEventListener('mouseenter', () => {
        affiliateCloseBtn.style.color = '#fff';
      });
      affiliateCloseBtn.addEventListener('mouseleave', () => {
        affiliateCloseBtn.style.color = '#94a3b8';
      });
    }
  }

  if (kofiBtn) {
    kofiBtn.addEventListener('mouseenter', () => {
      kofiBtn.style.filter = 'brightness(1.15)';
    });
    kofiBtn.addEventListener('mouseleave', () => {
      kofiBtn.style.filter = 'brightness(1.0)';
    });
  }

  // Attach dropdown trigger & interactive language switcher event listeners
  const triggerBtn = inner.querySelector<HTMLButtonElement>('#nexus-lang-dropdown-trigger');
  const dropdownMenu = inner.querySelector<HTMLDivElement>('#nexus-lang-dropdown-menu');
  const chevron = inner.querySelector<SVGElement>('#nexus-lang-chevron');

  if (triggerBtn && dropdownMenu) {
    let isOpen = false;
    const toggleDropdown = (show?: boolean) => {
      isOpen = show !== undefined ? show : !isOpen;
      dropdownMenu.style.display = isOpen ? 'flex' : 'none';
      if (chevron) {
        chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
      }
    };

    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    const handleOutsideClick = (e: MouseEvent) => {
      if (!triggerBtn.contains(e.target as Node) && !dropdownMenu.contains(e.target as Node)) {
        toggleDropdown(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
  }

  inner.querySelectorAll<HTMLElement>('.nexus-lang-option').forEach(opt => {
    opt.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const targetLang = opt.dataset.lang as SupportedLanguage;
      if (targetLang && targetLang !== currentLang) {
        try {
          if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            await chrome.storage.local.set({
              'ognexus_selected_language': targetLang,
              'ognexus_language_manual': true
            });
          }
          localStorage.setItem('ognexus_language_manual', 'true');
          localStorage.setItem('ognexus_selected_language', targetLang);
        } catch { }
        renderNexusChangelogAndDonations(inner, targetLang);
      }
    });

    opt.addEventListener('mouseenter', () => {
      if (opt.dataset.lang !== currentLang) {
        opt.style.background = 'rgba(255, 255, 255, 0.08)';
        opt.style.color = '#fff';
      }
    });
    opt.addEventListener('mouseleave', () => {
      if (opt.dataset.lang !== currentLang) {
        opt.style.background = 'transparent';
        opt.style.color = '#cbd5e1';
      }
    });
  });
}
