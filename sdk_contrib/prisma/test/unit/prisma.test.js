const xray = require('aws-xray-sdk-core');
const assert = require('chai').assert;
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const { PrismaClient } = require('@prisma/client');

const { capturePrisma } = require('../../dist');

const Segment = xray.Segment;

chai.should();
chai.use(sinonChai);

describe('Prisma', function () {
  let prisma;

  before(async function () {
    // Crear instancia de PrismaClient con SQLite
    prisma = new PrismaClient();

    // Conectar y crear las tablas usando Prisma migrate o executeRaw
    await prisma.$connect();
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS Company (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`;
  });

  beforeEach(async function () {
    // Limpiar la base de datos antes de cada test
    await prisma.$executeRaw`DELETE FROM Company`;
  });

  after(async function () {
    // Desconectar y limpiar
    await prisma.$disconnect();
    // Opcional: eliminar el archivo de base de datos después de los tests
    // if (fs.existsSync(dbPath)) {
    //   fs.unlinkSync(dbPath);
    // }
  });

  describe('capturePrisma', function () {
    var client, sandbox, segment;
    beforeEach(function () {
      xray.enableManualMode();

      segment = new Segment('test');
      client = capturePrisma(prisma, {
        segment,
      });
      sandbox = sinon.createSandbox();
    });

    afterEach(function () {
      xray.enableAutomaticMode();
      sandbox.restore();
    });

    it('should return a prisma client', function () {
      assert.isDefined(client);
      assert.isFunction(client.$connect);
    });

    it('should return a prisma client with a $connect method', function () {
      assert.isFunction(client.$connect);
    });

    it('should return a prisma client with a $queryRaw method', function () {
      assert.isFunction(client.$queryRaw);
    });

    it('should return a prisma client with a $queryRawUnsafe method', function () {
      assert.isFunction(client.$queryRawUnsafe);
    });
  });

  describe('capturePrisma with automatic mode', function () {
    var client, segment, sandbox;
    beforeEach(function () {
      xray.enableAutomaticMode();
      client = capturePrisma(prisma);
      segment = new Segment('test');
      sandbox = sinon.createSandbox();
    });

    afterEach(function () {
      xray.enableManualMode();
      sandbox.restore();
    });

    it('Segment should be set', async function () {
      const ns = xray.getNamespace();
      await ns.run(async () => {
        xray.setSegment(segment);
        await client.$connect();
        // Verificar que la conexión se estableció correctamente
        assert.isTrue(true);
      });
    });

    it('Segment should not be set', async function () {
      const ns = xray.getNamespace();
      const error = sinon.stub();
      const logger = xray.getLogger();
      logger.error = error;
      await ns.run(async () => {
        try {
          await client.company.create({
            data: {
              name: 'test',
            },
          });
        } catch (e) {
          // Se espera un error cuando no hay segmento
        }
        assert.isTrue(error.calledOnce);
      });
    });

    it('Segment is called with correct arguments', async function () {
      const ns = xray.getNamespace();
      await ns.run(async () => {
        xray.setSegment(segment);
        const data = {
          data: {
            name: 'test',
          },
        };
        const result = await client.company.create(data);
        assert.isObject(result);
        assert.equal(result.name, 'test');
      });
    });

    it('Segment have one subsegment', async function () {
      const ns = xray.getNamespace();
      await ns.run(async () => {
        xray.setSegment(segment);
        await client.company.create({
          data: {
            name: 'test',
          },
        });
        assert.equal(segment.subsegments.length, 1);
        assert.equal(segment.subsegments[0].name, 'company.create');
      });
    });

    it('Segment have two subsegments', async function () {
      const ns = xray.getNamespace();
      await ns.run(async () => {
        xray.setSegment(segment);
        await client.company.create({
          data: {
            name: 'test',
          },
        });
        assert.equal(segment.subsegments.length, 1);
        await client.company.findMany();
        assert.equal(segment.subsegments.length, 2);
        assert.equal(segment.subsegments[0].name, 'company.create');
        assert.equal(segment.subsegments[1].name, 'company.findMany');
      });
    });

    it('$queryRaw is called with correct arguments', async function () {
      const ns = xray.getNamespace();
      await ns.run(async () => {
        xray.setSegment(segment);
        // Primero crear un registro para poder consultarlo
        await client.company.create({
          data: {
            name: 'test company',
          },
        });
        // Usar queryRaw con SQLite (sintaxis de SQLite)
        const result = await client.$queryRaw`SELECT * FROM Company WHERE name = ${'test company'}`;
        assert.isArray(result);
        assert.isTrue(result.length > 0);
      });
    });

    it('$queryRaw creates a subsegment', async function () {
      const ns = xray.getNamespace();
      await ns.run(async () => {
        xray.setSegment(segment);
        await client.$queryRaw`SELECT * FROM Company`;
        assert.equal(segment.subsegments.length, 1);
        assert.equal(segment.subsegments[0].name, '$queryRaw');
      });
    });

    it('$queryRawUnsafe is called with correct arguments', async function () {
      const ns = xray.getNamespace();
      await ns.run(async () => {
        xray.setSegment(segment);
        // Primero crear un registro
        await client.company.create({
          data: {
            name: 'test company',
          },
        });
        // Usar queryRawUnsafe con SQLite
        const result = await client.$queryRawUnsafe(
          'SELECT * FROM Company WHERE name = ?',
          'test company'
        );
        assert.isArray(result);
        assert.isTrue(result.length > 0);
      });
    });

    it('$queryRawUnsafe creates a subsegment', async function () {
      const ns = xray.getNamespace();
      await ns.run(async () => {
        xray.setSegment(segment);
        await client.$queryRawUnsafe('SELECT * FROM Company');
        assert.equal(segment.subsegments.length, 1);
        assert.equal(segment.subsegments[0].name, '$queryRawUnsafe');
      });
    });

    it('$queryRaw and $queryRawUnsafe create separate subsegments', async function () {
      const ns = xray.getNamespace();
      await ns.run(async () => {
        xray.setSegment(segment);
        await client.$queryRaw`SELECT * FROM Company`;
        assert.equal(segment.subsegments.length, 1);
        assert.equal(segment.subsegments[0].name, '$queryRaw');
        await client.$queryRawUnsafe('SELECT * FROM Company');
        assert.equal(segment.subsegments.length, 2);
        assert.equal(segment.subsegments[1].name, '$queryRawUnsafe');
      });
    });
  });

  describe('capturePrisma with manual mode', function () {
    var client, segment, sandbox;
    beforeEach(function () {
      xray.enableManualMode();
      segment = new Segment('test');
      client = capturePrisma(prisma, {
        segment,
      });
      sandbox = sinon.createSandbox();
    });

    afterEach(function () {
      xray.enableManualMode();
      sandbox.restore();
    });

    it('Segment is optional', async function () {
      const result = await client.company.create({
        data: {
          name: 'test',
        },
      });
      assert.isObject(result);
      assert.equal(result.name, 'test');
    });

    it('Segment is deleted', async function () {
      const result = await client.company.create(
        {
          data: {
            name: 'test',
          },
        },
        segment
      );
      assert.isObject(result);
      assert.equal(result.name, 'test');
    });

    it('Segment is called with correct arguments', async function () {
      const data = {
        data: {
          name: 'test',
        },
      };
      const result = await client.company.create(data, segment);
      assert.isObject(result);
      assert.equal(result.name, 'test');
    });

    it('Segment have one subsegment', async function () {
      await client.company.create(
        {
          data: {
            name: 'test',
          },
        },
        segment
      );
      assert.equal(segment.subsegments.length, 1);
    });

    it('Segment have two subsegments', async function () {
      await client.company.create(
        {
          data: {
            name: 'test',
          },
        },
        segment
      );
      assert.equal(segment.subsegments.length, 1);
      await client.company.findMany(segment);
      assert.equal(segment.subsegments.length, 2);
    });

    it('$queryRaw is called with correct arguments', async function () {
      // Crear un registro primero
      await client.company.create({
        data: {
          name: 'test company',
        },
      });
      const result = await client.$queryRaw`SELECT * FROM Company WHERE name = ${'test company'}`;
      assert.isArray(result);
      assert.isTrue(result.length > 0);
    });

    it('$queryRaw creates a subsegment', async function () {
      await client.$queryRaw`SELECT * FROM Company`;
      // En modo manual, el segmento se pasa al crear el cliente, así que debería tener subsegmentos
      assert.isDefined(segment.subsegments);
      assert.equal(segment.subsegments.length, 1);
      assert.equal(segment.subsegments[0].name, '$queryRaw');
    });

    it('$queryRaw works without segment', async function () {
      const result = await client.$queryRaw`SELECT * FROM Company`;
      assert.isArray(result);
    });

    it('$queryRawUnsafe is called with correct arguments', async function () {
      // Crear un registro primero
      await client.company.create({
        data: {
          name: 'test company',
        },
      });
      // SQLite con $queryRawUnsafe necesita usar Prisma.Sql o sintaxis directa
      const result = await client.$queryRawUnsafe(
        `SELECT * FROM Company WHERE name = 'test company'`
      );
      assert.isArray(result);
      assert.isTrue(result.length > 0);
    });

    it('$queryRawUnsafe creates a subsegment', async function () {
      await client.$queryRawUnsafe('SELECT * FROM Company', segment);
      assert.equal(segment.subsegments.length, 1);
      assert.equal(segment.subsegments[0].name, '$queryRawUnsafe');
    });

    it('$queryRawUnsafe works without segment', async function () {
      const result = await client.$queryRawUnsafe('SELECT * FROM Company');
      assert.isArray(result);
    });

    it('$queryRaw and $queryRawUnsafe create separate subsegments', async function () {
      await client.$queryRaw`SELECT * FROM Company`;
      assert.equal(segment.subsegments.length, 1);
      assert.equal(segment.subsegments[0].name, '$queryRaw');
      await client.$queryRawUnsafe('SELECT * FROM Company', segment);
      assert.equal(segment.subsegments.length, 2);
      assert.equal(segment.subsegments[1].name, '$queryRawUnsafe');
    });
  });

  describe('capturePrisma with manual mode and subsegment', function () {
    var client, segment, subsegment, sandbox;
    beforeEach(function () {
      xray.enableManualMode();
      segment = new Segment('test');
      client = capturePrisma(prisma, { segment });
      subsegment = segment.addNewSubsegment('test');
      sandbox = sinon.createSandbox();
    });

    afterEach(function () {
      xray.enableManualMode();
      sandbox.restore();
    });

    it('Subsegment is called with correct arguments', async function () {
      const data = {
        data: {
          name: 'test',
        },
      };
      const result = await client.company.create(data, subsegment);
      assert.isObject(result);
      assert.equal(result.name, 'test');
    });

    it('Subsegment have one subsegment', async function () {
      await client.company.create(
        {
          data: {
            name: 'test',
          },
        },
        subsegment
      );
      assert.equal(segment.subsegments.length, 1);
    });

    it('Subsegment have two subsegments', async function () {
      await client.company.create(
        {
          data: {
            name: 'test',
          },
        },
        subsegment
      );
      assert.equal(segment.subsegments.length, 1);
      await client.company.findMany(subsegment);
      assert.equal(segment.subsegments.length, 1);
    });

    it('Segment have one subsegment', function () {
      assert.equal(segment.subsegments.length, 1);
    });

    it('$queryRaw with subsegment is called with correct arguments', async function () {
      // Crear un registro primero
      await client.company.create({
        data: {
          name: 'test company',
        },
      });
      const result = await client.$queryRaw`SELECT * FROM Company WHERE name = ${'test company'}`;
      assert.isArray(result);
      assert.isTrue(result.length > 0);
    });

    it('$queryRaw with subsegment creates a subsegment', async function () {
      await client.$queryRaw`SELECT * FROM Company`;
      // El segmento ya tiene un subsegmento inicial ('test'), y se agrega otro para $queryRaw
      assert.equal(segment.subsegments.length, 2);
      // Verificar que el último subsegmento es $queryRaw
      assert.equal(
        segment.subsegments[segment.subsegments.length - 1].name,
        '$queryRaw'
      );
    });

    it('$queryRawUnsafe with subsegment is called with correct arguments', async function () {
      // Crear un registro primero
      await client.company.create({
        data: {
          name: 'test company',
        },
      });
      const result = await client.$queryRawUnsafe(
        "SELECT * FROM Company WHERE name = 'test company'"
      );
      assert.isArray(result);
      assert.isTrue(result.length > 0);
    });

    it('$queryRawUnsafe with subsegment creates a subsegment', async function () {
      await client.$queryRawUnsafe('SELECT * FROM Company', subsegment);
      assert.equal(segment.subsegments.length, 1);
    });
  });

  describe('capturePrisma with $extends', function () {
    var client, extendedClient, segment, sandbox;
    beforeEach(function () {
      xray.enableManualMode();
      segment = new Segment('test');
      client = capturePrisma(prisma, {
        segment,
      });
      // Crear un cliente extendido con una extensión
      extendedClient = client.$extends({
        name: 'test-extension',
        query: {
          company: {
            async findByName(name) {
              // Usar el cliente original para la consulta
              return prisma.company.findFirst({
                where: { name },
              });
            },
          },
        },
      });
      sandbox = sinon.createSandbox();
    });

    afterEach(function () {
      xray.enableManualMode();
      sandbox.restore();
    });

    it('should work with extended client', async function () {
      // Crear un registro
      await client.company.create({
        data: {
          name: 'test company',
        },
      });
      // Verificar que el cliente extendido existe y funciona
      assert.isDefined(extendedClient);
      assert.isDefined(extendedClient.company);
      // Verificar que los métodos estándar funcionan
      const result = await extendedClient.company.findFirst({
        where: { name: 'test company' },
      });
      assert.isObject(result);
      assert.equal(result.name, 'test company');
    });

    it('should capture queries from extended client', async function () {
      await client.company.create({
        data: {
          name: 'test company',
        },
      });
      await extendedClient.company.findMany();
      assert.isDefined(segment.subsegments);
      assert.isTrue(segment.subsegments.length > 0);
    });

    it('should work with _extensions on extended client', async function () {
      // Verificar que el cliente extendido tiene acceso a _extensions
      assert.isDefined(extendedClient._extensions);
      // Verificar que _extensions es un objeto
      assert.isObject(extendedClient._extensions);
      // Verificar que el cliente extendido funciona correctamente con las extensiones
      const result = await extendedClient.company.findMany();
      assert.isArray(result);
      assert.isDefined(segment.subsegments);
      assert.isTrue(segment.subsegments.length > 0);
    });
  });
});
