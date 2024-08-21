#!/usr/bin/env node

import { Command } from "commander";
import server from "./server.js";
import build from "./build.js";
import init from "./init.js";

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

laman
  .command("init")
  .description("Init LamanHub for Development")
  .action(async () => {
    await init();
  });

laman.parse();
