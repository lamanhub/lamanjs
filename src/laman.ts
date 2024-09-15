#!/usr/bin/env node

import { Command } from "commander";
import build from "./commands/build.js";
import server from "./commands/server.js";
import preview from "./commands/preview.js";
import deploy from "./commands/deploy.js";

const laman = new Command();

laman
  .name("laman")
  .description("A CLI app to develop Laman.js app")
  .version("1.0.0");

laman
  .command("run")
  .argument("<mode>", "Environtment Mode")
  .description("Run Laman.js server")
  .option("-p, --port <PORT>", "Port server")
  .action(async (mode, { port }) => {
    if (mode === "prod") {
      await preview(port);
    } else if (mode === "dev") {
      await server(port);
    } else {
      throw new Error("UNKNOWN ENV MODE");
    }
  });

laman
  .command("build")
  .description("Build Laman.js for Production")
  .option("-a, --archive", "Output archive")
  .action(async ({ archive }) => {
    await build(archive ? true : false);
  });

laman
  .command("deploy")
  .description("Deploy project to LamanHub")
  .action(async () => {
    await deploy();
  });

laman.parse();
