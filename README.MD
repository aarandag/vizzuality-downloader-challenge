# Downloader challenge submission

This submission to the `downloader` challenge decouples the logic in two modules. The first one is an API that receives job creation, cancel and status query requests. It submits new jobs to a task queue that is managed with the `pg-boss` library, and interacts with it to query their status or cancel them. The second one implements the code that is executed in the workers. 

- `interfaces/api/`: Contains an API REST written in Express that is in charge of receiving job creation, cancel and status query requests, and that interacts with `pg-boss`.
- `services/worker/`: Contains the code that the `workers` will execute in order to process jobs, downloading the indicated CSVs and writing them to the database.

## Rationale
This approach allows us to scale the workers horizontally, allowing us to download many files in parallel in a performant manner. The files are downloaded and written to the database in streaming, which results in a fast processing and low memory requirements. The schema of the table is created based on the headers of the CSV file, and all columns are created with the `text` datatype. The goal of the chosen architecture is to be **performant** and **scalable** using minimal resources.
## Setup
Both docker and docker-compose need to be present in your system in order to run the application.
Once you have them insalled, just run the following command:

    docker-compose -f docker-compose.yml up

## Services
`docker-compose` creates three containers: 
- `db`: Contains the PostgreSQL instance that is in charge of the persistance of the downloaded files and handles the `pg-boss` task queue.
- `api`: Contains the interface to handle the job lifecycle.
- `downloader`: Contains the job processing logic. Can be horizontally scaled.
## How to use
The development API server listens for requests on port 3000, by default.

In order to ease the testing of the application, a `fileserver` service is included in the `docker-compose` file. This service serves the files that are located under the `fileserver/files_to_serve` directory on port 8000.

Once all services are up, we can test the API with the `curl` command:

### Create a new job:


    curl -d "fileUrl=http://localhost:8000/tripsdata.csv" -X POST localhost:3000/download_file

This request returns the identifier of the created job; for example:
    
    {"jobId": "5d8f8f8f-5d8f-5d8f-5d8f-5d8f8f8f8f8f"}

Then, the `tripsdata.csv` file will be downloaded and saved in a table in the PostgreSQL instance, whose name consists on the filename concatenated to the current timestamp in epoch format (for example, ```tripsdata_1589788983```).

### Get the status of a job:

    curl -X GET "http://localhost:3000/job_status?jobId=5d8f8f8f-5d8f-5d8f-5d8f-5d8f8f8f8f8f"

If queried with a correct jobId, this endpoint returns the status of the job, which can be any of the states managed by [pg-boss](https://github.com/timgit/pg-boss/blob/master/docs/readme.md#job-states).

### Cancel a job:

    curl -X GET "http://localhost:3000/job_cancel?jobId=5d8f8f8f-5d8f-5d8f-5d8f-5d8f8f8f8f8f"