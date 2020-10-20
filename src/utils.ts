import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
  isEqualType,
} from 'graphql';

const idFilter = `type IDFilter = {
  equality: { eq: ID! } | { ne: ID! }
}`;
const booleanFilter = `type BooleanFilter = {
  equality: { eq: Boolean! } | { ne: Boolean! }
}`;
const getEqualityFilter = (type: 'String' | 'Int' | 'Float' | string) =>
  `{ eq: ${type}! } | { ne: ${type}! } | { le: ${type}! } | { lt: ${type}! } | { ge: ${type}! } | { gt: ${type}! } | { le: ${type}! ge: ${type}! } | { le: ${type}! gt: ${type}! } | { lt: ${type}! ge: ${type}! } | { lt: ${type}! gt: ${type}! } `;
const intFilter = `type IntFilter = {
  equality: ${getEqualityFilter('Int')}
}`;
const floatFilter = `type FloatFilter = {
  equality: ${getEqualityFilter('Float')}
}`;
const stringFilter = `type StringFilter = {
  equality: ${getEqualityFilter('String')}
  contains: String!
  notContains: String!
  beginsWith: String!
}`;
const scalars = [
  [GraphQLID, IDFilter],
  [GraphQLBoolean, BooleanFilter],
  [GraphQLInt, intFilter],
  [GraphQLFloat, floatFilter],
  [GraphQLString, stringFilter],
] as const;
export const getFilterType = (typeName: string) => (
  fieldConfigPairs: Array<[string, GraphQLFieldConfig<unknown, unknown>]>,
): [string, string] => {
  const filterName = `${typeName}Filter`;

  return [
    filterName,
    `type ${filterName} {
  ${fieldConfigPairs
    .map(([key, config]) => {
      const filter = scalars.find(([scalar]) =>
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

export const isIdField = (
  config: GraphQLFieldConfig<unknown, unknown>,
): boolean => isEqualType(new GraphQLNonNull(GraphQLID), config.type);
