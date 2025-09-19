type CallbackListener = (url: string) => void;

const listeners = new Set<CallbackListener>();

export function subscribeToCallbacks(listener: CallbackListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitCallback(url: string) {
  for (const listener of listeners) {
    try {
      listener(url);
    } catch (err) {
      console.warn('Callback listener threw', err);
    }
  }
}
