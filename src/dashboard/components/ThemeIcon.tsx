import React from 'react';

export type SciFiIconName =
    | 'add'
    | 'adjust-settings'
    | 'approval-checkmark'
    | 'army-star'
    | 'arrow'
    | 'artificial-intelligence-brain'
    | 'brain'
    | 'back-arrow'
    | 'bar-chart'
    | 'bell'
    | 'body-armor'
    | 'broom'
    | 'calculator'
    | 'calendar'
    | 'cancel'
    | 'check-mark'
    | 'checked-checkbox'
    | 'circle'
    | 'circuit'
    | 'city-buildings'
    | 'close-window'
    | 'combo-chart'
    | 'connect'
    | 'control-panel'
    | 'database'
    | 'debris-field'
    | 'diamond'
    | 'done'
    | 'edit'
    | 'edit-pencil'
    | 'exclamation-mark'
    | 'expand'
    | 'explosion'
    | 'eye'
    | 'factory'
    | 'filled-circle'
    | 'filter'
    | 'flash-on-lightning'
    | 'forward'
    | 'forward-curved-arrow'
    | 'geography-globe'
    | 'goal'
    | 'guarantee'
    | 'hammer'
    | 'heart-with-pulse'
    | 'help-question-mark'
    | 'high-priority'
    | 'high-risk'
    | 'hourglass'
    | 'idea'
    | 'in-transit'
    | 'inscription'
    | 'last-24-hours'
    | 'leaf'
    | 'lightning-bolt'
    | 'link'
    | 'lock'
    | 'menu'
    | 'minus'
    | 'navigation'
    | 'next-page'
    | 'notification'
    | 'open-book'
    | 'open-door'
    | 'open-end-wrench'
    | 'paint-brush'
    | 'paper-plane'
    | 'pie-chart'
    | 'place-marker'
    | 'protect'
    | 'question-mark'
    | 'radar'
    | 'rating-circled'
    | 'redo'
    | 'remove'
    | 'robotic-arm'
    | 'rocket'
    | 'save'
    | 'search'
    | 'security-configuration-settings'
    | 'settings'
    | 'shopping-basket'
    | 'shopping-cart'
    | 'signpost'
    | 'skyscrapers'
    | 'sliders'
    | 'sniper-crosshair'
    | 'sort-down'
    | 'sorting-arrows'
    | 'sparkling'
    | 'speed'
    | 'stopwatch'
    | 'strategy'
    | 'sword'
    | 'sync'
    | 'test-lab-tube'
    | 'today'
    | 'tools'
    | 'trophy'
    | 'warehouse'
    | 'warehouse-alternative'
    | 'wrench';

