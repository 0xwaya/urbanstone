export function captureInstallPrompt(onPrompt) {
    const onPromptEvent = (event) => {
        event.preventDefault();
        onPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', onPromptEvent);
    return () => window.removeEventListener('beforeinstallprompt', onPromptEvent);
}

export async function runInstall(promptEvent) {
    if (!promptEvent || typeof promptEvent.prompt !== 'function') return false;
    await promptEvent.prompt();
    return true;
}

export function registerAppWorker() {
    const worker = navigator.serviceWorker;
    if (!worker || typeof worker.register !== 'function') return;
    worker.register('/sw.js').catch(() => {});
}
