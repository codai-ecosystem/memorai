/**
 * @fileoverview CLI output utilities
 */

// import chalk from 'chalk'; // Removed as not used in production mode

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
    info(_message: string, ..._args: unknown[]): void {
    if (this.jsonMode) {
      // Console statement removed for production
    } else {
      // const coloredMessage = this.colorEnabled ? chalk.blue(message) : message;
      // Console statement removed for production
    }
  }
  
  success(_message: string, ..._args: unknown[]): void {
    if (this.jsonMode) {
      // Console statement removed for production
    } else {
      // const coloredMessage = this.colorEnabled ? chalk.green(message) : message;
      // Console statement removed for production
    }
  }
  
  warn(_message: string, ..._args: unknown[]): void {
    if (this.jsonMode) {
      // Console statement removed for production
    } else {
      // const coloredMessage = this.colorEnabled ? chalk.yellow(message) : message;
      // Console statement removed for production
    }
  }
  
  error(_message: string, ..._args: unknown[]): void {
    if (this.jsonMode) {
      // Console statement removed for production
    } else {
      // const coloredMessage = this.colorEnabled ? chalk.red(message) : message;
      // Console statement removed for production
    }
  }
  
  debug(_message: string, ..._args: unknown[]): void {
    if (!this.verbose) return;
    
    if (this.jsonMode) {
      // Console statement removed for production
    } else {
      // const coloredMessage = this.colorEnabled ? chalk.gray(message) : message;
      // Console statement removed for production
    }
  }
}
