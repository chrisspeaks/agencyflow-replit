import express from "express";
import cors from "cors";
import { createServer } from "http";
import routes from "./routes.ts";
import { setupVite, serveStatic } from "./vite.ts";

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(routes);

const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  await serveStatic(app);
} else {
  await setupVite(app, server);
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
