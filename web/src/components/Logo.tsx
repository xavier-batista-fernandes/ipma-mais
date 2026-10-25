/**
 * The app's mark, shown in the header next to the "IPMA+" wordmark. A placeholder for now:
 * swap this component's SVG for the real logo. It renders at `1em`, so the header sizes it.
 */
export function Logo() {
    return (
        <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="9" fill="var(--accent)" />
            <path
                d="M16 9v14M9 16h14"
                stroke="var(--accent-contrast)"
                strokeWidth="3.5"
                strokeLinecap="round"
            />
        </svg>
    );
}
