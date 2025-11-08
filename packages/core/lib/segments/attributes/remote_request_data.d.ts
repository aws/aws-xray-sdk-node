import * as http from 'http';
import * as https from 'https';

declare class RemoteRequestData {
  request: { url: string, method: string, traced?: boolean };

  response?: http.IncomingMessage | https.IncomingMessage;

  constructor(req: http.ClientRequest | https.ClientRequest, res: http.IncomingMessage | https.IncomingMessage, downstreamXRayEnabled: boolean);

  init(res: http.ServerResponse): void;
}

export = RemoteRequestData;
