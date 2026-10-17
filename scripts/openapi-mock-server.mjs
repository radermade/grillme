import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const spec = JSON.parse(await readFile(new URL("../openapi.json", import.meta.url), "utf8"));
const port = Number(process.env.PORT ?? 4010);
const dereference = (value) => value?.$ref?.startsWith("#/")
  ? value.$ref.slice(2).split("/").reduce((current, key) => current?.[key], spec)
  : value;
const exampleFromSchema = (input) => {
  const schema = dereference(input);
  if (!schema) return null;
  if (schema.example !== undefined) return schema.example;
  const branch = schema.oneOf?.[0] ?? schema.allOf?.[0];
  if (branch) return exampleFromSchema(branch);
  if (schema.type === "array") return [exampleFromSchema(schema.items)];
  if (schema.type === "object" || schema.properties) return Object.fromEntries(Object.entries(schema.properties ?? {}).map(([key, value]) => [key, exampleFromSchema(value)]));
  if (schema.const !== undefined) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (schema.type === "integer" || schema.type === "number") return schema.minimum ?? 0;
  if (schema.type === "boolean") return false;
  return "example";
};
const routeFor = (method, pathname) => {
  const item = spec.paths[pathname];
  return item?.[method.toLowerCase()] ?? null;
};
createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const operation = routeFor(request.method ?? "GET", url.pathname);
  if (!operation) { response.writeHead(404, { "content-type": "application/json" }); response.end(JSON.stringify({ error: "NOT_FOUND" })); return; }
  if (operation.operationId === "authorizeBrowserSession") {
    const returnTo = new URL(url.searchParams.get("returnTo") ?? "http://localhost:5173/", "http://localhost:5173");
    returnTo.searchParams.set("code", "opaque-browser-authorization-code-placeholder");
    returnTo.searchParams.set("state", "opaque-browser-state-placeholder");
    response.writeHead(302, { location: returnTo.toString(), "cache-control": "no-store" });
    response.end();
    return;
  }
  if (request.method !== "GET") for await (const _ of request) { /* Drain request body. */ }
  const successEntry = Object.entries(operation.responses).find(([status]) => status.startsWith("2"));
  if (!successEntry) { response.writeHead(503, { "content-type": "application/json" }); response.end(JSON.stringify({ error: "MOCK_EXAMPLE_MISSING" })); return; }
  const [statusText, raw] = successEntry;
  const status = Number(statusText);
  const definition = dereference(raw);
  const media = definition?.content?.["application/json"];
  const body = media?.example ?? exampleFromSchema(media?.schema);
  const headers = { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true", "cache-control": "no-store" };
  if (status === 204 || body === null || body === undefined) { response.writeHead(status, headers); response.end(); return; }
  response.writeHead(status, { ...headers, "content-type": "application/json" });
  response.end(JSON.stringify(body));
}).listen(port, "127.0.0.1", () => console.log(`OpenAPI example mock listening on http://127.0.0.1:${port}`));
