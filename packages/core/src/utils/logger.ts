/**
 * Simple logging utility for the Memorai core package
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: Date;
    data?: unknown;
}

class Logger {
    private static instance: Logger;
    private logLevel: LogLevel = 'info';

    private constructor() {
        // Set log level from environment
        const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
        if (envLevel && ['debug', 'info', 'warn', 'error'].includes(envLevel)) {
            this.logLevel = envLevel;
        }
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private shouldLog(level: LogLevel): boolean {
        const levels: Record<LogLevel, number> = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        return levels[level] >= levels[this.logLevel];
    }

    private log(level: LogLevel, message: string, data?: unknown): void {
        if (!this.shouldLog(level)) return;

        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date(),
            data
        };

        // In testing environment, just use console for simplicity
        if (process.env.NODE_ENV === 'test') {
            return;
        }

        // Format the log message
        const timestamp = entry.timestamp.toISOString();
        const levelStr = level.toUpperCase().padEnd(5);
        const logMessage = `[${timestamp}] ${levelStr} ${message}`;

        // Output to console with appropriate method
        switch (level) {
            case 'debug':
                // eslint-disable-next-line no-console
                console.debug(logMessage, data);
                break;
            case 'info':
                // eslint-disable-next-line no-console
                console.info(logMessage, data);
                break;
            case 'warn':
                // eslint-disable-next-line no-console
                console.warn(logMessage, data);
                break;
            case 'error':
                // eslint-disable-next-line no-console
                console.error(logMessage, data);
                break;
        }
    }
    public debug(message: string, data?: unknown): void {
        this.log('debug', message, data);
    }

    public info(message: string, data?: unknown): void {
        this.log('info', message, data);
    }

    public warn(message: string, data?: unknown): void {
        this.log('warn', message, data);
    }

    public error(message: string, data?: unknown): void {
        this.log('error', message, data);
    }
}

// Export singleton instance
export const logger = Logger.getInstance();
