import express from "express";
import { resolve } from "path";
import { createServer } from "vite";
import edge from "../utils/edge.js";
import parseTemplate from "../utils/parse-template.js";
import inject from "../utils/inject.js";
import errorPage from "../utils/errorPage.js";
import { existsSync } from "fs";

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

  vite.watcher.on("all", (_ev, path) => {
    if (path.endsWith(".edge")) {
      vite.ws.send({ type: "full-reload" });
    }
  });

  app.use(vite.middlewares);

  app.use(
    express.static(resolve("public"), {
      index: false,
    })
  );

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
        html = await edge.get().render(template.path, {
          req,
          setHeader: (...params: Parameters<typeof res.header>) => {
            res.header(...params);
            return "";
          },
        });
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
            setHeader: (...params: Parameters<typeof res.header>) => {
              res.header(...params);
              return "";
            },
          });
        }
      }
    } else {
      res.status(404);
    }

    if (html && res.getHeader("Content-Type") === "text/html") {
      html = await vite.transformIndexHtml("", html);
    }

    return res.send(html);
  });

  app.listen({ port }, () => {
    console.log(`Laman.js development server is running on ` + port);
  });
}
