#!/usr/bin/env node

import { Command } from "commander";
import build from "./commands/build.js";
import server from "./commands/server.js";

const laman = new Command();

laman
  .name("laman")
  .description("A CLI app to develop LamanHub app")
  .version("1.0.0");

laman
  .command("run")
  .description("Run local LamanHub server")
  .option("-p, --port <PORT>", "Port server")
  .action(async ({ port }) => {
    await server("./src", port);
  });

laman
  .command("build")
  .description("Build LamanHub for Production")
  .action(async () => {
    await build();
  });

laman.parse();
