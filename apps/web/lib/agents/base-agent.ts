import type { AgentDefinition, AgentTask, AgentType } from "@/lib/agents/types";

export abstract class BaseAgent {
  abstract readonly type: AgentType;
  abstract readonly name: string;
  abstract readonly description: string;

  definition(): AgentDefinition {
    return {
      type: this.type,
      name: this.name,
      description: this.description,
    };
  }

  validateInput(input: unknown): boolean {
    return input !== null && input !== undefined;
  }

  formatOutput(output: unknown): unknown {
    return output;
  }

  async execute(task: AgentTask): Promise<unknown> {
    if (!this.validateInput(task.input)) {
      throw new Error(`${this.name} received invalid input.`);
    }

    return this.formatOutput(await this.run(task));
  }

  protected abstract run(task: AgentTask): Promise<unknown>;
}
