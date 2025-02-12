
export class EventBus {
  events: Map<string, Set<Function>> = new Map();

  on(event: string, callback: (data: any) => void) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)?.add(callback);
  }

  off(event: string) {
    this.events.delete(event);
  }

  emit(event: string, data: any) {
    this.events.get(event)?.forEach((callback) => callback(data));
  }
}
