import { createClient } from 'redis';
import dotenv from "dotenv";
dotenv.config();

const client = createClient({ url: process.env.REDIS_URL });

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();
console.log('redis client connected successfuly');

export default client