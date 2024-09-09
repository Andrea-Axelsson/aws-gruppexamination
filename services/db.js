// Importera hela paketet som en default import
import dynamodb from 'aws-sdk/clients/dynamodb.js';

// Destructure för att få ut DocumentClient
const { DocumentClient } = dynamodb;

const db = new DocumentClient({
  region: process.env.AWS_REGION,
});

export { db };