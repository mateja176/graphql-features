#! /usr/bin/env node

/* eslint-disable no-console */

import { mergeTypeDefs } from '@graphql-toolkit/schema-merging';
import commander from 'commander';
import fs from 'fs-extra';
import {
  buildASTSchema,
  DocumentNode,
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
import prettier from 'prettier';
import { pipe } from 'ramda';
import { Config } from './models';
import { getFilterType, getInputType, getSortType, isIdField } from './utils';

const { types, schema } = commander
  .option('-t, --types <path>', 'Path to directory containing graphql types')
  .option('-s, --schema <path>', 'Output path of generated schema', '.')
  .parse(process.argv);

const typesPath = join(process.cwd(), types);

const generateFeature = async (document: DocumentNode) => {
  const typeSchema = buildASTSchema(document);

  const config = Object.values(typeSchema.getTypeMap())
    .filter((type) => !isScalarType(type) && !type.name.startsWith('__'))
    .reduce<Config>(
      ({ query, mutation }, type) => {
        const outputType = new GraphQLNonNull(type as GraphQLOutputType);
        const objectType = type as GraphQLObjectType;

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
                args: {
                  input: {
                    type: getInputType('CreateInput')(objectType),
                  },
                },
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

  return new GraphQLSchema({
    query: new GraphQLObjectType(config.query),
    mutation: new GraphQLObjectType(config.mutation),
  });
};

fs.readdir(typesPath)
  .then((paths) =>
    Promise.all(
      paths.map((path) =>
        fs.readFile(join(typesPath, path), {
          encoding: 'utf-8',
        }),
      ),
    ),
  )
  .then((models) => {
    return pipe(mergeTypeDefs, generateFeature)(models);
  })
  .then((schemaDefinition) => {
    const schemaString = printSchema(schemaDefinition);
    const formattedSchema = prettier.format(schemaString, {
      parser: 'graphql',
    });
    fs.writeFile(join(process.cwd(), schema), formattedSchema);
  });
