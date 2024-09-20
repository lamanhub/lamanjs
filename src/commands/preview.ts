import express, { Request, Response } from "express";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import edge from "../utils/edge.js";
import errorPage from "../utils/errorPage.js";
import inject from "../utils/inject.js";
import parseTemplate from "../utils/parse-template.js";
import { Script, createContext } from "vm";

export default async function preview(port: number = 3000) {
  const currentGlobal = global;
  const app = express();

  edge.boot();
  edge.get().mount(resolve("./dist/src"));
  edge.get().global("errorPage", errorPage);
  edge.get().global("inject", inject(resolve("./dist", "inject.js"))());

  const render = (path: string, req: Request, res: Response) => {
    res.sendFile = () => {};
    return edge.get().render(path, {
      req,
      res,
    });
  };

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
        html = await render(template.path, req, res);
      } catch (err) {
        console.log(err);
        const statusCode = isNaN(Number((err as Error).message))
          ? 500
          : Number((err as Error).message);
        res.status(statusCode);
        const errorPage = parseTemplate(`${statusCode}` || "500", "./dist/src");

        if (errorPage) {
          html = await render(errorPage.path, req, res);
        }
      }
    } else {
      res.status(404);
      const errorPage = parseTemplate("400", "./dist/src");

      if (errorPage) {
        html = await render(errorPage.path, req, res);
      }
    }

    return res.send(html);
  });

  app.listen({ port }, () => {
    console.log(`Laman.js server is running on ` + port);
  });
}
