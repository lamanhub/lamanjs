import "dotenv/config";
import express, { Request, Response } from "express";
import * as http from "http";
import { resolve } from "path";
import { ServerHMRConnector, createServer } from "vite";
import { ESModulesRunner, ViteRuntime } from "vite/runtime";
import edge from "../utils/edge.js";
import errorPage from "../utils/errorPage.js";
import inject from "../utils/inject.js";
import parseTemplate from "../utils/parse-template.js";

export default async function server(port: number = 3000) {
  const app = express();
  app.disable("x-powered-by");
  const server = http.createServer(app);
  let injectionUpdate = false;

  const vite = await createServer({
    server: {
      middlewareMode: {
        server,
      },
      proxy: {
        "/ws": {
          target: "ws://localhost:3000",
          ws: true,
        },
      },
    },
    appType: "custom",
  });
  const hmrConnection = new ServerHMRConnector(vite);
  const runtime = new ViteRuntime(
    {
      root: vite.config.root,
      fetchModule: vite.ssrFetchModule,
      hmr: { connection: hmrConnection },
    },
    new ESModulesRunner()
  );

  edge.boot();
  edge.get().mount(resolve("./src"));
  edge.get().global("env", process.env);
  edge.get().global("errorPage", errorPage);
  edge.get().global("inject", await inject(runtime));

  vite.ws.on("connection", async () => {
    if (injectionUpdate) {
      injectionUpdate = false;

      const inject = await vite.moduleGraph.getModuleByUrl("/src/inject.ts");
      if (inject) {
        await vite.reloadModule(inject);
      }
    }
  });

  vite.ws.on("inject:update", () => {
    injectionUpdate = true;
  });

  const render = (path: string, req: Request, res: Response) => {
    res.sendFile = () => {};
    return edge.get().render(path, {
      req,
      res,
    });
  };

  vite.watcher.on("all", async (_ev, path) => {
    if (path.endsWith(".edge")) {
      vite.ws.send({ type: "full-reload" });
    }
  });

  app.use(vite.middlewares);

  app.get("*", async (req, res) => {
    res.header("Content-Type", "text/html");
    const requested = (
      req.params as {
        "0": string;
      }
    )["0"].replace(/^\//, "");

    const template = parseTemplate(requested, "./src");

    let html: string = "";

    if (template) {
      req.params = template.params;

      try {
        html = await render(template.path, req, res);
      } catch (err) {
        console.log(err);
        const statusCode = isNaN(Number((err as Error).message))
          ? 500
          : Number((err as Error).message);
        res.status(statusCode);
        const errorPage = parseTemplate(`${statusCode}` || "500", "./src");

        if (errorPage) {
          html = await edge.get().render(errorPage.path, {
            req,
            res,
          });
        }
      }
    } else {
      res.status(404);
      const errorPage = parseTemplate("404", "./src");

      if (errorPage) {
        html = await edge.get().render(errorPage.path, {
          req,
          res,
        });
      }
    }

    if (html && res.get("Content-Type")?.split(";")[0] === "text/html") {
      html = await vite.transformIndexHtml(req.originalUrl, html);
    }

    return res.send(html);
  });

  server.listen({ port }, () => {
    console.log(`Laman.js development server is running on ` + port);
  });
}
