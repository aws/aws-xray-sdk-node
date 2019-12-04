export interface Logger {
  debug(...args: any[]): any;
  info(...args: any[]): any;
  warn(...args: any[]): any;
  error(...args: any[]): any;
}

export function setLogger(logObj: Logger): void;

export function getLogger(): Logger;
