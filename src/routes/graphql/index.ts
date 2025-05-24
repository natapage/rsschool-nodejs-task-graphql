import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import { graphql, validate, parse } from 'graphql';
import { schema } from './schema.js';
import { createLoaders } from './resolvers.js';
import depthLimit from 'graphql-depth-limit';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { prisma } = fastify;

  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      ...createGqlResponseSchema,
      response: {
        200: gqlResponseSchema,
      },
    },
    async handler(req) {
      const loaders = createLoaders(prisma);
      const context = {
        prisma,
        fastify,
        loaders,
      };

      try {
        const document = parse(req.body.query);
        const validationErrors = validate(schema, document, [depthLimit(5)]);
        if (validationErrors.length > 0) {
          return {
            errors: validationErrors,
          };
        }

        const result = await graphql({
          schema,
          source: req.body.query,
          contextValue: context,
          variableValues: req.body.variables,
        });

        return result;
      } catch (error) {
        return {
          errors: [error],
        };
      }
    },
  });
};

export default plugin;
