const MAX_TOKEN = "ff9LHodD0cOIffzIlNDJxINGuPXicU6cUPhtQyAzN9jA862gZUeAiJcNVneBk6wjfIovozGkDhB__cSFghFUe";

async function main() {
  const res = await fetch("https://platform-api.max.ru/subscriptions", {
    headers: { Authorization: MAX_TOKEN },
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main();