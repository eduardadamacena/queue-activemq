// Formato da mensagem que trafega pela fila.
export interface Task {
  id: string;
  type: "PROCESS_TASK";
  payload: {
    name: string;
  };
}

// Nome da fila. O ActiveMQ cria a fila automaticamente
// na primeira vez que alguém se conecta a esse endereço.
export const QUEUE = "tasks.queue";

// Onde está o broker (AMQP, porta 5672).
export const brokerOptions = {
  host: process.env.BROKER_HOST ?? "localhost",
  port: Number(process.env.BROKER_PORT ?? 5672),
  username: process.env.BROKER_USER ?? "admin",
  password: process.env.BROKER_PASS ?? "admin",
};
