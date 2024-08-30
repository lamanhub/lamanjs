#!/usr/bin/env node

import { Command } from "commander";
import build from "./commands/build.js";
import server from "./commands/server.js";
import preview from "./commands/preview.js";

const laman = new Command();

laman
  .name("laman")
  .description("A CLI app to develop LamanHub app")
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
  .description("Build LamanHub for Production")
  .action(async () => {
    await build();
  });

laman.parse();
