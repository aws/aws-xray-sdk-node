import Subsegment = require('./attributes/subsegment');
import IncomingRequestData = require('../middleware/incoming_request_data');

declare class Segment {
  id: string;
  name: string;
  start_time: number;
  end_time?: number;
  in_progress?: boolean;
  trace_id: string;
  parent_id?: string;
  origin?: string;
  subsegments?: Array<Subsegment>;
  notTraced?: boolean;

  constructor(name: string, rootId?: string | null, parentId?: string | null);

  addIncomingRequestData(data: IncomingRequestData): void;

  addAnnotation(key: string, value: boolean | string | number): void;

  setUser(user: string): void;

  addMetadata(key: string, value: any, namespace?: string): void;

  setSDKData(data: object): void;

  setMatchedSamplingRule(ruleName: string): void;

  setServiceData(data: any): void;

  addPluginData(data: object): void;

  addNewSubsegment(name: string): Subsegment;

  addSubsegment(subsegment: Subsegment): void;

  removeSubsegment(subsegment: Subsegment): void;

  addError(err: Error | string, remote?: boolean): void;

  addFaultFlag(): void;

  addErrorFlag(): void;

  addThrottleFlag(): void;

  isClosed(): boolean;

  incrementCounter(additional?: number): void;

  decrementCounter(): void;

  close(err?: Error | string | null, remote?: boolean): void;

  flush(): void;

  format(): string;

  toString(): string;
}

export = Segment;
