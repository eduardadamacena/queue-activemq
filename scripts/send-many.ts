// Uso: npm run send-many          (10 tarefas)
//      npm run send-many -- 50    (50 tarefas)
const API_URL = process.env.API_URL ?? "http://localhost:3000/tasks";
const total = Number(process.argv[2] ?? 10);

async function main() {
  const results = await Promise.all(
    Array.from({ length: total }, async (_, i) => {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Task ${i + 1}` }),
      });
      return res.json();
    })
  );
  console.log(`${results.length} tarefas enviadas.`);
}

main().catch((err) => {
  console.error("Falha ao enviar (a API está no ar?)", err.message);
  process.exit(1);
});
