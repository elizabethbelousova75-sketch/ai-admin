const MAX_TOKEN = "f9LHodD0cOIffzIlNDJxINGuPXicU6cUPhtQyAzN9jA862gZUeAiJcNVneBk6wjfIovozGkDhB__cSFghFUe";
const WEBHOOK_URL = "https://bfl-ai-admin.vercel.app/api/max/webhook";

async function main() {
  const res = await fetch("https://platform-api.max.ru/subscriptions", {
    method: "POST",
    headers: {
      Authorization: MAX_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      update_types: ["message_created", "message_callback", "bot_started"],
    }),
  });

  const data = await res.json();
  console.log("Статус:", res.status);
  console.log("Ответ:", data);
}

main();