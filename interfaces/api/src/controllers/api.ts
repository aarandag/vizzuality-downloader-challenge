import { Application, Request, Response } from "express";
import PgBoss from "pg-boss";

export const loadApiEndpoints = (app: Application): void => {
  /*
   Endpoint to create a new download job.
   Arguments passed in the body:
   - fileUrl: The URL where the file must be fetched from
   - separator: Field separator character in the CSV
   Returns:
   - jobId: The ID of the created job. Corresponds to the name of the created table in the database
   */
  app.post("/download_file", async (req: Request, res: Response) => {
    console.info("POST /download_file");
    const fileUrl: string = req.body.fileUrl;
    const separator: string = req.body.separator || ",";
    // Builds the table name as the file name to download concatenated to the current timestamp
    const tableName: string =
      fileUrl.split("/")[-1].split(".")[0] + "_" + Date.now();
    if (!fileUrl) {
      return res.status(400).send("Missing fileUrl");
    }
    console.info(`fileUrl: ${fileUrl}, separator: ${separator}`);

    // Write task to pgboss
    const boss: PgBoss = app.get("pgboss");
    await boss.start();
    const queue = "download_file";
    console.info("Writing task to pgboss");
    const jobId = await boss.send(queue, { fileUrl, separator, tableName });

    // Return task id
    console.info("Returning task id: " + jobId);
    return res.status(200).send({ jobId });
  });

  /*
   * Endpoint to query the status of a job.
   * Parameters:
   * - jobId: The ID of the job to query
   */
  app.get("/job_status", async (req: Request, res: Response) => {
    console.info("GET /job_status");
    if (!req.query.jobId) {
      return res.status(400).send({ error: "jobId not specified" });
    }
    const jobId = req.query.jobId as string;
    console.info("jobId: " + jobId);

    const boss: PgBoss = app.get("pgboss");
    await boss.start();
    const job = await boss.getJobById(jobId);
    if (job && job.state) {
      return res.status(200).send({ state: job.state });
    } else {
      return res.status(404);
    }
  });

  /*
   * Endpoint to cancel a job.
   * Parameters:
   * - jobId: The ID of the job to cancel
   */
  app.get("/job_cancel", async (req: Request, res: Response) => {
    console.info("GET /job_cancel");
    if (!req.query.jobId) {
      return res.status(400).send({ error: "jobId not specified" });
    }
    const jobId = req.query.jobId as string;
    console.info("jobId: " + jobId);

    const boss = app.get("pgboss");
    await boss.start();
    await boss.cancel(jobId);
    return res.status(200);
  });
};
