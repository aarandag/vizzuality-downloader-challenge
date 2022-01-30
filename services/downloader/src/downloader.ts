import * as http from "http";
import { IncomingMessage } from "http";
import { Pool } from "pg";
import PgBoss, { Job } from "pg-boss";
import { from as copyFrom } from "pg-copy-streams";

function getFields(chunk: Buffer, separator = ","): Array<string> {
  /*
   * Takes a chunk of binary data, transforms it to a string, and returns an array of strings
   * containing the fields found in the first line.
   * Used to extract the names of the headers in the CSV file.
   */
  return chunk.toString().split("\n")[0].trim().split(separator);
}

function readFirstChunk(
  url: string,
  nBytes = 1000,
  callback: (buffer: Buffer) => void
): Promise<void> {
  /*
   * Sends a GET request to the specified URL and gets only the first nBytes from the response.
   * Used to read the headers.
   */
  const request = http.get(url, async (res: IncomingMessage) => {
    function getChunk() {
      const data = res.read(nBytes);
      callback(data);
      // Once the first chunk is read, finish the stream
      res.destroy();
    }

    res.on("readable", getChunk);
  });

  return new Promise((resolve, reject) => {
    request.on("error", reject);
    request.on("end", () => resolve());
  });
}

async function downloadAndSave(
  fileUrl: string,
  tableName: string
): Promise<void> {
  /*
   * Downloads a CSV file from fileUrl, creates a table with tableName in the database,
   * with columns matching the header names with the 'text' datatype, and writes the CSV
   * to Postgres in streaming.
   */
  await readFirstChunk(fileUrl, 1000, (chunk) => {
    // Get headers
    const headerFields = getFields(chunk);

    /* Start a stream from a http GET request to fileUrl
       Then, initialize a connection to the database. Create a table with a schema based on headerFields, and then
       write to this table in streaming using the COPY command
     */
    const response = http.get(fileUrl, async (res: IncomingMessage) => {
      const client = await dbPool.connect();
      const fieldsDDL: string = headerFields
        .map((field) => `${field} text`)
        .join(", ");
      const createTableQuery = `CREATE TABLE IF NOT EXISTS TEST2 (${fieldsDDL})`;
      console.log("Executing create table query: " + createTableQuery);
      await client.query(createTableQuery);

      const copyQuery = `COPY TEST2 FROM stdin WITH (format csv, HEADER true)`;
      console.log("Executing copy table query: " + copyQuery);
      const dbStream = await client.query(copyFrom(copyQuery));
      res.on("error", client.release);
      res.on("error", client.release);
      res.on("finish", client.release);
      res.pipe(dbStream);
    });
    response.on("error", (err) => {
      console.error(err);
      throw err;
    });
  });
}

async function jobHandler(job: Job) {
  /* Handler for each job that is received via pgBoss */
  console.log("Received job: " + job.id);
  const jobData: { fileUrl?: string } = job.data;
  const fileUrl: string = jobData.fileUrl!;
  try {
    await downloadAndSave(fileUrl, job.id);
    await boss.complete(job.id);
  } catch {
    await boss.fail(job.id);
  }
}

function createBoss(): PgBoss {
  const pgBossHost = process.env.PGBOSSHOST || "localhost";
  console.log("Connecting to pgBoss at " + pgBossHost);
  const pgBossPort = process.env.PGBOSSPORT || "5432";
  const pgBossUser = process.env.PGBOSSUSER || "pgboss";
  const pgBossPassword = process.env.PGBOSSPASSWORD || "pgboss";
  const pgBossDatabase = process.env.PGBOSSDATABASE || "db_pgboss";
  return new PgBoss(
    `postgres://${pgBossUser}:${pgBossPassword}@${pgBossHost}:${pgBossPort}/${pgBossDatabase}`
  );
}

async function main() {
  await boss.start();
  console.log("Starting working");
  await boss.work("download_file", jobHandler);
}

const dbPool = new Pool({
  user: process.env.DBUSER || "postgres",
  host: process.env.DBHOST || "localhost",
  password: process.env.DBPASSWORD || "postgres",
});

console.log("DBHOST: " + (process.env.DBHOST || "localhost"));
const boss: PgBoss = createBoss();

main();
