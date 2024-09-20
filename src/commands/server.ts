import express, { Request, Response } from "express";
import { resolve } from "path";
import { createServer } from "vite";
import edge from "../utils/edge.js";
import errorPage from "../utils/errorPage.js";
import inject from "../utils/inject.js";
import parseTemplate from "../utils/parse-template.js";

export default async function server(port: number = 3000) {
  const app = express();

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  edge.boot();
  edge.get().mount(resolve("./src"));
  edge.get().global("errorPage", errorPage);
  edge.get().global("inject", inject(resolve("./src", "inject.ts"), true)());

  const render = (path: string, req: Request, res: Response) => {
    res.sendFile = () => {};
    return edge.get().render(path, {
      req,
      res,
    });
  };

  vite.watcher.on("all", (_ev, path) => {
    if (
      path.endsWith(".edge") ||
      path.endsWith(".ts") ||
      path.endsWith(".tsx")
    ) {
      vite.ws.send({ type: "full-reload" });
    }

    edge.get().global("inject", inject(resolve("./src", "inject.ts"), true)());
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

  app.listen({ port }, () => {
    console.log(`Laman.js development server is running on ` + port);
  });
}
