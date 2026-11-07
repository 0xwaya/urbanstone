let pendingInstallPrompt = null;
const installPromptSubscribers = new Set();
let listeningForInstallPrompt = false;

function notifyInstallPrompt(event) {
    installPromptSubscribers.forEach((subscriber) => subscriber(event));
}

function onInstallPrompt(event) {
    event.preventDefault();
    pendingInstallPrompt = event;
    notifyInstallPrompt(event);
}

export function captureInstallPrompt(onPrompt) {
    if (!listeningForInstallPrompt) {
        window.addEventListener('beforeinstallprompt', onInstallPrompt);
        listeningForInstallPrompt = true;
    }
    installPromptSubscribers.add(onPrompt);
    if (pendingInstallPrompt) onPrompt(pendingInstallPrompt);
    return () => installPromptSubscribers.delete(onPrompt);
}

export async function runInstall(promptEvent) {
    if (!promptEvent || typeof promptEvent.prompt !== 'function') return false;
    if (pendingInstallPrompt === promptEvent) {
        pendingInstallPrompt = null;
        notifyInstallPrompt(null);
    }
    await promptEvent.prompt();
    return true;
}

export function registerAppWorker() {
    const worker = navigator.serviceWorker;
    if (!worker || typeof worker.register !== 'function') return;
    worker.register('/sw.js').catch(() => {});
}
