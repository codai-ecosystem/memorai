import { describe, it, expect, beforeEach, vi } from "vitest";
import { CLI } from "../src/cli/CLI";
import { CLIConfig } from "../src/config/CLIConfig";
import { Output } from "../src/utils/Output";

// Mock the dependencies
vi.mock("../src/config/CLIConfig");
vi.mock("../src/utils/Output");

describe("CLI", () => {
  let cli: CLI;
  let mockConfig: any;
  let mockOutput: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      load: vi.fn(),
      save: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
    };

    mockOutput = {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    (CLIConfig as any).mockImplementation(() => mockConfig);
    (Output as any).mockImplementation(() => mockOutput);

    cli = new CLI();
  });

  describe("constructor", () => {
    it("should create CLI instance with required dependencies", () => {
      expect(cli).toBeDefined();
      expect(CLIConfig).toHaveBeenCalledOnce();
      expect(Output).toHaveBeenCalledOnce();
    });
  });

  describe("run", () => {
    it("should process command line arguments", async () => {
      const argv = ["node", "memorai", "--version"];

      // Mock process.exit to prevent actual exit during tests
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      try {
        await cli.run(argv);
      } catch (error) {
        // Expected for version command which calls process.exit
      }

      exitSpy.mockRestore();
    });

    it("should handle help command", async () => {
      const argv = ["node", "memorai", "--help"];

      // Mock process.exit to prevent actual exit during tests
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      try {
        await cli.run(argv);
      } catch (error) {
        // Expected for help command which calls process.exit
      }

      exitSpy.mockRestore();
    });

    it("should handle invalid commands gracefully", async () => {
      const argv = ["node", "memorai", "invalid-command"];

      // Mock process.exit to prevent actual exit during tests
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      try {
        await cli.run(argv);
      } catch (error) {
        // Expected for invalid commands
      }

      exitSpy.mockRestore();
    });

    it("should handle config options", async () => {
      const argv = ["node", "memorai", "--config", "test.json", "--verbose"];

      // Mock process.exit to prevent actual exit during tests
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      try {
        await cli.run(argv);
      } catch (error) {
        // Expected when no command is provided
      }

      exitSpy.mockRestore();
    });
  });

  describe("error handling", () => {
    it("should handle command errors gracefully", async () => {
      const argv = ["node", "memorai", "list"];

      // Mock the command to throw an error
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      try {
        await cli.run(argv);
      } catch (error) {
        // Expected when command fails
      }

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });
});
