import { PrismaClient } from '@prisma/client';
import { expectType } from 'tsd';
import { capturePrisma } from '../dist';

const prisma = new PrismaClient();

const client = capturePrisma(prisma);

expectType < PrismaClient > client;
