import * as http from 'http';
import { Segment, SegmentLike } from '../../aws-xray';

declare class Subsegment {
  id: string;
  name: string;
  start_time: number;
  in_progress?: boolean;
  subsegments?: Array<Subsegment>;
  parent: SegmentLike;
  segment: Segment;
  namespace?: string;

  constructor(name: string);

  addNewSubsegment(name: string): Subsegment;

  addSubsegment(subsegment: Subsegment): void;

  removeSubsegment(subsegment: Subsegment): void;

  addAttribute(name: string, data: any): void;

  addPrecursorId(id: string): void;

  addAnnotation(key: string, value: boolean | string | number): void;

  addMetadata(key: string, value: any, namespace?: string): void;

  addSqlData(sqlData: any): void;

  addError(err: Error | string, remote?: boolean): void;

  addRemoteRequestData(req: http.ClientRequest, res: http.IncomingMessage, downstreamXRayEnabled?: boolean): void;

  addFaultFlag(): void;

  addErrorFlag(): void;

  addThrottleFlag(): void;

  close(err?: Error | string | null, remote?: boolean): void;

  incrementCounter(additional?: number): void;

  decrementCounter(): void;

  isClosed(): boolean;

  flush(): void;

  streamSubsegments(): true | undefined;

  format(): string;

  toString(): string;

  toJSON(): { [key: string]: any };
}

export = Subsegment;