const ICON_FILENAME_MAP: Record<SciFiIconName, string> = {
    'add': 'add-96.png',
    'adjust-settings': 'adjust-settings-96.png',
    'approval-checkmark': 'approval-checkmark-96.png',
    'army-star': 'army-star-96.png',
    'arrow': 'arrow-96.png',
    'artificial-intelligence-brain': 'artificial-intelligence-brain-96.png',
    'brain': 'brain-96.png',
    'back-arrow': 'back-arrow-96.png',
    'bar-chart': 'bar-chart-96.png',
    'bell': 'bell-96.png',
    'body-armor': 'body-armor-96.png',
    'broom': 'broom-96.png',
    'calculator': 'calculator-96.png',
    'calendar': 'calendar-96.png',
    'cancel': 'cancel-144.png',
    'check-mark': 'check-mark-144.png',
    'checked-checkbox': 'checked-checkbox-96.png',
    'circle': 'circle-96.png',
    'circuit': 'circuit-96.png',
    'city-buildings': 'city-buildings-96.png',
    'close-window': 'close-window-96.png',
    'combo-chart': 'combo-chart-96.png',
    'connect': 'connect-144.png',
    'control-panel': 'control-panel-96.png',
    'database': 'database-96.png',
    'debris-field': 'debris-field-144.png',
    'diamond': 'diamond-96.png',
    'done': 'done-144.png',
    'edit': 'edit-96.png',
    'edit-pencil': 'edit-pencil-144.png',
    'exclamation-mark': 'exclamation-mark-96.png',
    'expand': 'expand-96.png',
    'explosion': 'explosion-96.png',
    'eye': 'eye-96.png',
    'factory': 'factory-96.png',
    'filled-circle': 'filled-circle-96.png',
    'filter': 'filter-96.png',
    'flash-on-lightning': 'flash-on-lightning-96.png',
    'forward': 'forward-96.png',
    'forward-curved-arrow': 'forward-curved-arrow-96.png',
    'geography-globe': 'geography-globe-96.png',
    'goal': 'goal-96.png',
    'guarantee': 'guarantee-96.png',
    'hammer': 'hammer-96.png',
    'heart-with-pulse': 'heart-with-pulse-96.png',
    'help-question-mark': 'help-question-mark-96.png',
    'high-priority': 'high-priority-96.png',
    'high-risk': 'high-risk-96.png',
    'hourglass': 'hourglass-96.png',
    'idea': 'idea-96.png',
    'in-transit': 'in-transit-96.png',
    'inscription': 'inscription-96.png',
    'last-24-hours': 'last-24-hours-96.png',
    'leaf': 'leaf-96.png',
    'lightning-bolt': 'lightning-bolt-96.png',
    'link': 'link-96.png',
    'lock': 'lock-144.png',
    'menu': 'menu-144.png',
    'minus': 'minus-96.png',
    'navigation': 'navigation-96.png',
    'next-page': 'next-page-96.png',
    'notification': 'notification-96.png',
    'open-book': 'open-book-96.png',
    'open-door': 'open-door-96.png',
    'open-end-wrench': 'open-end-wrench-96.png',
    'paint-brush': 'paint-brush-96.png',
    'paper-plane': 'paper-plane-96.png',
    'pie-chart': 'pie-chart-96.png',
    'place-marker': 'place-marker-96.png',
    'protect': 'protect-96.png',
    'question-mark': 'question-mark-96.png',
    'radar': 'radar-96.png',
    'rating-circled': 'rating-circled-96.png',
    'redo': 'redo-96.png',
    'remove': 'remove-96.png',
    'robotic-arm': 'robotic-arm-96.png',
    'rocket': 'rocket-96.png',
    'save': 'save-96.png',
    'search': 'search-96.png',
    'security-configuration-settings': 'security-configuration-settings-96.png',
    'settings': 'settings-144.png',
    'shopping-basket': 'shopping-basket-96.png',
    'shopping-cart': 'shopping-cart-96.png',
    'signpost': 'signpost-96.png',
    'skyscrapers': 'skyscrapers-96.png',
    'sliders': 'sliders-96.png',
    'sniper-crosshair': 'sniper-crosshair-96.png',
    'sort-down': 'sort-down-96.png',
    'sorting-arrows': 'sorting-arrows-96.png',
    'sparkling': 'sparkling-96.png',
    'speed': 'speed-96.png',
    'stopwatch': 'stopwatch-96.png',
    'strategy': 'strategy-96.png',
    'sword': 'sword-96.png',
    'sync': 'sync-96.png',
    'test-lab-tube': 'test-lab-tube-96.png',
    'today': 'today-96.png',
    'tools': 'tools-96.png',
    'trophy': 'trophy-96.png',
    'warehouse': 'warehouse-96.png',
    'warehouse-alternative': 'warehouse-alternative-96.png',
    'wrench': 'wrench-96.png',
};

export interface ThemeIconProps {
    name: SciFiIconName | string;
    size?: number;
    glow?: boolean;
    glowColor?: string;
    className?: string;
    style?: React.CSSProperties;
    alt?: string;
}

export const ThemeIcon: React.FC<ThemeIconProps> = ({
    name,
    size = 22,
    glow = false,
    glowColor = 'rgba(0, 242, 255, 0.4)',
    className = '',
    style,
    alt = ''
}) => {
    // Resolve filename from map or direct name
    const fileName = (ICON_FILENAME_MAP as Record<string, string>)[name] || (name.endsWith('.png') ? name : `${name}-96.png`);
    const iconPath = `icons/themes/sci-fi/${fileName}`;

    return (
        <img
            src={iconPath}
            alt={alt || name}
            width={size}
            height={size}
            className={`sci-fi-icon ${className}`}
            style={{
                width: `${size}px`,
                height: `${size}px`,
                objectFit: 'contain',
                display: 'inline-block',
                verticalAlign: 'middle',
                filter: glow ? `drop-shadow(0 0 6px ${glowColor})` : undefined,
                transition: 'filter 0.2s ease, transform 0.2s ease',
                flexShrink: 0,
                ...style
            }}
            loading="lazy"
            draggable={false}
        />
    );
};

export default ThemeIcon;
