import { createId } from "@paralleldrive/cuid2";
import { createConnection } from "net";
import open from "open";
import archive from "./archive.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import axios from "axios";
import { PassThrough } from "stream";
import readline from "readline";

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

const streamToBuffer = (stream: PassThrough) => {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err) => reject(err));
  });
};

const uploading = async (deployKey: string, file: PassThrough) => {
  const bufferFile = await streamToBuffer(file);

  return axios.put("https://api.lamanhub.site/api/project/deploy", bufferFile, {
    headers: {
      "Content-Type": "application/octet-stream",
      "LH-Deploy-Key": deployKey,
    },
    onUploadProgress: (progressEvent) => {
      const progress = Math.round(
        (progressEvent.loaded * 100) /
          (progressEvent.total || bufferFile.byteLength)!
      );

      const barLength = 40;
      const completedLength = Math.round((barLength * progress) / 100);
      const bar =
        "=".repeat(completedLength) + "-".repeat(barLength - completedLength);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(
        progress === 100
          ? "Archive uploaded successfully." + " ".repeat(barLength)
          : `Uploading [${bar}] ${progress}%`
      );
    },
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

  const build = (await archive(false)) as PassThrough;

  await uploading(config.deployKey, build);
  console.log(
    "\n\nProject successfully deployed! You can manage your project from the dashboard:"
  );
  console.log(`https://app.lamanhub.site/detail/${config.id}`);
}
