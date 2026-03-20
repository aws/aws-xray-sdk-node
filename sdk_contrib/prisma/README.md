# Prisma-xray

A prisma plugin to log requests and subsegments through AWSXray.

![Screenshot of the AWS X-Ray console](/sdk_contrib/prisma/images/servicemap.png?raw=true)

## Timeline

![Screenshot of the AWS X-Ray console](/sdk_contrib/prisma/images/timeline.png?raw=true)

## Requirements

- AWS X-Ray SDK Core
- Prisma 4 or greater

## AWS X-Ray and Prisma

The AWS X-Ray Prisma package automatically records query information and request
and response data. Simply patch the Prisma package via `capturePrisma` as shown below.

The AWS X-Ray SDK Core has two modes - `manual` and `automatic`.
Automatic mode uses the `cls-hooked` package and automatically
tracks the current segment and subsegment. This is the default mode.
Manual mode requires that you pass around the segment reference. See the examples below.

## Automatic mode examples

![Screenshot of the AWS X-Ray console](/sdk_contrib/prisma/images/auto.png?raw=true)

```js
import { PrismaClient } from '@prisma/client';
import AWSXRay from 'aws-xray-sdk';
import { capturePrisma } from 'aws-xray-sdk-prisma';

const ns = AWSXRay.getNamespace();

const prisma = new PrismaClient();

const client = capturePrisma(prisma, { namespace: 'remote' });

const segment = new AWSXRay.Segment('prisma-xray-sample-auto');

ns.run(async () => {
  const subSegment = segment.addNewSubsegment('Prisma');
  AWSXRay.setSegment(subSegment);
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
  // ...
});
```

## Manual mode examples

![Screenshot of the AWS X-Ray console](/sdk_contrib/prisma/images/manual.png?raw=true)

```js
import { PrismaClient } from '@prisma/client';
import AWSXRay from 'aws-xray-sdk-core';
import { capturePrisma } from 'aws-xray-sdk-prisma';

AWSXRay.enableManualMode();

const prisma = new PrismaClient();

const client = capturePrisma(prisma, { namespace: 'remote' });

const segment = new AWSXRay.Segment('prisma-xray-sample');

const run = async () => {
  const subSegment = segment.addNewSubsegment('Prisma');

  await client.company.upsert(
    {
      create: {
        name: 'Prisma',
        createdAt: new Date(),
      },
      update: {},
      where: {
        id: 1,
      },
    },
    // @ts-ignore
    subSegment
  );
  const companies = await client.company.findMany(
    // @ts-ignore
    subSegment
  );
  console.log(companies);
  subSegment.close();
  // ...
};

run();
```

# Contributors

- Eduard Castellanos <eduard@castellanos.dev>, <eduard@cosva.app>
