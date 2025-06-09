/**
 * @fileoverview CLI output utilities
 */

import chalk from 'chalk';

export class Output {
  private verbose = false;
  private jsonMode = false;
  private colorEnabled = true;
  
  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }
  
  setJsonMode(json: boolean): void {
    this.jsonMode = json;
  }
  
  setColorEnabled(enabled: boolean): void {
    this.colorEnabled = enabled;
  }

  setFormat(format: string): void {
    if (format === 'json') {
      this.setJsonMode(true);
    }
  }

  setColors(enabled: boolean): void {
    this.setColorEnabled(enabled);
  }
  
  info(message: string, ...args: any[]): void {
    if (this.jsonMode) {
      console.log(JSON.stringify({ level: 'info', message, args }));
    } else {
      const coloredMessage = this.colorEnabled ? chalk.blue(message) : message;
      console.log(coloredMessage, ...args);
    }
  }
  
  success(message: string, ...args: any[]): void {
    if (this.jsonMode) {
      console.log(JSON.stringify({ level: 'success', message, args }));
    } else {
      const coloredMessage = this.colorEnabled ? chalk.green(message) : message;
      console.log(coloredMessage, ...args);
    }
  }
  
  warn(message: string, ...args: any[]): void {
    if (this.jsonMode) {
      console.error(JSON.stringify({ level: 'warn', message, args }));
    } else {
      const coloredMessage = this.colorEnabled ? chalk.yellow(message) : message;
      console.warn(coloredMessage, ...args);
    }
  }
  
  error(message: string, ...args: any[]): void {
    if (this.jsonMode) {
      console.error(JSON.stringify({ level: 'error', message, args }));
    } else {
      const coloredMessage = this.colorEnabled ? chalk.red(message) : message;
      console.error(coloredMessage, ...args);
    }
  }
  
  debug(message: string, ...args: any[]): void {
    if (!this.verbose) return;
    
    if (this.jsonMode) {
      console.log(JSON.stringify({ level: 'debug', message, args }));
    } else {
      const coloredMessage = this.colorEnabled ? chalk.gray(message) : message;
      console.log(coloredMessage, ...args);
    }
  }
}
