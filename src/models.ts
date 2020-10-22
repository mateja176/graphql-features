import { GraphQLFieldConfig, GraphQLObjectTypeConfig } from 'graphql';

export type FieldConfigPairs = ReadonlyArray<
  [string, GraphQLFieldConfig<unknown, unknown>]
>;

export type Config = {
  query: GraphQLObjectTypeConfig<unknown, unknown>;
  mutation: GraphQLObjectTypeConfig<unknown, unknown>;
};
