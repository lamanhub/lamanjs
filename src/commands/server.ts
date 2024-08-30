import express from "express";
import { resolve } from "path";
import edge from "../utils/edge.js";
import parseTemplate from "../utils/parse-template.js";
import { createServer } from "vite";

export default async function server(port: number = 3000) {
  const app = express();

  edge.boot();
  edge.get().mount(resolve("./src"));

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
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
        html = await edge.get().render(template.path, { req });
      } catch (err) {
        console.log(err);
        const statusCode = isNaN(Number((err as Error).message))
          ? 500
          : Number((err as Error).message);
        const errorPage = parseTemplate(`${statusCode}` || "500", "./src");

        if (errorPage) {
          html = await edge
            .get()
            .render(errorPage.path, { params: errorPage.params, req });
        }

        res.status(statusCode);
      }
    } else {
      res.status(404);
    }

    if (html) {
      html = await vite.transformIndexHtml("", html);
    }

    return res.type("html").send(html);
  });

  app.listen({ port }, () => {
    console.log(`Laman.js development server is running on ` + port);
  });
}
