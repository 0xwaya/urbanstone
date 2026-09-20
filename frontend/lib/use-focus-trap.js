import { useEffect } from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function useFocusTrap(containerRef, active, onEscape, returnFocusRef) {
    useEffect(() => {
        if (!active || typeof document === 'undefined') {
            return undefined;
        }

        const previouslyFocused = document.activeElement;
        const container = containerRef.current;
        const focusable = container?.querySelectorAll(FOCUSABLE_SELECTOR) || [];
        const firstFocusable = focusable[0];

        if (firstFocusable instanceof HTMLElement) {
            firstFocusable.focus();
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onEscape();
                return;
            }

            if (event.key !== 'Tab' || !container) {
                return;
            }

            const currentFocusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
            if (currentFocusable.length === 0) {
                event.preventDefault();
                return;
            }

            const first = currentFocusable[0];
            const last = currentFocusable[currentFocusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            const focusTarget = returnFocusRef?.current || previouslyFocused;
            if (focusTarget instanceof HTMLElement && focusTarget.isConnected) {
                focusTarget.focus();
            }
        };
    }, [active, containerRef, onEscape, returnFocusRef]);
}