#! /usr/bin/env node

/* eslint-disable no-console */

import commander from 'commander';
import fs from 'fs-extra';
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
  GraphQLOutputType,
  GraphQLSchema,
  isScalarType,
  printSchema,
} from 'graphql';
import { join } from 'path';
import { Config } from './models';
import { getFilterType, getSortType, isIdField } from './utils';

const { types, schema } = commander
  .option('-t, --types <path>', 'Path to directory containing graphql types')
  .option('-s, --schema <path>', 'Output path of generated schema', '.')
  .parse(process.argv);

const typesPath = join(process.cwd(), types);

const generateFeature = async (path: string) => {
  const schemaString: string = await fs.readFile(join(typesPath, path), {
    encoding: 'utf-8',
  });

  const typeSchema = buildSchema(schemaString);

  const config = Object.values(typeSchema.getTypeMap())
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
                  sort: {
                    type: getSortType(type.name)(fieldConfigPairsWithoutId),
                  },
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

  return printSchema(
    new GraphQLSchema({
      query: new GraphQLObjectType(config.query),
      mutation: new GraphQLObjectType(config.mutation),
    }),
  );
};

fs.readdir(typesPath)
  .then((paths) => Promise.all(paths.map(generateFeature)))
  .then((schemaDefinitions) => {
    fs.writeFile(join(process.cwd(), schema), schemaDefinitions[0]);
  });
