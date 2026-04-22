import { runDueSchedulerJobs } from "../src/services/scheduler-service.server.ts";

const result = await runDueSchedulerJobs();
console.log(JSON.stringify(result, null, 2));
