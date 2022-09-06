import { DMMF } from '@prisma/client/runtime';
import { PrismaPromise } from './types';

const { ModelAction } = DMMF;

export const isAction = (action: any): action is keyof typeof ModelAction =>
  !!ModelAction[action as keyof typeof ModelAction];
export const isPrismaPromise = (res: any): res is PrismaPromise<any> =>
  res[Symbol.toStringTag] === 'PrismaPromise';
