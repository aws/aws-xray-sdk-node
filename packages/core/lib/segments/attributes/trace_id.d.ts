declare class TraceID {
  version: number;
  timestamp: string;
  id: string;

  constructor();

  static FromString(rawId: string): TraceID;

  toString(): string;
}

export = TraceID;
