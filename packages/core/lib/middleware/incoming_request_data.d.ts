import * as http from 'http';

declare class IncomingRequestData {
  request: { [key: string]: any };

  constructor(req: http.IncomingMessage);

  close(res: http.ServerResponse): void;
}

export = IncomingRequestData;
