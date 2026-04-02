import fs from 'fs';

function parseEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  });
  return env;
}

const env = parseEnv('./backend/.env');
const PROJECT_ID = env.APPWRITE_PROJECT_ID || env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = env.APPWRITE_API_KEY || env.VITE_APPWRITE_API_KEY;
const ENDPOINT = env.APPWRITE_ENDPOINT || env.VITE_APPWRITE_ENDPOINT;
const DATABASE_ID = env.APPWRITE_DATABASE_ID || env.VITE_APPWRITE_DATABASE_ID;

async function check() {
  console.log("Fetching collections...");
  const options = {
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': PROJECT_ID,
      'X-Appwrite-Key': API_KEY,
    },
  };
  const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/mobile_notifications`, options);
  if (res.ok) {
    console.log("mobile_notifications is found!");
    const j = await res.json();
    console.log("Attributes count:", j.attributes ? j.attributes.length : 0);
  } else {
    console.log("mobile_notifications NOT FOUND");
    console.log(await res.text());
  }
}

check();
