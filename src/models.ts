import { GraphQLFieldConfig } from 'graphql';

export type FieldConfigPairs = ReadonlyArray<
  [string, GraphQLFieldConfig<unknown, unknown>]
>;
