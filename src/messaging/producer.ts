import { connect, EventContext } from "rhea";
import { QUEUE, Task, brokerOptions } from "../shared/types";

// 1) CONECTA no broker
const connection = connect(brokerOptions);

// 2) CRIA o producer (sender) apontando para a fila
const sender = connection.open_sender(QUEUE);

// Promessa que resolve quando o sender está pronto para uso
const ready = new Promise<void>((resolve) => sender.once("sender_open", () => resolve()));

// Guardamos quem está esperando a confirmação do broker (por id da entrega)
const pending = new Map<number, { resolve: () => void; reject: (e: Error) => void }>();

sender.on("accepted", (ctx: EventContext) => {
  pending.get(ctx.delivery!.id)?.resolve(); // broker confirmou que guardou a mensagem
  pending.delete(ctx.delivery!.id);
});
sender.on("rejected", (ctx: EventContext) => {
  pending.get(ctx.delivery!.id)?.reject(new Error("broker rejeitou a mensagem"));
  pending.delete(ctx.delivery!.id);
});

connection.on("connection_error", (ctx: EventContext) => {
  console.error("[Producer] erro de conexão:", ctx.connection.error);
});

// 3) ENVIA a mensagem
export async function sendTask(task: Task): Promise<void> {
  await ready;

  // Só envia quando o broker nos deu "crédito" (permissão para enviar)
  if (!sender.sendable()) {
    await new Promise<void>((resolve) => sender.once("sendable", () => resolve()));
  }

  const delivery = sender.send({
    body: JSON.stringify(task),
    durable: true, // mensagem persistente: sobrevive a restart do broker
  });

  // Espera o broker confirmar o recebimento
  await new Promise<void>((resolve, reject) => {
    pending.set(delivery.id, { resolve, reject });
  });
}
