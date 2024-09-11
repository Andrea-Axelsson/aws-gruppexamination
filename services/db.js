import dynamodb from 'aws-sdk/clients/dynamodb.js';

const { DocumentClient } = dynamodb;

const db = new DocumentClient({
  region: process.env.AWS_REGION,
});

export { db };