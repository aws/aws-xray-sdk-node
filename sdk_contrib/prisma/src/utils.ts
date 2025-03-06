import { PrismaPromise } from './types';

enum ModelAction {
  findUnique = 'findUnique',
  findUniqueOrThrow = 'findUniqueOrThrow',
  findFirst = 'findFirst',
  findFirstOrThrow = 'findFirstOrThrow',
  findMany = 'findMany',
  create = 'create',
  createMany = 'createMany',
  createManyAndReturn = 'createManyAndReturn',
  update = 'update',
  updateMany = 'updateMany',
  upsert = 'upsert',
  delete = 'delete',
  deleteMany = 'deleteMany',
  groupBy = 'groupBy',
  count = 'count', // TODO: count does not actually exist, why?
  aggregate = 'aggregate',
  findRaw = 'findRaw',
  aggregateRaw = 'aggregateRaw',
}

export const isAction = (action: any): action is keyof typeof ModelAction =>
  !!ModelAction[action as keyof typeof ModelAction];
export const isPrismaPromise = (res?: any): res is PrismaPromise<any> =>
  res?.[Symbol.toStringTag] === 'PrismaPromise';
