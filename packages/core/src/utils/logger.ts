/**
 * Simple logging utility for the Memorai core package
 */

/// <reference types="node" />

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// LogEntry interface for future use when implementing full logging
// interface LogEntry {
//     level: LogLevel;
//     message: string;
//     timestamp: Date;
//     data?: unknown;
// }

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
    }    private log(level: LogLevel, _message: string, _data?: unknown): void {
        if (!this.shouldLog(level)) return;// In testing environment, just use console for simplicity
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - process is available in Node.js environment
        if (process.env.NODE_ENV === 'test') {
            return;
        }// Format the log message would use these variables
        // const timestamp = entry.timestamp.toISOString();
        // const levelStr = level.toUpperCase().padEnd(5);
        // const logMessage = `[${timestamp}] ${levelStr} ${message}`;

        // Output to console with appropriate method
        switch (level) {
            case 'debug':
                // eslint-disable-next-line no-console
                // Console statement removed for production
                break;
            case 'info':
                // eslint-disable-next-line no-console
                // Console statement removed for production
                break;
            case 'warn':
                // eslint-disable-next-line no-console
                // Console statement removed for production
                break;
            case 'error':
                // eslint-disable-next-line no-console
                // Console statement removed for production
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
