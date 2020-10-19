import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  isEqualType,
} from 'graphql';

export const isIdField = (config: GraphQLFieldConfig<unknown, unknown>) =>
  isEqualType(new GraphQLNonNull(GraphQLID), config.type);
