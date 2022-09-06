const { PrismaClient } = require('@prisma/client');
const awsXray = require('aws-xray-sdk-core');
const { capturePrisma } = require('../../dist');

awsXray.enableAutomaticMode();

const prisma = new PrismaClient();

const client = capturePrisma(prisma, { namespace: 'remote' });
const ns = awsXray.getNamespace();

const segment = new awsXray.Segment('prisma-xray-sample-auto');

ns.run(async () => {
  const subSegment = segment.addNewSubsegment('Prisma');
  awsXray.setSegment(subSegment);
  await client.company.upsert({
    create: {
      name: 'Prisma',
      createdAt: new Date(),
    },
    update: {},
    where: {
      id: 1,
    },
  });
  const companies = await client.company.findMany();
  console.log(companies);
  subSegment.close();
  const timeout = segment.addNewSubsegment('timeout');
  setTimeout(() => {
    timeout.close();
    segment.close();
  }, 1000);
  prisma.$disconnect();
});
