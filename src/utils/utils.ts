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
import { FieldConfigPairs } from '../models';

export const isIdField = (
  config: GraphQLFieldConfig<unknown, unknown>,
): boolean => isEqualType(new GraphQLNonNull(GraphQLID), config.type);

export const getFieldConfigPairs = (
  type: GraphQLObjectType,
): FieldConfigPairs => {
  const fieldConfigMap = type.toConfig().fields;

  return Object.entries(fieldConfigMap);
};
export const getIdName = (type: GraphQLObjectType): string => {
  const fieldConfigPairs = getFieldConfigPairs(type);

  const idConfigPair = fieldConfigPairs.find(([, fieldConfig]) =>
    isIdField(fieldConfig),
  );

  if (!idConfigPair) {
    throw new Error(`Type ${type.name} does not have field of type ID`);
  }

  const [idName] = idConfigPair;

  return idName;
};

export const getScalarOrId = (
  type: GraphQLOutputType,
): GraphQLNonNull<GraphQLNullableType> | GraphQLOutputType => {
  const nullableType = isNullableType(type) ? type : getNullableType(type);

  return isObjectType(nullableType) ? new GraphQLNonNull(GraphQLID) : type;
};

const getInputFieldConfigMap = (
  mapType: (type: GraphQLOutputType) => GraphQLOutputType,
) => (type: GraphQLObjectType): GraphQLInputFieldConfigMap => {
  return Object.entries(type.toConfig().fields)
    .filter(([, fieldConfig]) => !isIdField(fieldConfig))
    .reduce((map, [key, fieldConfig]) => {
      return {
        ...map,
        [key]: {
          type: mapType(getScalarOrId(fieldConfig.type)) as GraphQLInputType,
        },
      };
    }, {} as GraphQLInputFieldConfigMap);
};

export const getCreateInputType = (
  type: GraphQLObjectType,
): GraphQLNonNull<GraphQLNullableType> =>
  new GraphQLNonNull(
    new GraphQLInputObjectType({
      name: `${type.name}CreateInput`,
      fields: getInputFieldConfigMap(identity)(type),
    }),
  );

export const getUpdateInputType = (
  type: GraphQLObjectType,
): GraphQLNonNull<GraphQLNullableType> =>
  new GraphQLNonNull(
    new GraphQLInputObjectType({
      name: `${type.name}UpdateInput`,
      fields: {
        [getIdName(type)]: { type: new GraphQLNonNull(GraphQLID) },
        ...getInputFieldConfigMap(getNullableType)(type),
      },
    }),
  );

const IdFilterInput = new GraphQLInputObjectType({
  name: 'IDFilterInput',
  fields: {
    equals: { type: new GraphQLNonNull(GraphQLID) },
    not: { type: new GraphQLNonNull(GraphQLID) },
  },
});
const BooleanFilterInput = new GraphQLInputObjectType({
  name: 'BooleanFilterInput',
  fields: {
    equals: { type: new GraphQLNonNull(GraphQLBoolean) },
    not: { type: new GraphQLNonNull(GraphQLBoolean) },
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
    equals: { type: scalar },
    not: { type: scalar },
    le: { type: scalar },
    lt: { type: scalar },
    lte: { type: scalar },
    ge: { type: scalar },
    gt: { type: scalar },
    gte: { type: scalar },
    in: { type: new GraphQLList(scalar) },
    notIn: { type: new GraphQLList(scalar) },
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

const SortDirection = new GraphQLEnumType({
  name: 'SortDirection',
  values: { asc: {}, desc: {} },
});

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
