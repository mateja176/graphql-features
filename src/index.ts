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
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
  GraphQLSchema,
  isScalarType,
  printSchema,
} from 'graphql';
import { getFilterType, isIdField } from './utils';

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
      const outputType = new GraphQLNonNull(type as GraphQLOutputType);
      const inputType = new GraphQLNonNull(type as GraphQLInputType);

      const queryName = type.name.toLowerCase();

      const nonNullIdType = new GraphQLNonNull(GraphQLID);

      const fieldConfigMap = (type as GraphQLObjectType).toConfig().fields;

      const fieldConfigPairs = Object.entries(fieldConfigMap);

      const idConfigPair = fieldConfigPairs.find(([, fieldConfig]) =>
        isIdField(fieldConfig),
      );
      if (!idConfigPair) {
        throw new Error(`Type ${type.name} does not have field of type ID`);
      }
      const [idName] = idConfigPair;
      const fieldConfigPairsWithoutId = fieldConfigPairs.filter(
        ([, fieldConfig]) => !isIdField(fieldConfig),
      );

      const updateInputType = new GraphQLInputObjectType({
        name: `Update${type.name}Input`,
        fields: {
          [idName]: { type: nonNullIdType },
          ...fieldConfigPairsWithoutId.reduce(
            (map, [name, fieldConfig]) => ({
              ...map,
              [name]: {
                type: getNullableType(fieldConfig.type) as GraphQLInputType,
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
            [queryName]: {
              type: outputType,
              args: { [idName]: { type: nonNullIdType } },
            },
            [`${queryName}s`]: {
              type: new GraphQLNonNull(new GraphQLList(outputType)),
              args: {
                limit: { type: GraphQLInt },
                offset: { type: GraphQLInt },
                filter: { type: getFilterType(type.name)(fieldConfigPairs) },
              },
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
            [`update${type.name}`]: {
              type: outputType,
              args: {
                input: { type: updateInputType },
              },
            },
            [`delete${type.name}`]: {
              type: outputType,
              args: {
                [idName]: { type: nonNullIdType },
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
