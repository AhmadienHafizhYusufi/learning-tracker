// Isi database dengan contoh data. Jalankan: npm run db:seed
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { asc } from "drizzle-orm";
import { resources, studySessions, topics, users } from "./schema.ts";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

const TZ = process.env.APP_TIMEZONE ?? "Asia/Jakarta";

function daysAgo(n: number) {
  const d = new Date(Date.now() - n * 86_400_000);
  return d.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
}

// Contoh data dimasukkan ke user pertama (biasanya akunmu setelah login sekali).
// Kalau belum ada user sama sekali, dibuat user "demo".
let [owner] = await db.select({ id: users.id, login: users.login }).from(users).orderBy(asc(users.id)).limit(1);
if (!owner) {
  [owner] = await db
    .insert(users)
    .values({ githubId: "demo", login: "demo", name: "Demo" })
    .returning({ id: users.id, login: users.login });
}
const userId = owner.id;
console.log(`Seed untuk user: ${owner.login}`);

const inserted = await db
  .insert(topics)
  .values([
    { userId, title: "JavaScript Foundations", category: "JavaScript", status: "done", completedAt: new Date(), description: "Variables, functions, scope & closures, this." },
    { userId, title: "ES6+ Syntax", category: "JavaScript", status: "in_progress", description: "Destructuring, spread, modules, classes." },
    { userId, title: "Node.js Event Loop", category: "Backend", status: "in_progress" },
    { userId, title: "PostgreSQL Basics", category: "Backend", status: "todo" },
  ])
  .returning({ id: topics.id });

const [js, es6, node] = inserted.map((t) => t.id);

const sessions = await db
  .insert(studySessions)
  .values([
    { userId, topicId: js, title: "Closures", date: daysAgo(6), durationMinutes: 90, note: "<p>Closures &amp; shopping cart mini project</p>" },
    { userId, topicId: es6, title: "Destructuring", date: daysAgo(3), durationMinutes: 45, note: "<p>Mengambil nilai dari object/array langsung ke variabel.</p><pre><code class=\"language-javascript\">const { name, age = 20 } = user;\nconst [first, ...rest] = items;</code></pre>" },
    { userId, topicId: es6, title: "Spread & rest", date: daysAgo(2), durationMinutes: 60, note: "<ul><li><p><strong>Spread</strong> memecah array/object</p></li><li><p><strong>Rest</strong> mengumpulkan sisa argumen</p></li></ul>" },
    { userId, topicId: node, title: "Event loop phases", date: daysAgo(1), durationMinutes: 50, note: "<p>Microtask (<code>Promise.then</code>) selalu dijalankan sebelum macrotask (<code>setTimeout</code>).</p>" },
    { userId, topicId: es6, title: "ES modules", date: daysAgo(0), durationMinutes: 30, note: "<p>ES modules</p>" },
  ])
  .returning({ id: studySessions.id });

await db.insert(resources).values([
  { userId, topicId: es6, sessionId: sessions[1].id, title: "MDN — Destructuring assignment", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment", type: "docs", done: true },
  { userId, topicId: node, sessionId: sessions[3].id, title: "Node.js docs — The event loop", url: "https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick", type: "docs" },
]);

console.log("Seed selesai ✔");
await client.end();
