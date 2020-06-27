import * as fastify from "fastify";

export function capture({
  fastify,
  defaultName,
}: {
  fastify: fastify.FastifyInstance;
  defaultName: string;
}): void;
