/**
 * @fileoverview Configuration management commands for CLI
 */

import type { Command } from "commander";
import type { CLIConfig } from "../config/CLIConfig.js";
import type { Output } from "../utils/Output.js";

export class ConfigCommands {
  constructor(
    private config: CLIConfig,
    private output: Output,
  ) {}

  register(program: Command): void {
    program
      .command("show")
      .description("Show current configuration")
      .action(() => {
        this.output.info("Config show command not implemented yet");
      });

    program
      .command("set")
      .description("Set configuration value")
      .argument("<key>", "Configuration key")
      .argument("<value>", "Configuration value")
      .action((key, value) => {
        this.output.info(`Config set: ${key} = ${value}`);
      });
  }
}
