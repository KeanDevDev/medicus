/**
 * Real-time Telemetry Service
 * Swasthya Grid: Federated AI Control Tower for India's Public Health Supply Chain
 * 
 * Provides zero-latency bi-directional event distribution via:
 * 1. Server-Sent Events (SSE) stream (/api/realtime/stream) for live server events.
 * 2. HTML5 BroadcastChannel ('medicus_realtime_channel') for instant cross-tab synchronization.
 * 3. DOM CustomEvent ('medicus:realtime-event') for in-app reactive component re-fetching.
 */

export interface RealtimeTelemetryEvent {
  type: string;
  event?: string;
  version?: number;
  timestamp?: string;
  phc_id?: string;
  phc_name?: string;
  medicine_id?: string;
  medicine_name?: string;
  closing_stock?: number;
  beds_occupied?: number;
  bed_capacity?: number;
  doctors_present?: number;
  scenario_id?: string;
  scenario_name?: string;
  summary?: string;
  deltas?: Record<string, number>;
  [key: string]: any;
}

type EventCallback = (event: RealtimeTelemetryEvent) => void;

class RealtimeTelemetryService {
  private eventSource: EventSource | null = null;
  private channel: BroadcastChannel | null = null;
  private subscribers: Set<EventCallback> = new Set();
  private reconnectTimer: any = null;
  public isConnected: boolean = false;
  public lastEvent: RealtimeTelemetryEvent | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('medicus_realtime_channel');
        this.channel.onmessage = (messageEvent) => {
          if (messageEvent.data) {
            this.distributeLocal(messageEvent.data, false);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported in this context:', e);
      }
    }
  }

  /**
   * Initializes the persistent SSE stream with automatic backoff reconnection.
   */
  public connect() {
    if (typeof window === 'undefined' || this.eventSource) return;

    try {
      this.eventSource = new EventSource('/api/realtime/stream');

      this.eventSource.onopen = () => {
        this.isConnected = true;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.eventSource.onmessage = (messageEvent) => {
        try {
          const payload: RealtimeTelemetryEvent = JSON.parse(messageEvent.data);
          this.distributeLocal(payload, true);
        } catch {
          // Heartbeat or comment packet
        }
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Auto-reconnect after 3 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 3000);
        }
      };
    } catch (err) {
      console.warn('Real-time EventSource connection error:', err);
    }
  }

  /**
   * Subscribes a React component to real-time events. Returns an unsubscribe function.
   */
  public subscribe(callback: EventCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Distributes an event to all local subscribers, BroadcastChannel, and window events.
   */
  public distributeLocal(event: RealtimeTelemetryEvent, broadcastToTabs: boolean = true) {
    this.lastEvent = event;

    // 1. Notify in-memory subscribers
    this.subscribers.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error('Subscriber callback error:', err);
      }
    });

    // 2. Broadcast across tabs
    if (broadcastToTabs && this.channel) {
      try {
        this.channel.postMessage(event);
      } catch {}
    }

    // 3. Dispatch DOM CustomEvent
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('medicus:realtime-event', {
          detail: event,
        })
      );
    }
  }

  /**
   * Broadcasts a user-initiated update across tabs immediately.
   */
  public notifyClientUpdate(event: RealtimeTelemetryEvent) {
    this.distributeLocal(event, true);
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isConnected = false;
  }
}

export const realtime = new RealtimeTelemetryService();
