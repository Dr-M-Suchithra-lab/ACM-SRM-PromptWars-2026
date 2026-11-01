import "dotenv/config";
import express from "express";
import path from "node:path";
import { createApp } from "./app.js";
const app = createApp();
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve("dist"), { index: false, maxAge: "1h" }));
  app.get("/{*path}", (req, res) => {
    if (req.path.startsWith("/api/"))
      return res.status(404).json({ error: "Not found" });
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.resolve("dist/index.html"));
  });
}
app.listen(Number(process.env.PORT || 8080), "0.0.0.0", () =>
  console.log(`NYAVERIS AI listening on port ${process.env.PORT || 8080}`),
);
