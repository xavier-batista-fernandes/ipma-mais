/**
 * The app's mark, shown in the header next to the "IPMA+" wordmark: a sun rising over the
 * horizon with a plus in the sky. It renders at `1em`, so the header sizes it. The tile and
 * strokes follow the theme's accent; `public/favicon.svg` is the same mark with fixed colours.
 */
export function Logo() {
    return (
        <svg className="logo" viewBox="0 0 64 64" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="var(--accent)" />
            <g fill="none" stroke="var(--accent-contrast)" strokeWidth="5" strokeLinecap="round">
                <path d="M14 42h36M32 14v12M26 20h12" />
                <path d="M20 50h24" opacity="0.55" />
            </g>
            <path d="M19 42a13 13 0 0 1 26 0Z" fill="#fbbf24" />
        </svg>
    );
}
