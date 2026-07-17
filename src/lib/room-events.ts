type Listener = (roomId: string) => void;

const listeners = new Set<Listener>();

export function publishRoom(roomId: string): void {
  for (const listener of listeners) {
    listener(roomId);
  }
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
