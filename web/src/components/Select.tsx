import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { usePopover } from './usePopover';

export interface SelectOption<T extends string> {
    value: T;
    label: string;
    /** A short tag shown at the end of the option, such as its unit. */
    tag?: string;
}

interface Props<T extends string> {
    label: string;
    value: T;
    options: SelectOption<T>[];
    onChange: (value: T) => void;
}

/**
 * A drop-down list styled like the rest of the app (the native `<select>` pop-up can't be). The
 * button opens it with a click, Enter, Space or ↓; the list takes ↑/↓/Home/End, Enter to pick
 * and Escape to close.
 */
export function Select<T extends string>({ label, value, options, onChange }: Props<T>) {
    const { ref, triggerRef, open, setOpen, close } = usePopover<HTMLDivElement>();
    const listRef = useRef<HTMLUListElement>(null);
    const labelId = useId();
    const listId = useId();
    const selectedIndex = Math.max(
        0,
        options.findIndex((o) => o.value === value)
    );
    const [active, setActive] = useState(selectedIndex);
    const current = options[selectedIndex];

    useEffect(() => {
        if (!open) return;
        setActive(selectedIndex);
        listRef.current?.focus();
    }, [open, selectedIndex]);

    const choose = (index: number) => {
        const option = options[index];
        if (option) onChange(option.value);
        close(true);
    };

    return (
        <div className="select" ref={ref}>
            <span id={labelId} className="field-label">
                {label}
            </span>
            <button
                ref={triggerRef}
                type="button"
                className="select-trigger"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-labelledby={`${labelId} ${listId}-value`}
                onClick={() => setOpen((o) => !o)}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        setOpen(true);
                    }
                }}
            >
                <span id={`${listId}-value`} className="select-value">
                    {current?.label}
                </span>
                {current?.tag && <span className="tag">{current.tag}</span>}
                <Icon name="chevronDown" />
            </button>
            {open && (
                <ul
                    ref={listRef}
                    id={listId}
                    className="popover select-list"
                    role="listbox"
                    tabIndex={-1}
                    aria-labelledby={labelId}
                    aria-activedescendant={`${listId}-${active}`}
                    onKeyDown={(e) => {
                        const last = options.length - 1;
                        if (e.key === 'ArrowDown') setActive((i) => Math.min(i + 1, last));
                        else if (e.key === 'ArrowUp') setActive((i) => Math.max(i - 1, 0));
                        else if (e.key === 'Home') setActive(0);
                        else if (e.key === 'End') setActive(last);
                        else if (e.key === 'Enter' || e.key === ' ') choose(active);
                        else if (e.key === 'Tab') return close();
                        else return;
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                >
                    {options.map((option, i) => (
                        <li
                            key={option.value}
                            id={`${listId}-${i}`}
                            role="option"
                            aria-selected={option.value === value}
                            data-active={i === active}
                            onPointerEnter={() => setActive(i)}
                            onClick={() => choose(i)}
                        >
                            <span className="option-label">{option.label}</span>
                            {option.tag && <span className="tag">{option.tag}</span>}
                            <span className="option-check">
                                {option.value === value && <Icon name="check" />}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
