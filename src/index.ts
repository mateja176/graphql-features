#! /usr/bin/env node

/* eslint-disable no-console */

// import commander from 'commander';
// import * as fs from 'fs-extra';
// import { join } from 'path';
import {
  buildSchema,
  GraphQLID,
  GraphQLInputType,
  GraphQLObjectType,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
  GraphQLSchema,
  isScalarType,
  printSchema,
} from 'graphql';

// const { types } = commander
//   .option('-t, --types', 'Path to directory containing graphql types', '.')
//   .option('-s, --schema', 'Output path of generated schema', '.')
//   .parse(process.argv);

const schemaString = `
type User {
  id: ID!
  name: String!
  age: Int!
}
`;

const schema = buildSchema(schemaString);

type Config = {
  query: GraphQLObjectTypeConfig<unknown, unknown>;
  mutation: GraphQLObjectTypeConfig<unknown, unknown>;
};

// TODO filter out custom types
const config = Object.values(schema.getTypeMap())
  .filter((type) => !isScalarType(type) && !type.name.startsWith('__'))
  .reduce<Config>(
    ({ query, mutation }, type) => {
      const outputType = type as GraphQLOutputType;
      const inputType = type as GraphQLInputType;
      return {
        query: {
          ...query,
          fields: {
            ...query.fields,
            [type.name.toLowerCase()]: {
              type: outputType,
              args: { id: { type: GraphQLID } },
            },
          },
        },
        mutation: {
          ...mutation,
          fields: {
            ...mutation.fields,
            [`create${type.name}`]: {
              type: outputType,
              args: { input: { type: inputType } },
            },
          },
        },
      };
    },
    {
      query: { name: 'Query', fields: {} },
      mutation: { name: 'Mutation', fields: {} },
    } as Config,
  );

console.log(
  printSchema(
    new GraphQLSchema({
      query: new GraphQLObjectType(config.query),
      mutation: new GraphQLObjectType(config.mutation),
    }),
  ),
);
