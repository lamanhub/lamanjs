import * as path from "path";
import * as fs from "fs";
import fg from "fast-glob";

export type Route = {
  path: string;
  params: Record<string, string>;
};

function deepSearch(
  template: string,
  requested: string[],
  startPoint: number = 0
): Route | null {
  let found: Route | null = null;
  for (let index = requested.length - 1; index >= startPoint; index--) {
    const check = requested[index];
    const prefix = path.join("pages", ...requested.slice(0, index));

    if (index === requested.length - 1) {
      if (fs.existsSync(path.resolve(template, prefix, check + ".edge"))) {
        found = {
          path: path.join(prefix, check),
          params: {},
        };

        break;
      } else if (
        fs.existsSync(path.resolve(template, prefix, check, "index.edge"))
      ) {
        found = {
          path: path.join(prefix, check, "index"),
          params: {},
        };
        break;
      } else {
        const find = search(template, prefix, "file");

        if (find) {
          found = {
            path: path.join(prefix, find),
            params: {
              [find.replace(/[^A-Za-z]+/g, "")]: check,
            },
          };
          break;
        }
      }

      const find = search(template, prefix, "dir");

      if (find) {
        requested.splice(index, 1, find);

        found = deepSearch(template, requested);
        if (found) {
          found.params = {
            ...found.params,
            [find.replace(/[^A-Za-z]+/g, "")]: check,
          };
        }
        break;
      }
    } else {
      const find = search(template, prefix, "dir");

      if (find) {
        requested.splice(index, 1, find);

        found = deepSearch(template, requested, index + 1);

        if (found) {
          found.params = {
            ...found.params,
            [find.replace(/[^A-Za-z]+/g, "")]: check,
          };
        }
        break;
      }
    }
  }

  return found;
}

function search(
  template: string,
  prefix: string,
  type: "dir" | "file"
): string | null {
  if (!fs.existsSync(path.resolve(template, prefix))) {
    return null;
  }

  if (type === "file") {
    const possibles = fg
      .sync("*.edge", {
        cwd: path.resolve(template, prefix),
      })
      .filter((item) => {
        return item.match(/\[([A-Za-z]+)\]\.edge$/);
      });

    if (possibles.length) {
      return possibles[0].replace(".edge", "");
    }
  } else {
    const directoryContents = fs.readdirSync(path.resolve(template, prefix), {
      withFileTypes: true,
    });

    const directories = directoryContents
      .filter((item) => item.isDirectory())
      .map((item) => item.name)
      .filter((item) => item.match(/\[([A-Za-z]+)\]$/));

    if (directories.length) {
      return directories[0];
    }
  }

  return null;
}

export default function parseTemplate(
  url: string,
  templatePath: string
): Route | null {
  if (!url) {
    if (fs.existsSync(path.resolve(templatePath, "pages", "index.edge"))) {
      return { path: path.join("pages", "index"), params: {} };
    }

    return null;
  }

  let requested = url.split("/");

  const template = deepSearch(templatePath, requested);

  if (
    !template &&
    fs.existsSync(path.resolve(templatePath, "pages", "404.edge"))
  ) {
    return {
      path: path.join("pages", "404"),
      params: {},
    };
  }

  return template;
}
