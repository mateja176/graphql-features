import {
  getNullableType,
  GraphQLID,
  GraphQLInputFieldConfigMap,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  isNullableType,
  isScalarType,
} from 'graphql';
import { getFieldConfigPairs, getIdName } from './utils';

const getWhereUniqueInput = (type: GraphQLObjectType) => {
  return new GraphQLInputObjectType({
    name: `${type.name}WhereUniqueInput`,
    fields: { [getIdName(type)]: { type: new GraphQLNonNull(GraphQLID) } },
  });
};

const getSelectInput = (type: GraphQLObjectType) => {
  const pairs = getFieldConfigPairs(type).map(([key, config]) => [
    key,
    config.type,
  ]);

  return new GraphQLInputObjectType({
    name: `${type.name}Select`,
    fields: {
      ...pairs
        .filter((pair): pair is [string, GraphQLScalarType] =>
          isScalarType(pair[1]),
        )
        .reduce(
          (configMap, [key, scalar]) => ({
            ...configMap,
            [key]: {
              type: isNullableType(scalar)
                ? scalar
                : getNullableType<GraphQLScalarType>(scalar),
            },
          }),
          {} as GraphQLInputFieldConfigMap,
        ),
    },
  });
};

export const getFindOneArgs = (
  type: GraphQLObjectType,
): GraphQLInputObjectType => {
  return new GraphQLInputObjectType({
    name: `FindOne${type.name}Args`,
    fields: {
      where: { type: getWhereUniqueInput(type) },
      select: { type: getSelectInput(type) },
    },
  });
};
