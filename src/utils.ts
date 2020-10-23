/* eslint-disable indent */

import {
  getNullableType,
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLFloat,
  GraphQLID,
  GraphQLInputFieldConfigMap,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLNullableType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLString,
  GraphQLUnionType,
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

const idFilter = `type IDFilter = {
  equality: { eq: ID! } | { ne: ID! }
}`;
const booleanFilter = `type BooleanFilter = {
  equality: { eq: Boolean! } | { ne: Boolean! }
}`;
const getEqualityFilterString = (type: 'String' | 'Int' | 'Float' | string) =>
  `{ eq: ${type}! } | { ne: ${type}! } | { le: ${type}! } | { lt: ${type}! } | { ge: ${type}! } | { gt: ${type}! } | { le: ${type}! ge: ${type}! } | { le: ${type}! gt: ${type}! } | { lt: ${type}! ge: ${type}! } | { lt: ${type}! gt: ${type}! } `;
const intFilter = `type IntFilter = {
  equality: ${getEqualityFilterString('Int')}
}`;
const floatFilter = `type FloatFilter = {
  equality: ${getEqualityFilterString('Float')}
}`;
const stringFilter = `type StringFilter = {
  equality: ${getEqualityFilterString('String')}
  contains: String!
  notContains: String!
  beginsWith: String!
}`;
const scalarStrings = [
  [GraphQLID, idFilter],
  [GraphQLBoolean, booleanFilter],
  [GraphQLInt, intFilter],
  [GraphQLFloat, floatFilter],
  [GraphQLString, stringFilter],
] as const;
export const getFilterTypeString = (typeName: string) => (
  fieldConfigPairs: FieldConfigPairs,
): [string, string] => {
  const filterName = `${typeName}Filter`;

  return [
    filterName,
    `type ${filterName} {
  ${fieldConfigPairs
    .map(([key, config]) => {
      const filter = scalarStrings.find(([scalar]) =>
        isEqualType(config.type, scalar),
      )?.[1];
      return [key, filter];
    })
    .filter(([, filter]) => !!filter)
    .map(([key, filter]) => `${key}: ${filter}`)
    .join('\n')}
}`,
  ];
};

const IdFilter = new GraphQLObjectType({
  name: 'IDFilter',
  fields: {
    equality: {
      type: new GraphQLUnionType({
        name: 'IDEquality',
        types: [
          new GraphQLObjectType({
            name: 'IDEq',
            fields: { eq: { type: new GraphQLNonNull(GraphQLID) } },
          }),
          new GraphQLObjectType({
            name: 'IDNe',
            fields: { ne: { type: new GraphQLNonNull(GraphQLID) } },
          }),
        ],
      }),
    },
  },
});
const BooleanFilter = new GraphQLObjectType({
  name: 'BooleanFilter',
  fields: {
    equality: {
      type: new GraphQLUnionType({
        name: 'BooleanEquality',
        types: [
          new GraphQLObjectType({
            name: 'BooleanEq',
            fields: { eq: { type: new GraphQLNonNull(GraphQLBoolean) } },
          }),
          new GraphQLObjectType({
            name: 'BooleanNe',
            fields: { ne: { type: new GraphQLNonNull(GraphQLBoolean) } },
          }),
        ],
      }),
    },
  },
});
const getEqualityFilter = (type: 'String' | 'Int' | 'Float') => {
  const scalar = new GraphQLNonNull(
    type === 'String'
      ? GraphQLString
      : type === 'Int'
      ? GraphQLInt
      : GraphQLFloat,
  );
  return new GraphQLUnionType({
    name: `${type}Equality`,
    types: [
      new GraphQLObjectType({
        name: `${type}Eq`,
        fields: { eq: { type: scalar } },
      }),
      new GraphQLObjectType({
        name: `${type}Ne`,
        fields: { ne: { type: scalar } },
      }),
      new GraphQLObjectType({
        name: `${type}Le`,
        fields: { le: { type: scalar } },
      }),
      new GraphQLObjectType({
        name: `${type}Lt`,
        fields: { lt: { type: scalar } },
      }),
      new GraphQLObjectType({
        name: `${type}Ge`,
        fields: { ge: { type: scalar } },
      }),
      new GraphQLObjectType({
        name: `${type}Gt`,
        fields: { gt: { type: scalar } },
      }),
      new GraphQLObjectType({
        name: `${type}LeGe`,
        fields: { le: { type: scalar }, ge: { type: scalar } },
      }),
      new GraphQLObjectType({
        name: `${type}LeGt`,
        fields: { le: { type: scalar }, gt: { type: scalar } },
      }),
      new GraphQLObjectType({
        name: `${type}LtGe`,
        fields: { lt: { type: scalar }, ge: { type: scalar } },
      }),
      new GraphQLObjectType({
        name: `${type}LtGt`,
        fields: { lt: { type: scalar }, gt: { type: scalar } },
      }),
    ],
  });
};

const IntFilter = new GraphQLObjectType({
  name: 'IntFilter',
  fields: {
    equality: { type: getEqualityFilter('Int') },
  },
});
const FloatFilter = new GraphQLObjectType({
  name: 'FloatFilter',
  fields: {
    equality: { type: getEqualityFilter('Float') },
  },
});
const StringFilter = new GraphQLObjectType({
  name: 'StringFilter',
  fields: {
    equality: { type: getEqualityFilter('String') },
    contains: { type: GraphQLString },
    notContains: { type: GraphQLString },
    beginsWith: { type: GraphQLString },
  },
});
export const scalars = [
  [GraphQLID, IdFilter],
  [GraphQLBoolean, BooleanFilter],
  [GraphQLInt, IntFilter],
  [GraphQLFloat, FloatFilter],
  [GraphQLString, StringFilter],
] as const;
export const getFilterType = (typeName: string) => (
  fieldConfigPairs: FieldConfigPairs,
): GraphQLInputType => {
  return (new GraphQLObjectType({
    name: `${typeName}Filter`,
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
      .filter((pair): pair is [string, GraphQLObjectType] => {
        return typeof pair[1] !== 'undefined';
      })
      .reduce(
        (map, [key, filter]) => ({ ...map, [key]: { type: filter } }),
        {} as GraphQLFieldConfigMap<unknown, unknown>,
      ),
  }) as unknown) as GraphQLInputType;
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
  return (new GraphQLObjectType({
    name: `${typeName}Sort`,
    fields: fieldConfigPairs.reduce(
      (fields, [key]) => ({
        ...fields,
        [key]: {
          type: SortDirection,
        },
      }),
      {} as GraphQLFieldConfigMap<unknown, unknown>,
    ),
  }) as unknown) as GraphQLInputType;
};
