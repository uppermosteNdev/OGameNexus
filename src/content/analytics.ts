import { Expedition } from '../db/index';
import { SHIP_DATA } from '../db/staticData';

// Utility to format numbers nicely (will use the imported ones)
import { formatNumber, formatExactNumber } from './harvests';

// Define the timeline ranges
type Timeframe = 'D' | 'W' | 'M' | 'ALL';

let currentTimeframe: Timeframe = 'D';
let currentReferenceDate: Date = new Date(); // The date currently being viewed

const CATEGORY_COLORS: Record<string, string> = {
    Resources: '#4CAEE6',
    Nothing: '#94a3b8',
    Ships: '#22c55e',
    'Dark Matter': '#a855f7',
    Duration: '#ef4444',
    Battle: '#eab308',
    Trader: '#f97316',
    Item: '#f59e0b',
    'Black hole': '#334155',
    'Aliens/Pirates': '#eab308',
};

// SVG Icons mapping (minimalistic paths for beautiful UI)
const CATEGORY_ICONS: Record<string, string> = {
    Resources: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
    Nothing: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    Ships: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>',
    'Dark Matter': '<img src="' + chrome.runtime.getURL('icons/resources/dark-matter-icon-medium.jpg') + '" style="width: 14px; height: 14px; border-radius: 2px;">',
    Duration: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
    Battle: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    Trader: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>',
    Item: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>',
    'Artifacts': '<img src="' + chrome.runtime.getURL('icons/lifeforms/artifact-icon-large.png') + '" style="width: 14px; height: 14px; border-radius: 2px;">',
    'Black hole': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle></svg>'
};

interface AnalyticsDataAggregate {
    totalExpeditions: number;
    totalCombats: number;
    totalDebris: number;
    categories: Record<string, number>;
    expeditionsResources: { metal: number, crystal: number, deuterium: number, msu: number, darkMatter: number, artifacts: number };
    combatsResources: { metal: number, crystal: number, deuterium: number, msu: number, darkMatter: number, artifacts: number };
    debrisResources: { metal: number, crystal: number, deuterium: number, msu: number, darkMatter: number, artifacts: number };
    shipsMap: Record<number, number>;
    timeline: number[];
    trackingDays: number;
}

