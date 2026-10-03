import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { sendTask } from "../messaging/producer";
import { Task } from "../shared/types";

const PORT = 3000;

const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/tasks") {
    res.writeHead(404).end();
    return;
  }

  // Lê o body
  let raw = "";
  for await (const chunk of req) raw += chunk;

  let name: unknown;
  try {
    name = JSON.parse(raw).name;
  } catch {
    // body inválido
  }
  if (typeof name !== "string" || name === "") {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: 'envie {"name": "..."}' }));
    return;
  }

  // 1. gera o ID  2. monta a mensagem  3. envia ao ActiveMQ
  const task: Task = {
    id: randomUUID().slice(0, 8),
    type: "PROCESS_TASK",
    payload: { name },
  };

  try {
    await sendTask(task);
    console.log(`[API] task ${task.id} enviada para a fila`);
    // 4. responde
    res.writeHead(202, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ id: task.id, status: "queued" }));
  } catch (err) {
    console.error("[API] erro ao enviar:", err);
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "broker indisponível" }));
  }
});

server.listen(PORT, () => console.log(`[API] ouvindo em http://localhost:${PORT}`));
