import express from "express";
import { resolve } from "path";
import edge from "../utils/edge.js";
import parseTemplate from "../utils/parse-template.js";

export default async function preview(port: number = 3000) {
  const app = express();

  edge.boot();
  edge.get().mount(resolve("./dist/src"));

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
        html = await edge.get().render(template.path, { req });
      } catch (err) {
        console.log(err);
        const statusCode = isNaN(Number((err as Error).message))
          ? 500
          : Number((err as Error).message);
        const errorPage = parseTemplate(`${statusCode}` || "500", "./dist/src");

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

    return res.type("html").send(html);
  });

  app.listen({ port }, () => {
    console.log(`Laman.js server is running on ` + port);
  });
}
