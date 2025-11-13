// tests/unit/toml-parser.test.ts
import { test, expect } from '@playwright/test';
import { TomlParser } from '../../orchestrator/parsers/TomlParser';
import * as fs from 'fs';
import * as path from 'path';

test.describe('TomlParser', () => {
  const testTomlPath = path.join(__dirname, '../fixtures/test-story.toml');

  test('debería parsear un archivo TOML correctamente', () => {
    const userStory = TomlParser.parseUserStory(testTomlPath);

    expect(userStory.name).toBe('Test Story');
    expect(userStory.path).toBe('/test-path');
    expect(userStory.steps).toHaveLength(3);
  });

  test('debería extraer los pasos con tipos correctos', () => {
    const userStory = TomlParser.parseUserStory(testTomlPath);

    expect(userStory.steps[0].type).toBe('given');
    expect(userStory.steps[1].type).toBe('when');
    expect(userStory.steps[2].type).toBe('then');
  });

  test('debería extraer targets cuando existen', () => {
    const userStory = TomlParser.parseUserStory(testTomlPath);

    expect(userStory.steps[1].target).toBe('testButton');
    expect(userStory.steps[2].target).toBe('result');
  });

  test('debería extraer validaciones', () => {
    const userStory = TomlParser.parseUserStory(testTomlPath);

    expect(userStory.validation?.expectedErrors).toEqual(['Error 1', 'Error 2']);
  });

  test('debería extraer hints', () => {
    const userStory = TomlParser.parseUserStory(testTomlPath);

    expect(userStory.hints?.form).toBe('test-form');
    expect(userStory.hints?.submitButton).toBe('Submit');
  });

  test('debería convertir UserStory de vuelta a TOML', () => {
    const userStory = TomlParser.parseUserStory(testTomlPath);
    const tomlString = TomlParser.userStoryToToml(userStory);

    expect(tomlString).toContain('name = "Test Story"');
    expect(tomlString).toContain('path = "/test-path"');
  });
});
