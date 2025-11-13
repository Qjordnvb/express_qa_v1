// orchestrator/parsers/TomlParser.ts
import * as TOML from '@iarna/toml';
import * as fs from 'fs';

export interface UserStoryStep {
  type: 'given' | 'when' | 'then';
  description: string;
  value?: string;
  target?: string;
}

export interface UserStory {
  name: string;
  path: string;
  steps: UserStoryStep[];
  validation?: {
    expectedErrors?: string[];
  };
  hints?: {
    form?: string;
    submitButton?: string;
    errorContainer?: string;
  };
}

export class TomlParser {
  /**
   * Parse a TOML file containing a user story
   * @param filePath Path to the TOML file
   * @returns Parsed UserStory object
   */
  static parseUserStory(filePath: string): UserStory {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = TOML.parse(content) as Record<string, unknown>;

      // Validate required fields
      if (!parsed.name || typeof parsed.name !== 'string') {
        throw new Error('User story must have a "name" field');
      }

      if (!parsed.path || typeof parsed.path !== 'string') {
        throw new Error('User story must have a "path" field');
      }

      return {
        name: parsed.name as string,
        path: parsed.path as string,
        steps: parsed.steps || [],
        validation: parsed.validation,
        hints: parsed.hints,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error parsing TOML file "${filePath}": ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Converts a UserStory object back to TOML format
   * @param userStory UserStory object to convert
   * @returns TOML string representation
   */
  static userStoryToToml(userStory: UserStory): string {
    return TOML.stringify(userStory as Record<string, unknown>);
  }
}
