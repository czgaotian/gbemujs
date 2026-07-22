export const SERIAL = 'serial';
export const FRAME_UPDATE = 'frame_update';

export type EVENT_TYPE = typeof SERIAL | typeof FRAME_UPDATE;

type ArgMap = {
  [SERIAL]: number[];
  [FRAME_UPDATE]: Uint8ClampedArray;
};

export class EventBus {
  events: Map<EVENT_TYPE, Set<Function>> = new Map();

  on<T extends EVENT_TYPE>(event: T, callback: (data: ArgMap[T]) => any) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)?.add(callback);
  }

  off(event: EVENT_TYPE) {
    this.events.delete(event);
  }

  emit<T extends EVENT_TYPE>(event: EVENT_TYPE, data: ArgMap[T]) {
    this.events.get(event)?.forEach((callback) => callback(data));
  }
}
