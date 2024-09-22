import { createId } from "@paralleldrive/cuid2";
import axios from "axios";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { createConnection } from "net";
import open from "open";
import { resolve } from "path";
import { PassThrough } from "stream";
import progress from "../utils/progress.js";
import streamToBuffer from "../utils/stream-to-buffer.js";
import archive from "./archive.js";

type Config = {
  id: number;
  slug: string;
  name: string;
  deployKey: string;
};

const getConfig = (deployConfigPath: string): Promise<Config> => {
  return new Promise((resolve) => {
    const socket = createConnection({
      host: "lamanhub.site",
      port: 3131,
    });
    socket.on("connect", () => {
      const key = createId();
      console.log(
        "Requesting deploy key... Please complete the authentication in your browser.\n"
      );
      socket.write(JSON.stringify({ command: "GET_DEPLOY_KEY", data: key }));

      const url = "https://app.lamanhub.site/deploy/" + key;
      open(url);

      console.log(
        "A new browser window has been opened. If it doesn't open automatically, please visit the following URL to proceed:"
      );
      console.log(url + "\n");
    });

    socket.on("data", (data) => {
      console.log("Deploy key confirmed!\n");
      writeFileSync(deployConfigPath, data.toString("utf-8"));
      resolve(JSON.parse(data.toString("utf-8")));
    });
  });
};

const uploading = async (deployKey: string, buffer: Buffer) => {
  const loader = progress("Uploading");
  return axios
    .put("https://api.lamanhub.site/api/project/deploy", buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "LH-Deploy-Key": deployKey,
      },
      onUploadProgress: (progressEvent) => {
        const loaded = Math.round(
          (progressEvent.loaded * 100) /
            (progressEvent.total || buffer.byteLength)!
        );

        loader.load(loaded + "%");
      },
    })
    .then(() => {
      loader.succeed("Archive uploaded successfully.");
    })
    .catch((e) => {
      console.log(e);
    });
};

export default async function deploy() {
  const deployConfigPath = resolve("./deploy.json");
  let config: Config;

  if (existsSync(deployConfigPath)) {
    config = JSON.parse(readFileSync(deployConfigPath).toString("utf-8"));
  } else {
    config = await getConfig(deployConfigPath);
  }

  console.log("------- Project Information -------");
  console.log("Project ID    : " + config.id);
  console.log("Project Name  : " + config.name);
  console.log("Project Slug  : " + config.slug + "\n");

  const stream = new PassThrough();
  const [buffer] = await Promise.all([streamToBuffer(stream), archive(stream)]);

  await uploading(config.deployKey, buffer).catch((e) => {
    console.log(e);
  });
  console.log(
    "\nProject successfully deployed! You can manage your project from the dashboard:"
  );
  console.log(`https://app.lamanhub.site/detail/${config.id}`);
}
