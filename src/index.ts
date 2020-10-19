#! /usr/bin/env node

/* eslint-disable no-console */

// import commander from 'commander';
// import * as fs from 'fs-extra';
// import { join } from 'path';
import {
  buildSchema,
  getNullableType,
  GraphQLID,
  GraphQLInputFieldConfigMap,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
  GraphQLSchema,
  isScalarType,
  printSchema,
} from 'graphql';
import { isIdField } from './utils';

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

const config = Object.values(schema.getTypeMap())
  .filter((type) => !isScalarType(type) && !type.name.startsWith('__'))
  .reduce<Config>(
    ({ query, mutation }, type) => {
      const outputType = type as GraphQLOutputType;
      const inputType = type as GraphQLInputType;

      const fieldConfigMap = (type as GraphQLObjectType).toConfig().fields;

      const fieldConfigPairs = Object.entries(fieldConfigMap);

      const idConfigPair = fieldConfigPairs.find(([, config]) =>
        isIdField(config),
      );
      if (!idConfigPair) {
        throw new Error(`Type ${type.name} does not have field of type ID`);
      }
      const [idName, idConfig] = idConfigPair;
      const fieldConfigPairsWithoutId = fieldConfigPairs.filter(
        ([, config]) => !isIdField(config),
      );

      const updateInputType = new GraphQLInputObjectType({
        name: `Update${type.name}Input`,
        fields: {
          [idName]: { type: new GraphQLNonNull(GraphQLID) },
          ...fieldConfigPairsWithoutId.reduce(
            (map, [name, config]) => ({
              ...map,
              [name]: {
                type: getNullableType(config.type) as GraphQLInputType,
              },
            }),
            {} as GraphQLInputFieldConfigMap,
          ),
        },
      });
      return {
        query: {
          ...query,
          fields: {
            ...query.fields,
            [type.name.toLowerCase()]: {
              type: outputType,
              args: { [idName]: { type: new GraphQLNonNull(GraphQLID) } },
            },
          },
        },
        mutation: {
          ...mutation,
          fields: {
            ...mutation.fields,
            [`create${type.name}`]: {
              type: outputType,
              args: { input: { type: new GraphQLNonNull(inputType) } },
            },
            [`update${type.name}`]: {
              type: outputType,
              args: {
                input: { type: updateInputType },
              },
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
