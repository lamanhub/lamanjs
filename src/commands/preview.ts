import express from "express";
import { existsSync } from "fs";
import { resolve } from "path";
import edge from "../utils/edge.js";
import errorPage from "../utils/errorPage.js";
import inject from "../utils/inject.js";
import parseTemplate from "../utils/parse-template.js";

export default async function preview(port: number = 3000) {
  const app = express();

  edge.boot();
  edge.get().mount(resolve("./dist/src"));
  edge.get().global("errorPage", errorPage);
  edge.get().global("inject", async () => {
    if (!existsSync(resolve("./dist", "inject.js"))) return {};
    const loc = inject(resolve("./dist/inject.js"));
    return await import(loc);
  });

  app.use(
    "/assets",
    express.static(resolve("./dist/assets"), {
      index: false,
    })
  );

  app.use(
    express.static(resolve("./dist/public"), {
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

    const template = parseTemplate(requested, "./dist/src");

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
        const errorPage = parseTemplate(`${statusCode}` || "500", "./dist/src");

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

    return res.send(html);
  });

  app.listen({ port }, () => {
    console.log(`Laman.js server is running on ` + port);
  });
}
