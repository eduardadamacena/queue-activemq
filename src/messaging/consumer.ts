import { connect, EventContext } from "rhea";
import { QUEUE, Task, brokerOptions } from "../shared/types";

export function startConsumer(handle: (task: Task) => Promise<void>): void {
  // 1) CONECTA no broker
  const connection = connect(brokerOptions);

  // 2) CRIA o consumer (receiver) na fila
  //    autoaccept: false  -> NÓS decidimos quando dar o ACK
  //    credit_window: 0   -> nós controlamos quantas mensagens o broker pode enviar
  const receiver = connection.open_receiver({
    source: QUEUE,
    autoaccept: false,
    credit_window: 0,
  });

  // Crédito = quantas mensagens podemos ter "em mãos" ao mesmo tempo.
  // Com 1, o worker só recebe a próxima mensagem depois de terminar a atual.
  // É isso que faz as mensagens se distribuírem entre vários workers.
  receiver.on("receiver_open", () => receiver.add_credit(1));

  // 3) RECEBE a mensagem
  receiver.on("message", async (ctx: EventContext) => {
    const delivery = ctx.delivery!;
    const task: Task = JSON.parse(ctx.message!.body as string);

    try {
      // 4) PROCESSA
      await handle(task);

      // 5) ACK: só agora o broker remove a mensagem da fila
      delivery.accept();
    } catch (err) {
      console.error("[Consumer] falhou, devolvendo a mensagem para a fila:", err);
      delivery.release({ delivery_failed: true }); // sem ACK: volta para a fila
    }

    receiver.add_credit(1); // pronto para receber a próxima
  });

  connection.on("connection_error", (ctx: EventContext) => {
    console.error("[Consumer] erro de conexão:", ctx.connection.error);
  });
}
