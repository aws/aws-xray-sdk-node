const xray = require('aws-xray-sdk-core');
const assert = require('chai').assert;
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const { capturePrisma } = require('../../dist');

const Segment = xray.Segment;

chai.should();
chai.use(sinonChai);

describe('Prisma', function () {
  let prisma;

  beforeEach(function () {
    prisma = {
      $connect: sinon.stub(),
      $disconnect: sinon.stub(),
      $on: sinon.stub(),
      $transaction: sinon.stub(),
      $use: sinon.stub(),
      $executeRaw: sinon.stub(),
      $queryRaw: sinon.stub(),
      $queryRawUnsafe: sinon.stub(),
      $exists: sinon.stub(),
      company: {
        create: sinon.stub(),
        findMany: sinon.stub(),
      },
    };
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
      assert.isObject(client);
    });

    it('should return a prisma client with a $connect method', function () {
      assert.isFunction(client.$connect);
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

    it('Segment should be set', function () {
      const ns = xray.getNamespace();
      ns.run(() => {
        xray.setSegment(segment);
        client.$connect();
        assert.isTrue(prisma.$connect.calledOnce);
        assert.isTrue(prisma.$connect.calledWithExactly());
      });
    });

    it('Segment should not be set', function () {
      const ns = xray.getNamespace();
      const error = sinon.stub();
      const logger = xray.getLogger();
      logger.error = error;
      ns.run(async () => {
        client.company.create();
        assert.isTrue(error.calledOnce);
      });
    });

    it('Segment is called with correct arguments', function () {
      const ns = xray.getNamespace();
      ns.run(() => {
        xray.setSegment(segment);
        const data = {
          data: {
            name: 'test',
          },
        };
        client.company.create(data);
        assert.isTrue(prisma.company.create.calledOnce);
        assert.isTrue(prisma.company.create.calledWithExactly(data));
      });
    });

    it('Segment have one subsegment', function () {
      const ns = xray.getNamespace();
      ns.run(() => {
        xray.setSegment(segment);
        client.company.create();
        assert.equal(segment.subsegments.length, 1);
        assert.equal(segment.subsegments[0].name, 'company.create');
      });
    });

    it('Segment have two subsegments', function () {
      const ns = xray.getNamespace();
      ns.run(() => {
        xray.setSegment(segment);
        client.company.create();
        assert.equal(segment.subsegments.length, 1);
        client.company.findMany();
        assert.equal(segment.subsegments.length, 2);
        assert.equal(segment.subsegments[0].name, 'company.create');
        assert.equal(segment.subsegments[1].name, 'company.findMany');
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

    it('Segment is optional', function () {
      client.company.create();
      assert.isTrue(prisma.company.create.calledOnce);
      assert.isTrue(prisma.company.create.calledWithExactly());
    });

    it('Segment is deleted', function () {
      client.company.create(segment);
      assert.isTrue(prisma.company.create.calledOnce);
      assert.isTrue(prisma.company.create.calledWithExactly());
    });

    it('Segment is called with correct arguments', function () {
      const data = {
        data: {
          name: 'test',
        },
      };
      client.company.create(data, segment);
      assert.isTrue(prisma.company.create.calledOnce);
      assert.isTrue(prisma.company.create.calledWithExactly(data));
    });

    it('Segment have one subsegment', function () {
      client.company.create(segment);
      assert.equal(segment.subsegments.length, 1);
    });

    it('Segment have two subsegments', function () {
      client.company.create(segment);
      assert.equal(segment.subsegments.length, 1);
      client.company.findMany(segment);
      assert.equal(segment.subsegments.length, 2);
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

    it('Subsegment is called with correct arguments', function () {
      const data = {
        data: {
          name: 'test',
        },
      };
      client.company.create(data, subsegment);
      assert.isTrue(prisma.company.create.calledOnce);
      assert.isTrue(prisma.company.create.calledWithExactly(data));
    });

    it('Subsegment have one subsegment', function () {
      client.company.create(subsegment);
      assert.equal(segment.subsegments.length, 1);
    });

    it('Subsegment have two subsegments', function () {
      client.company.create(subsegment);
      assert.equal(segment.subsegments.length, 1);
      client.company.findMany(subsegment);
      assert.equal(segment.subsegments.length, 1);
    });

    it('Segment have one subsegment', function () {
      assert.equal(segment.subsegments.length, 1);
    });
  });
});
