import * as fs from 'async-file';
import { graphql, introspectionQuery, printSchema } from 'graphql';
import * as path from 'path';
import { schema } from '../src/data/schema';

async function run() {

	const schemaPath = path.resolve(__dirname, '../data/schema.graphql');
	const jsonSchemaPath = path.resolve(__dirname, '../data/gqlschema.json');

	const jsonSchema = await graphql(schema, introspectionQuery);
	await Promise.all([
		fs.writeFile(schemaPath, printSchema(schema), 'utf8'),
		fs.writeFile(jsonSchemaPath, JSON.stringify(jsonSchema.data, null, 4), 'utf8'),
	]);
}

run().catch((err) => {
	// tslint:disable-next-line:no-console
	console.error(err);
	process.exit(1);
});