export function renderAnalyticsTab(container: HTMLElement, expeditions: any[], lifeforms: any[] = [], combats: any[] = [], debrisHarvests: any[] = []) {
    container.innerHTML = '';

    // 1. Month bounds for the timeline bars
    const mBounds = getMonthBounds(currentReferenceDate);
    const filterByMonth = (items: any[]) => items.filter(item => {
        const tsMs = item.timestamp * 1000;
        return tsMs >= mBounds.startMs && tsMs <= mBounds.endMs;
    });

    const monthExpeditions = filterByMonth(expeditions);
    const monthCombats = filterByMonth(combats);
    const monthDebris = filterByMonth(debrisHarvests);

    // 2. Specific timeframe bounds for stats (pie chart, table, etc)
    const bounds = getTimeframeBounds(currentTimeframe, currentReferenceDate);
    const startMs = bounds ? bounds.startMs : 0;
    const endMs = bounds ? bounds.endMs : 0;
    const label = bounds ? bounds.label : 'All Time';

    const filterByTimeframe = (items: any[]) => items.filter(item => {
        if (currentTimeframe === 'ALL') return true;
        const tsMs = item.timestamp * 1000;
        return tsMs >= startMs && tsMs <= endMs;
    });

    const tfExpeditions = filterByTimeframe(expeditions);
    const tfLifeforms = filterByTimeframe(lifeforms);
    const tfCombats = filterByTimeframe(combats);
    const tfDebris = filterByTimeframe(debrisHarvests);

    let earliestTs = Date.now();
    const checkEarliest = (arr: any[]) => {
        arr.forEach(a => { if (a.timestamp && a.timestamp * 1000 < earliestTs) earliestTs = a.timestamp * 1000; });
    };
    checkEarliest(expeditions);
    checkEarliest(combats);
    checkEarliest(debrisHarvests);
    const trackingDays = Math.max(1, Math.ceil((Date.now() - earliestTs) / (1000 * 3600 * 24)));

    const aggregate = processAnalyticsData(tfExpeditions, monthExpeditions, currentReferenceDate, trackingDays, tfLifeforms, tfCombats, tfDebris, monthCombats, monthDebris);

    // Build Layout
    const headerWrapper = document.createElement('div');
    headerWrapper.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        background: rgba(15, 23, 42, 0.4);
        padding: 12px 20px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.05);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(8px);
    `;

    // Timeframe selector
    const tfControls = document.createElement('div');
    tfControls.style.cssText = `display: flex; gap: 8px; align-items: center;`;

    ['D', 'W', 'M', 'ALL'].forEach(tf => {
        const btn = document.createElement('button');
        btn.textContent = tf;
        btn.style.cssText = `
            background: ${currentTimeframe === tf ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)'};
            color: ${currentTimeframe === tf ? '#38bdf8' : '#94a3b8'};
            border: 1px solid ${currentTimeframe === tf ? 'rgba(56, 189, 248, 0.3)' : 'transparent'};
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        `;
        btn.onclick = () => {
            currentTimeframe = tf as Timeframe;
            renderAnalyticsTab(container, expeditions, lifeforms, combats, debrisHarvests);
        };
        tfControls.appendChild(btn);
    });

    // Date Navigation
    const dateNav = document.createElement('div');
    dateNav.style.cssText = `display: flex; gap: 12px; align-items: center; margin-left: 24px; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 24px;`;

    if (currentTimeframe !== 'ALL') {
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '&lt;';
        prevBtn.style.cssText = `background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); width: 28px; height: 28px; border-radius: 4px; cursor: pointer;`;
        prevBtn.onclick = () => adjustDate(-1, container, expeditions, lifeforms, combats, debrisHarvests);

        const dateLabel = document.createElement('div');
        dateLabel.textContent = getPickerLabel(currentTimeframe, currentReferenceDate);
        dateLabel.style.cssText = `color: #e2e8f0; font-weight: 600; font-size: 14px; min-width: 100px; text-align: center;`;

        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '&gt;';
        nextBtn.style.cssText = `background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); width: 28px; height: 28px; border-radius: 4px; cursor: pointer;`;
        nextBtn.onclick = () => adjustDate(1, container, expeditions, lifeforms, combats, debrisHarvests);

        dateNav.appendChild(prevBtn);
        dateNav.appendChild(dateLabel);
        dateNav.appendChild(nextBtn);
    }

    tfControls.appendChild(dateNav);
    headerWrapper.appendChild(tfControls);

    container.appendChild(headerWrapper);

    // Bar Chart Timeline
    if (currentTimeframe !== 'ALL') {
        renderTimelineChart(container, aggregate.timeline, expeditions, lifeforms, combats, debrisHarvests);
    }

    // Title Date Row
    const titleRow = document.createElement('div');
    titleRow.style.cssText = `text-align: center; margin: 20px 0; color: #fbbf24; font-weight: 700; font-size: 15px; letter-spacing: 0.5px;`;
    titleRow.textContent = label;
    container.appendChild(titleRow);

    // Layout for Pie Chart and Ships
    const midSection = document.createElement('div');
    midSection.style.cssText = `
        display: flex;
        gap: 24px;
        margin-bottom: 24px;
        align-items: stretch;
    `;

    const pieCardDiv = renderPieChartCard(aggregate);
    midSection.appendChild(pieCardDiv);

    // Ships Display
    const shipsCardDiv = renderShipsCard(aggregate);
    midSection.appendChild(shipsCardDiv);

    container.appendChild(midSection);

    // Bottom Table
    const globalAggregate = processAnalyticsData(expeditions, expeditions, currentReferenceDate, trackingDays, lifeforms, combats, debrisHarvests, combats, debrisHarvests);
    const tableDiv = renderTotalsTable(aggregate, globalAggregate);
    container.appendChild(tableDiv);
}

