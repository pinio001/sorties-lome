import http from "http";
import https from "https";

http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const body = [];
  req.on("data", chunk => body.push(chunk));
  req.on("end", () => {
    const proxy = https.request({
      hostname: "api.anthropic.com",
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: "api.anthropic.com" },
    }, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });
    proxy.write(Buffer.concat(body));
    proxy.end();
  });
}).listen(3001, () => console.log("Proxy Anthropic → http://localhost:3001"));