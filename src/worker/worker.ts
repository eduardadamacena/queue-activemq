import { hostname } from "node:os";
import { startConsumer } from "../messaging/consumer";
import { Task } from "../shared/types";

// Identificador do worker: WORKER_ID=1 -> "Worker-1".
// Em container, usa o começo do hostname.
const id = `Worker-${process.env.WORKER_ID ?? hostname().slice(0, 4)}`;

// Para o teste de ACK: se o nome da tarefa for igual a CRASH_ON_TASK,
// o worker morre ANTES de dar o ACK.
const crashOn = process.env.CRASH_ON_TASK;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

startConsumer(async (task: Task) => {
  console.log(`[${id}] Received task ${task.id}`);
  console.log(`[${id}] Processing "${task.payload.name}"...`);

  await sleep(3000); // trabalho "pesado" simulado

  if (crashOn && task.payload.name === crashOn) {
    console.log(`[${id}] Crash antes do ACK!`);
    process.exit(1);
  }

  console.log(`[${id}] Finished task ${task.id}`);
});

console.log(`[${id}] aguardando tarefas...`);