function classifyResultType(res: string, detail: any): string {
    const rs = res.toLowerCase();
    if (rs.includes('delay') || rs.includes('speedup') || rs.includes('navigation') || rs === 'duration') return 'Duration';
    if (rs.includes('ressources') || rs.includes('resources')) return 'Resources';
    if (rs.includes('shipwrecks') || rs.includes('ships')) return 'Ships';
    if (rs.includes('darkmatter')) return 'Dark Matter';
    if (rs.includes('trader')) return 'Trader';
    if (rs.includes('fleetloss') || rs.includes('fleetlost') || rs.includes('blackhole')) return 'Black hole';
    if (rs.includes('aliens') || rs.includes('pirates') || rs.includes('battle')) return 'Battle';
    if (rs.includes('item')) return 'Item';
    if (rs.includes('nothing') || rs.includes('none')) return 'Nothing';

    if (detail) {
        if (detail.shipsFound || detail.shipswrecks || detail.technologiesgained) return 'Ships';
        if (detail.metal || detail.crystal || detail.deuterium) return 'Resources';
    }

    return 'Nothing';
}

function processAnalyticsData(tfExp: any[], monthExp: any[], refDate: Date, trackingDays: number, tfLf: any[] = [], tfCombats: any[] = [], tfDebris: any[] = [], monthCombats: any[] = [], monthDebris: any[] = []): AnalyticsDataAggregate {
    const aggregate: AnalyticsDataAggregate = {
        totalExpeditions: tfExp.length,
        totalCombats: tfCombats.length,
        totalDebris: tfDebris.length,
        categories: {},
        expeditionsResources: { metal: 0, crystal: 0, deuterium: 0, msu: 0, darkMatter: 0, artifacts: 0 },
        combatsResources: { metal: 0, crystal: 0, deuterium: 0, msu: 0, darkMatter: 0, artifacts: 0 },
        debrisResources: { metal: 0, crystal: 0, deuterium: 0, msu: 0, darkMatter: 0, artifacts: 0 },
        shipsMap: {},
        timeline: [],
        trackingDays
    };

    const daysInMonth = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).getDate();
    aggregate.timeline = new Array(daysInMonth).fill(0);

    // Timeline bars always use the month set for events
    const processMonthTimeline = (items: any[]) => {
        items.forEach(item => {
            const date = new Date(item.timestamp * 1000);
            const idx = date.getDate() - 1;
            if (idx >= 0 && idx < daysInMonth) {
                aggregate.timeline[idx]++;
            }
        });
    };

    processMonthTimeline(monthExp);
    processMonthTimeline(monthCombats);
    processMonthTimeline(monthDebris);

    // Stats use the TF-filtered set
    tfExp.forEach(exp => {
        const type = classifyResultType(exp.result || '', exp.resultDetails);
        aggregate.categories[type] = (aggregate.categories[type] || 0) + 1;

        const det = exp.resultDetails;
        if (det && typeof det === 'object') {
            if (type === 'Resources') {
                aggregate.expeditionsResources.metal += (det.metal || 0);
                aggregate.expeditionsResources.crystal += (det.crystal || 0);
                aggregate.expeditionsResources.deuterium += (det.deuterium || 0);

                aggregate.expeditionsResources.msu += (det.metal || 0) + (det.crystal || 0) * 1.5 + (det.deuterium || 0) * 3;
            }
            if (type === 'Dark Matter' || det.darkMatter) {
                aggregate.expeditionsResources.darkMatter += (det.darkmatter || det.darkMatter || 0);
            }
            if (det.artifacts) {
                aggregate.expeditionsResources.artifacts += det.artifacts;
            }

            if (type === 'Ships') {
                Object.keys(det).forEach(k => {
                    const id = parseInt(k);
                    if (!isNaN(id) && id >= 200 && id <= 220) {
                        let amount = 0;
                        if (typeof det[k] === 'object' && det[k] !== null && 'amount' in det[k]) {
                            amount = parseInt(det[k].amount);
                        } else {
                            amount = parseInt(det[k]);
                        }
                        if (!isNaN(amount) && amount > 0) {
                            aggregate.shipsMap[id] = (aggregate.shipsMap[id] || 0) + amount;
                        }
                    }
                });
            }
        }
    });

    // Add lifeform artifacts to the resources aggregate
    tfLf.forEach(disc => {
        if (disc.discoveryType === 'artifacts') {
            aggregate.expeditionsResources.artifacts += (disc.artifactsFound || 0);
        }
    });

    // Process Combats stats
    tfCombats.forEach(combat => {
        const loot = combat.loot || {};
        aggregate.combatsResources.metal += (loot.metal || 0);
        aggregate.combatsResources.crystal += (loot.crystal || 0);
        aggregate.combatsResources.deuterium += (loot.deuterium || 0);
        aggregate.combatsResources.msu += (loot.metal || 0) + (loot.crystal || 0) * 1.5 + (loot.deuterium || 0) * 3;
    });

    // Process Debris stats
    tfDebris.forEach(harvest => {
        const res = harvest.recycledResources || {};
        aggregate.debrisResources.metal += (res.metal || 0);
        aggregate.debrisResources.crystal += (res.crystal || 0);
        aggregate.debrisResources.deuterium += (res.deuterium || 0);
        aggregate.debrisResources.msu += (res.metal || 0) + (res.crystal || 0) * 1.5 + (res.deuterium || 0) * 3;
    });

    return aggregate;
}

