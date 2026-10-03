# queue-lab

Projeto mínimo para estudar **ActiveMQ**: Producer, Consumer, Queue, ACK e vários workers
consumindo a mesma fila. Sem banco, sem frontend, sem frameworks.

## Arquitetura

```text
Client (curl / send-many)
  ↓  POST /tasks
API  (producer)
  ↓
ActiveMQ Queue  "tasks.queue"
  ↓
Worker 1 / Worker 2 / Worker 3  (consumers)
```

Onde olhar no código:

| O quê | Arquivo |
|---|---|
| conectar, criar producer, enviar | `src/messaging/producer.ts` |
| conectar, criar consumer, receber, ACK | `src/messaging/consumer.ts` |
| processamento (3s de espera) | `src/worker/worker.ts` |
| endpoint HTTP | `src/api/server.ts` |

Usa AMQP 1.0 (porta 5672) via biblioteca `rhea`.

## Executar

```bash
docker compose up --build
```

Console do ActiveMQ: http://localhost:8161 (admin / admin) → aba **Queues**.

## Enviar uma tarefa

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"name":"Task 1"}'
# {"id":"3f9a1c2b","status":"queued"}
```

## Enviar várias tarefas

Precisa de `npm install` na sua máquina (uma vez):

```bash
npm run send-many          # 10 tarefas
npm run send-many -- 50    # 50 tarefas
```

## Vários workers

Com Docker:

```bash
docker compose up --build --scale worker=3
```

Ou sem Docker nos apps (só o broker em container), um terminal por processo:

```bash
docker compose up -d activemq
npm run api
WORKER_ID=1 npm run worker
WORKER_ID=2 npm run worker
WORKER_ID=3 npm run worker
```

## O que observar

Rode 3 workers e `npm run send-many`:

```text
[Worker-1] Processing "Task 1"...
[Worker-2] Processing "Task 2"...
[Worker-3] Processing "Task 3"...
[Worker-2] Finished task ...
[Worker-2] Received task ...   <- quem termina primeiro pega a próxima
```

- As mensagens entram na Queue (veja *Enqueued* no console).
- **Cada mensagem vai para um único worker.** Nenhuma tarefa aparece em dois workers.
- Os workers trabalham em paralelo: 3 workers × 3s ≈ 3 tarefas a cada 3s.
- O **ACK** (`delivery.accept()`) só acontece depois do processamento. É ele que faz o
  broker apagar a mensagem (*Dequeued* sobe no console).
- Por que a distribuição é justa? Cada worker pede só 1 mensagem por vez
  (`add_credit(1)`, equivalente ao *prefetch = 1*). Experimente trocar para 10
  em `consumer.ts` e veja um worker pegando quase tudo.

## Teste: worker que morre antes do ACK

1. Suba só o broker e a API, e um worker que "quebra" na tarefa chamada `crash`:

```bash
docker compose up -d activemq api
docker compose run --rm -e CRASH_ON_TASK=crash worker
```

2. Em outro terminal:

```bash
curl -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{"name":"crash"}'
```

3. O worker imprime `💥 Crash antes do ACK!` e morre. No console do ActiveMQ a
   mensagem continua na fila (*Dequeued* = 0): sem ACK, ela não foi perdida.

4. Suba um worker normal:

```bash
docker compose up worker
```

Ele recebe a mesma tarefa `crash`, processa e dá o ACK. (Sem retry, DLQ ou política
de falhas: é só para ver o comportamento básico.)
