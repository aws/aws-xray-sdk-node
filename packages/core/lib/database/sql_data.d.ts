declare class SqlData {
  database_version?: string;
  driver_version?: string;
  preparation?: string;
  url?: string;
  user?: string;

  constructor(databaseVer?: string, driverVer?: string, user?: string, url?: string, queryType?: string);
}

export = SqlData;