function getMonthBounds(refDate: Date) {
    const start = new Date(refDate.getFullYear(), refDate.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startMs: start.getTime(), endMs: end.getTime() };
}

function adjustDate(delta: number, container: HTMLElement, expeditions: any[], lifeforms: any[], combats: any[], debrisHarvests: any[]) {
    // Navigational arrows always adjust by month
    currentReferenceDate.setMonth(currentReferenceDate.getMonth() + delta);
    renderAnalyticsTab(container, expeditions, lifeforms, combats, debrisHarvests);
}

function getTimeframeBounds(tf: Timeframe, refDate: Date) {
    let startMs = 0;
    let endMs = 0;
    let label = '';

    const d = new Date(refDate.getTime());

    if (tf === 'M') {
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        startMs = d.getTime();

        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        endMs = end.getTime();

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        label = `${monthNames[d.getMonth()]} 1, ${d.getFullYear()} -> ${monthNames[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
    } else if (tf === 'W') {
        const day = d.getDay() || 7;
        if (day !== 1) d.setHours(-24 * (day - 1));
        d.setHours(0, 0, 0, 0);
        startMs = d.getTime();

        const end = new Date(d.getTime() + 6 * 24 * 60 * 60 * 1000);
        end.setHours(23, 59, 59, 999);
        endMs = end.getTime();

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        label = `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} -> ${monthNames[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
    } else if (tf === 'D') {
        d.setHours(0, 0, 0, 0);
        startMs = d.getTime();
        d.setHours(23, 59, 59, 999);
        endMs = d.getTime();

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        label = `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    } else {
        return null;
    }

    return { startMs, endMs, label };
}

function getPickerLabel(tf: Timeframe, refDate: Date) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    // Always return Month Year regardless of timeframe D/W/M
    return `${monthNames[refDate.getMonth()]} ${refDate.getFullYear()}`;
}

function renderTimelineChart(container: HTMLElement, timeline: number[], expeditions: any[], lifeforms: any[], combats: any[], debrisHarvests: any[]) {
    const maxVal = Math.max(...timeline, 1);

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        height: 80px;
        background: rgba(15, 23, 42, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;
        backdrop-filter: blur(8px);
    `;

    const bounds = getTimeframeBounds(currentTimeframe, currentReferenceDate);

    timeline.forEach((val, idx) => {
        const pct = (val / maxVal) * 100;
        const col = document.createElement('div');
        col.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            height: 100%;
            justify-content: flex-end;
            margin: 0 2px;
            position: relative;
        `;

        const barDate = new Date(currentReferenceDate.getFullYear(), currentReferenceDate.getMonth(), idx + 1);
        const barTs = barDate.getTime();

        let inBounds = false;
        if (bounds && currentTimeframe !== 'ALL') {
            const startOfDay = new Date(bounds.startMs);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(bounds.endMs);
            endOfDay.setHours(23, 59, 59, 999);
            inBounds = barTs >= startOfDay.getTime() && barTs <= endOfDay.getTime();
        }

        const barContainer = document.createElement('div');
        barContainer.className = 'nexus-tooltip';
        let tipText = `Day ${idx + 1}: ${val}`;
        barContainer.setAttribute('data-nexus-tooltip', tipText);

        barContainer.style.cssText = `
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.3);
            border-radius: 4px;
            display: flex;
            align-items: flex-end;
            cursor: pointer;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
            padding: 2px;
            ${inBounds ? 'border: 2px solid #fbbf24; background: rgba(251, 191, 36, 0.1); box-shadow: 0 0 15px rgba(251, 191, 36, 0.2); z-index: 5;' : 'border: 1px solid rgba(255,255,255,0.05);'}
            transition: all 0.2s;
        `;

        barContainer.onmouseover = () => {
            barContainer.style.background = inBounds ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.1)';
            barContainer.style.transform = 'translateY(-2px)';
        };
        barContainer.onmouseout = () => {
            barContainer.style.background = inBounds ? 'rgba(251, 191, 36, 0.1)' : 'rgba(0,0,0,0.3)';
            barContainer.style.transform = 'none';
        };
        barContainer.onclick = () => {
            currentTimeframe = 'D';
            currentReferenceDate = new Date(currentReferenceDate.getFullYear(), currentReferenceDate.getMonth(), idx + 1);
            renderAnalyticsTab(container, expeditions, lifeforms, combats, debrisHarvests);
        };

        const fill = document.createElement('div');
        fill.style.cssText = `
            width: 100%;
            height: ${pct}%;
            background: ${val > 0 ? '#6ee7b7' : 'transparent'};
            border-radius: 2px;
            transition: height 0.3s;
        `;

        barContainer.appendChild(fill);

        const lbl = document.createElement('div');
        lbl.style.cssText = `font-size: 10px; color: #64748b; margin-top: 6px; font-weight: 600;`;
        lbl.textContent = (idx + 1).toString();

        col.appendChild(barContainer);
        col.appendChild(lbl);
        wrapper.appendChild(col);
    });

    container.appendChild(wrapper);
}

function renderPieChartCard(aggregate: AnalyticsDataAggregate) {
    const card = document.createElement('div');
    card.style.cssText = `
        flex: 1.2;
        background: rgba(15, 23, 42, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 24px;
        display: flex;
        gap: 32px;
        align-items: center;
        backdrop-filter: blur(8px);
    `;

    const total = aggregate.totalExpeditions;
    const sortedCats = Object.entries(aggregate.categories).sort((a, b) => b[1] - a[1]);

    let conicGradients = '';
    let currPct = 0;

    sortedCats.forEach(([cat, val]) => {
        const pct = (val / Math.max(total, 1)) * 100;
        const color = CATEGORY_COLORS[cat] || '#94a3b8';
        if (conicGradients.length > 0) conicGradients += ', ';
        conicGradients += `${color} ${currPct}% ${currPct + pct}%`;
        currPct += pct;
    });

    if (!conicGradients) conicGradients = 'rgba(255,255,255,0.05) 0% 100%';

    const chartWrapper = document.createElement('div');
    chartWrapper.style.cssText = `
        position: relative;
        width: 150px;
        height: 150px;
        border-radius: 50%;
        background: conic-gradient(${conicGradients});
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    `;

    // Inner circle for donut
    const innerChart = document.createElement('div');
    innerChart.style.cssText = `
        width: 110px;
        height: 110px;
        border-radius: 50%;
        background: #1e293b;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);
    `;

    innerChart.innerHTML = `
        <div style="font-size: 20px; font-weight: 700; color: #f8fafc;">${formatExactNumber(total)}</div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Expeditions</div>
    `;

    chartWrapper.appendChild(innerChart);
    card.appendChild(chartWrapper);

    // Legend
    const legendWrapper = document.createElement('div');
    legendWrapper.style.cssText = `display: flex; flex-direction: column; gap: 8px; flex-grow: 1;`;

    sortedCats.forEach(([cat, val]) => {
        const pctl = ((val / Math.max(total, 1)) * 100).toFixed(2);
        const color = CATEGORY_COLORS[cat] || '#94a3b8';
        const iconRaw = CATEGORY_ICONS[cat] || '';

        const legItem = document.createElement('div');
        legItem.style.cssText = `display: flex; align-items: center; justify-content: space-between; font-size: 13px;`;

        legItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; color: #e2e8f0; font-weight: 500;">
                <span style="color: ${color}; display: flex;">${iconRaw}</span>
                ${cat}
            </div>
            <div style="display: flex; gap: 12px; align-items: baseline;">
                <span style="font-weight: 700; color: #f8fafc;">${formatExactNumber(val)}</span>
                <span style="font-size: 11px; color: #64748b; width: 40px; text-align: right;">${pctl}%</span>
            </div>
        `;
        legendWrapper.appendChild(legItem);
    });

    card.appendChild(legendWrapper);
    return card;
}

function renderShipsCard(aggregate: AnalyticsDataAggregate) {
    const card = document.createElement('div');
    card.style.cssText = `
        flex: 1;
        background: rgba(15, 23, 42, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        backdrop-filter: blur(8px);
        overflow-y: auto;
        min-height: 180px;
    `;

    const sortedShips = Object.entries(aggregate.shipsMap).sort((a, b) => b[1] - a[1]);

    if (sortedShips.length === 0) {
        card.innerHTML = `<div style="color: #64748b; text-align: center; margin-top: auto; margin-bottom: auto;">No ships found in this period.</div>`;
        return card;
    }

    const grid = document.createElement('div');
    grid.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    `;

    sortedShips.slice(0, 10).forEach(([shipId, count]) => {
        let sName = 'Ship ' + shipId;
        let sIcon = '';
        const shipInfo = SHIP_DATA.find(s => s.id.toString() === shipId);
        if (shipInfo) {
            sName = shipInfo.name;
            sIcon = shipInfo.icon;
        }

        const item = document.createElement('div');
        item.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(0,0,0,0.3);
            border-radius: 4px;
            padding: 6px 14px;
            border-left: 2px solid #3b82f6;
            margin-bottom: 4px;
        `;

        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                ${sIcon ? `<img src="${chrome.runtime.getURL(sIcon)}" style="width: 20px; height: 20px; border-radius: 2px; filter: grayscale(0.2);"/>` : ''}
                <div style="font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px;">${sName}</div>
            </div>
            <div style="font-weight: 700; color: #e2e8f0; font-size: 13px;">${formatNumber(count)}</div>
        `;
        grid.appendChild(item);
    });

    card.appendChild(grid);
    return card;
}

function renderTotalsTable(ag: AnalyticsDataAggregate, globalAg: AnalyticsDataAggregate) {
    const card = document.createElement('div');
    card.style.cssText = `
        background: rgba(15, 23, 42, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        overflow: hidden;
        backdrop-filter: blur(8px);
    `;

    const t = document.createElement('table');
    t.style.cssText = `width: 100%; border-collapse: collapse; text-align: right; color: #e2e8f0; font-size: 13px;`;

    const tr = document.createElement('tr');
    tr.style.cssText = `background: rgba(0,0,0,0.3); border-bottom: 2px solid rgba(255,255,255,0.05);`;

    const hdrs = [
        '',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
        '<img src="' + chrome.runtime.getURL('icons/resources/metal-icon-medium.jpg') + '" style="width: 24px; filter: grayscale(0.2); border-radius: 2px;">',
        '<img src="' + chrome.runtime.getURL('icons/resources/crystal-icon-medium.jpg') + '" style="width: 24px; filter: grayscale(0.2); border-radius: 2px;">',
        '<img src="' + chrome.runtime.getURL('icons/resources/deuterium-icon-medium.jpg') + '" style="width: 24px; filter: grayscale(0.2); border-radius: 2px;">',
        '<span style="color: #94a3b8; font-weight: 800; font-size: 14px;">MSU</span>',
        '<img src="' + chrome.runtime.getURL('icons/resources/dark-matter-icon-medium.jpg') + '" style="width: 24px; filter: grayscale(0.2); border-radius: 2px;">',
        '<img src="' + chrome.runtime.getURL('icons/lifeforms/artifact-icon-large.png') + '" style="width: 24px; filter: grayscale(0.2); border-radius: 2px;">'
    ];

    hdrs.forEach((h) => {
        const th = document.createElement('th');
        th.style.cssText = `padding: 12px; border-right: 1px solid rgba(255,255,255,0.03); ${h ? 'text-align: center;' : 'width: 120px;'}`;
        th.innerHTML = h;
        tr.appendChild(th);
    });
    t.appendChild(tr);

    const expedRow = document.createElement('tr');
    expedRow.innerHTML = `
        <td style="padding: 14px 20px; text-align: left; font-weight: bold; color: #94a3b8; border-right: 1px solid rgba(255,255,255,0.05); border-bottom: 2px solid rgba(255,255,255,0.05);">Expeditions</td>
        <td style="padding: 14px 12px; text-align: center; color: #cbd5e1; border-bottom: 2px solid rgba(255,255,255,0.05); font-weight: bold;">${formatNumber(ag.totalExpeditions) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #E6953C; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(ag.expeditionsResources.metal) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #4CAEE6; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(ag.expeditionsResources.crystal) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #43D159; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(ag.expeditionsResources.deuterium) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #94a3b8; border-left: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(ag.expeditionsResources.msu) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #a855f7; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatExactNumber(ag.expeditionsResources.darkMatter) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #fbbf24; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatExactNumber(ag.expeditionsResources.artifacts) || '-'}</td>
    `;
    t.appendChild(expedRow);

    const combatRow = document.createElement('tr');
    combatRow.innerHTML = `
        <td style="padding: 14px 20px; text-align: left; font-weight: bold; color: #94a3b8; border-right: 1px solid rgba(255,255,255,0.05); border-bottom: 2px solid rgba(255,255,255,0.05);">Combats</td>
        <td style="padding: 14px 12px; text-align: center; color: #cbd5e1; border-bottom: 2px solid rgba(255,255,255,0.05); font-weight: bold;">${formatNumber(ag.totalCombats) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #E6953C; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(ag.combatsResources.metal) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #4CAEE6; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(ag.combatsResources.crystal) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #43D159; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(ag.combatsResources.deuterium) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #94a3b8; border-left: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(ag.combatsResources.msu) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #a855f7; border-bottom: 2px solid rgba(255,255,255,0.05);">-</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #fbbf24; border-bottom: 2px solid rgba(255,255,255,0.05);">-</td>
    `;
    t.appendChild(combatRow);

    const debrisRow = document.createElement('tr');
    debrisRow.innerHTML = `
        <td style="padding: 14px 20px; text-align: left; font-weight: bold; color: #94a3b8; border-right: 1px solid rgba(255,255,255,0.05); border-bottom: 2px solid rgba(255,255,255,0.05);">Debris Fields</td>
        <td style="padding: 14px 12px; text-align: center; color: #cbd5e1; border-bottom: 2px solid rgba(255,255,255,0.05); font-weight: bold;">${formatNumber(ag.totalDebris) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #E6953C; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(ag.debrisResources.metal) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #4CAEE6; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(ag.debrisResources.crystal) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #43D159; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(ag.debrisResources.deuterium) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #94a3b8; border-left: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(ag.debrisResources.msu) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #a855f7; border-bottom: 2px solid rgba(255,255,255,0.05);">-</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #fbbf24; border-bottom: 2px solid rgba(255,255,255,0.05);">-</td>
    `;
    t.appendChild(debrisRow);

    const totalEvents = ag.totalExpeditions + ag.totalCombats + ag.totalDebris;
    const totalMetal = ag.expeditionsResources.metal + ag.combatsResources.metal + ag.debrisResources.metal;
    const totalCrystal = ag.expeditionsResources.crystal + ag.combatsResources.crystal + ag.debrisResources.crystal;
    const totalDeuterium = ag.expeditionsResources.deuterium + ag.combatsResources.deuterium + ag.debrisResources.deuterium;
    const totalMsu = ag.expeditionsResources.msu + ag.combatsResources.msu + ag.debrisResources.msu;
    const totalDarkMatter = ag.expeditionsResources.darkMatter; // Combats and Debris do not drop DM
    const totalArtifacts = ag.expeditionsResources.artifacts; // Combats and Debris do not drop Artifacts

    const dataRow = document.createElement('tr');
    dataRow.innerHTML = `
        <td style="padding: 14px 20px; text-align: left; font-weight: bold; color: #f8fafc; border-right: 1px solid rgba(255,255,255,0.05); border-bottom: 2px solid rgba(255,255,255,0.05);">Total</td>
        <td style="padding: 14px 12px; text-align: center; color: #cbd5e1; font-weight: bold; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(totalEvents) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #E6953C; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(totalMetal) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #4CAEE6; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(totalCrystal) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #43D159; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(totalDeuterium) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #94a3b8; border-left: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); border-bottom: 2px solid rgba(255,255,255,0.05);">${formatNumber(totalMsu) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #a855f7; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatExactNumber(totalDarkMatter) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #fbbf24; border-bottom: 2px solid rgba(255,255,255,0.05);">${formatExactNumber(totalArtifacts) || '-'}</td>
    `;
    t.appendChild(dataRow);

    const globalEvents = globalAg.totalExpeditions + globalAg.totalCombats + globalAg.totalDebris;
    const globalMetal = globalAg.expeditionsResources.metal + globalAg.combatsResources.metal + globalAg.debrisResources.metal;
    const globalCrystal = globalAg.expeditionsResources.crystal + globalAg.combatsResources.crystal + globalAg.debrisResources.crystal;
    const globalDeuterium = globalAg.expeditionsResources.deuterium + globalAg.combatsResources.deuterium + globalAg.debrisResources.deuterium;
    const globalMsu = globalAg.expeditionsResources.msu + globalAg.combatsResources.msu + globalAg.debrisResources.msu;
    const globalDarkMatter = globalAg.expeditionsResources.darkMatter;
    const globalArtifacts = globalAg.expeditionsResources.artifacts;

    const avgDenominator = globalAg.trackingDays;

    const avgRow = document.createElement('tr');
    avgRow.innerHTML = `
        <td style="padding: 14px 20px; text-align: left; font-weight: bold; color: #f8fafc; border-right: 1px solid rgba(255,255,255,0.05);">Average</td>
        <td style="padding: 14px 12px; text-align: center; color: #cbd5e1; font-weight: bold;">${formatNumber(globalEvents / avgDenominator, 0) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #E6953C;">${formatNumber(Math.round(globalMetal / avgDenominator), 0) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #4CAEE6;">${formatNumber(Math.round(globalCrystal / avgDenominator), 0) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #43D159;">${formatNumber(Math.round(globalDeuterium / avgDenominator), 0) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #94a3b8; border-left: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2);">${formatNumber(Math.round(globalMsu / avgDenominator), 0) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #a855f7;">${formatExactNumber(Math.round(globalDarkMatter / avgDenominator)) || '-'}</td>
        <td style="padding: 14px 12px; text-align: center; font-weight: 700; color: #fbbf24;">${formatExactNumber(Math.round(globalArtifacts / avgDenominator)) || '-'}</td>
    `;
    t.appendChild(avgRow);

    card.appendChild(t);

    return card;
}
