declare class TraceID {
  version: number;
  timestamp: string;
  id: string;

  constructor(tsHex?: string, numberhex?: string);

  static Invalid(): TraceID;

  static FromString(rawId: string): TraceID;

  toString(): string;
}

export = TraceID;
