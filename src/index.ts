#! /usr/bin/env node

// import commander from 'commander';
import { codegen } from '@graphql-codegen/core';
import * as typescriptPlugin from '@graphql-codegen/typescript';
import * as fs from 'fs-extra';
import { buildSchema, GraphQLSchema, parse, printSchema } from 'graphql';
import { join } from 'path';

// const { types } = commander
//   .option('-t, --types', 'Path to directory containing graphql types', '.')
//   .option('-s, --schema', 'Output path of generated schema', '.')
//   .parse(process.argv);

const schema: GraphQLSchema = buildSchema(`
  type User {
    name: String!
    age: Int!
  }
`);

const outputFile = 'output.ts';

const options: Parameters<typeof codegen>[0] = {
  config: {},
  documents: [],
  // used by a plugin internally, although the 'typescript' plugin currently
  // returns the string output, rather than writing to a file
  filename: outputFile,
  schema: parse(printSchema(schema)),
  plugins: [
    // Each plugin should be an object
    {
      typescript: {}, // Here you can pass configuration to the plugin
    },
  ],
  pluginMap: {
    typescript: typescriptPlugin,
  },
};

(async () => {
  const output = await codegen(options);

  fs.writeFile(join(__dirname, outputFile), output, () => {
    console.log('Outputs generated!'); // eslint-disable-line no-console
  });
})();
