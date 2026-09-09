with open("server.ts", "r") as f:
    code = f.read()

route = """
  // Server-side proxy for fetching URLs (to bypass CORS)
  app.get("/api/fetch-url", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).send("URL parameter is required");
      }
      const response = await fetch(targetUrl);
      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch: ${response.statusText}`);
      }
      const text = await response.text();
      res.send(text);
    } catch (e: any) {
      res.status(500).send(e.message || "Failed to fetch URL");
    }
  });

  app.get("/api/download-asset/:filename", (req, res) => {
"""

code = code.replace('  app.get("/api/download-asset/:filename", (req, res) => {', route)

with open("server.ts", "w") as f:
    f.write(code)
