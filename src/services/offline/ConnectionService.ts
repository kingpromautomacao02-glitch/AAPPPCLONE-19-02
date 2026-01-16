type ConnectionCallback = (isOnline: boolean) => void;

class ConnectionService {
    private callbacks: ConnectionCallback[] = [];
    private _isOnline: boolean = navigator.onLine;
    private pingInterval: ReturnType<typeof setInterval> | null = null;
    private pingUrl: string = '';

    constructor() {
        // Listen for browser online/offline events
        window.addEventListener('online', () => this.handleConnectionChange(true));
        window.addEventListener('offline', () => this.handleConnectionChange(false));
    }

    initialize(supabaseUrl?: string): void {
        // Use Supabase URL for ping checks if available
        if (supabaseUrl) {
            this.pingUrl = supabaseUrl;
        }

        // Start periodic ping checks
        this.startPingCheck();

        console.log('ConnectionService: Initialized, online:', this._isOnline);
    }

    private handleConnectionChange(isOnline: boolean): void {
        if (this._isOnline !== isOnline) {
            this._isOnline = isOnline;
            console.log('ConnectionService: Connection changed to', isOnline ? 'ONLINE' : 'OFFLINE');
            this.notifyListeners();
        }
    }

    private startPingCheck(): void {
        // Check connection every 30 seconds
        this.pingInterval = setInterval(() => {
            this.checkConnection();
        }, 30000);
    }

    async checkConnection(): Promise<boolean> {
        // First check browser's navigator.onLine
        if (!navigator.onLine) {
            this.handleConnectionChange(false);
            return false;
        }

        // If we have a ping URL, verify actual connectivity
        if (this.pingUrl) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const response = await fetch(this.pingUrl, {
                    method: 'HEAD',
                    mode: 'no-cors',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                this.handleConnectionChange(true);
                return true;
            } catch (error) {
                // Network error - we're offline or server is unreachable
                this.handleConnectionChange(false);
                return false;
            }
        }

        // No ping URL, trust navigator.onLine
        this.handleConnectionChange(navigator.onLine);
        return navigator.onLine;
    }

    get isOnline(): boolean {
        return this._isOnline;
    }

    // Subscribe to connection changes
    onChange(callback: ConnectionCallback): () => void {
        this.callbacks.push(callback);
        // Immediately call with current state
        callback(this._isOnline);

        // Return unsubscribe function
        return () => {
            this.callbacks = this.callbacks.filter(cb => cb !== callback);
        };
    }

    private notifyListeners(): void {
        this.callbacks.forEach(cb => cb(this._isOnline));
    }

    // Cleanup
    destroy(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        window.removeEventListener('online', () => this.handleConnectionChange(true));
        window.removeEventListener('offline', () => this.handleConnectionChange(false));
    }
}

// Singleton instance
export const connectionService = new ConnectionService();
