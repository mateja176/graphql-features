/* eslint-disable indent */

import {
  getNullableType,
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFieldConfig,
  GraphQLFloat,
  GraphQLID,
  GraphQLInputFieldConfigMap,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLNullableType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLString,
  isEqualType,
  isNullableType,
  isObjectType,
} from 'graphql';
import { identity } from 'ramda';
import { FieldConfigPairs } from './models';

export const isIdField = (
  config: GraphQLFieldConfig<unknown, unknown>,
): boolean => isEqualType(new GraphQLNonNull(GraphQLID), config.type);

export const getScalarOrId = (
  type: GraphQLOutputType,
): GraphQLNonNull<GraphQLNullableType> | GraphQLOutputType => {
  const nullableType = isNullableType(type) ? type : getNullableType(type);

  return isObjectType(nullableType) ? new GraphQLNonNull(GraphQLID) : type;
};

const getInputType = (
  mapType: (type: GraphQLOutputType) => GraphQLOutputType,
) => (suffix: string) => (
  type: GraphQLObjectType,
): GraphQLNonNull<GraphQLNullableType> => {
  return new GraphQLNonNull(
    new GraphQLInputObjectType({
      name: `${type.name}${suffix}`,
      fields: Object.entries(type.toConfig().fields)
        .filter(([, fieldConfig]) => !isIdField(fieldConfig))
        .reduce((map, [key, fieldConfig]) => {
          return {
            ...map,
            [key]: {
              type: mapType(
                getScalarOrId(fieldConfig.type),
              ) as GraphQLInputType,
            },
          };
        }, {} as GraphQLInputFieldConfigMap),
    }),
  );
};

export const getCreateInputType = getInputType(identity)('CreateInput');
export const getUpdateInputType = getInputType(getNullableType)('UpdateInput');

const IdFilterInput = new GraphQLInputObjectType({
  name: 'IDFilterInput',
  fields: {
    eq: { type: new GraphQLNonNull(GraphQLID) },
    ne: { type: new GraphQLNonNull(GraphQLID) },
  },
});
const BooleanFilterInput = new GraphQLInputObjectType({
  name: 'BooleanFilterInput',
  fields: {
    eq: { type: new GraphQLNonNull(GraphQLBoolean) },
    ne: { type: new GraphQLNonNull(GraphQLBoolean) },
  },
});
const getEqualityFilter = (
  type: 'String' | 'Int' | 'Float',
): GraphQLInputFieldConfigMap => {
  const scalar = new GraphQLNonNull(
    type === 'String'
      ? GraphQLString
      : type === 'Int'
      ? GraphQLInt
      : GraphQLFloat,
  );
  return {
    eq: { type: scalar },
    ne: { type: scalar },
    le: { type: scalar },
    lt: { type: scalar },
    ge: { type: scalar },
    gt: { type: scalar },
  };
};

const IntFilterInput = new GraphQLInputObjectType({
  name: 'IntFilterInput',
  fields: {
    ...getEqualityFilter('Int'),
  },
});
const FloatFilterInput = new GraphQLInputObjectType({
  name: 'FloatFilterInput',
  fields: {
    ...getEqualityFilter('Float'),
  },
});
const StringFilterInput = new GraphQLInputObjectType({
  name: 'StringFilterInput',
  fields: {
    ...getEqualityFilter('String'),
    contains: { type: GraphQLString },
    notContains: { type: GraphQLString },
    startsWith: { type: GraphQLString },
    endsWith: { type: GraphQLString },
  },
});
export const scalars = [
  [GraphQLID, IdFilterInput],
  [GraphQLBoolean, BooleanFilterInput],
  [GraphQLInt, IntFilterInput],
  [GraphQLFloat, FloatFilterInput],
  [GraphQLString, StringFilterInput],
] as const;
export const getFilterType = (typeName: string) => (
  fieldConfigPairs: FieldConfigPairs,
): GraphQLInputType => {
  return new GraphQLInputObjectType({
    name: `${typeName}FilterInput`,
    fields: fieldConfigPairs
      .map(
        ([key, config]) =>
          [
            key,
            scalars.find(
              ([scalar]) =>
                isEqualType(scalar, config.type) ||
                isEqualType(new GraphQLNonNull(scalar), config.type),
            )?.[1],
          ] as const,
      )
      .filter((pair): pair is [string, GraphQLInputObjectType] => {
        return typeof pair[1] !== 'undefined';
      })
      .reduce(
        (map, [key, filter]) => ({ ...map, [key]: { type: filter } }),
        {} as GraphQLInputFieldConfigMap,
      ),
  });
};

const SortDirection = new GraphQLNonNull(
  new GraphQLEnumType({
    name: 'SortDirection',
    values: { asc: {}, desc: {} },
  }),
);

export const getSortType = (typeName: string) => (
  fieldConfigPairs: FieldConfigPairs,
): GraphQLInputType => {
  return new GraphQLList(
    new GraphQLInputObjectType({
      name: `${typeName}SortInput`,
      fields: fieldConfigPairs.reduce(
        (fields, [key]) => ({
          ...fields,
          [key]: {
            type: SortDirection,
          },
        }),
        {} as GraphQLInputFieldConfigMap,
      ),
    }),
  );
};
