declare class Aws {
  constructor(res: any, serviceName: string);

  addData(data: any): void;
}

declare namespace Aws {
  function setAWSWhitelist(source: string | object): void;

  function appendAWSWhitelist(source: string | object): void;
}

export = Aws;
