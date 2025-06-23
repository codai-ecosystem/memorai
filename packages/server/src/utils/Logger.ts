/**
 * @fileoverview Logging utility for Memorai MCP Server
 */

import winston from "winston";
import { ServerConfig } from "../config/ServerConfig.js";

/**
 * Centralized logging for the server
 */
export class Logger {
  private static instance: winston.Logger;

  public static getInstance(): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = Logger.createLogger();
    }
    return Logger.instance;
  }

  private static createLogger(): winston.Logger {
    const config = ServerConfig.getInstance();
    const { level, format, file } = config.options.logging;

    const formats = [
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
    ];

    if (format === "json") {
      formats.push(winston.format.json());
    } else {
      formats.push(winston.format.colorize(), winston.format.simple());
    }

    const transports: winston.transport[] = [new winston.transports.Console()];

    if (file) {
      transports.push(new winston.transports.File({ filename: file }));
    }

    return winston.createLogger({
      level,
      format: winston.format.combine(...formats),
      transports,
      defaultMeta: {
        service: "memorai-mcp",
        version: process.env.npm_package_version || "0.1.0",
      },
    });
  }
  public static info(message: string, meta?: Record<string, unknown>): void {
    Logger.getInstance().info(message, meta);
  }

  public static error(message: string, error?: Error | unknown): void {
    Logger.getInstance().error(message, { error });
  }

  public static warn(message: string, meta?: Record<string, unknown>): void {
    Logger.getInstance().warn(message, meta);
  }

  public static debug(message: string, meta?: Record<string, unknown>): void {
    Logger.getInstance().debug(message, meta);
  }
}
