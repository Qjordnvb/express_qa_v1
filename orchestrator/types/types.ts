// orchestrator/types/types.ts

/**
 * Define un único método selector (ej: getByRole, css, etc.), que es la forma
 * en que Playwright puede encontrar un elemento.
 */
export interface Selector {
  type: string;                 // "getByRole", "getByLabel", "css", "xpath", etc.
  value: string;                // El valor del selector (ej. "button", "#submit-button")
  options?: { name: string };   // Opciones adicionales para selectores como getByRole.
}

/**
 * Define un "localizador", que es la representación de un elemento de la UI en nuestro Page Object.
 * Agrupa múltiples selectores para hacerlo más resiliente.
 */
export interface LocatorDefinition {
  name: string;           // Nombre en camelCase para la variable (ej: "submitButton")
  elementType: string;    // Tipo semántico del elemento (ej: "button", "input")
  actions: string[];      // Acciones que se pueden realizar sobre él (ej: ["click"])
  selectors: Selector[];  // Un array de diferentes selectores para encontrar el elemento
  waitBefore?: string;    // Condición a esperar antes de la interacción (ej: "visible", "enabled")
  validateAfter?: boolean; // Si se debe validar el resultado de la acción
}

/**
 * Define un Page Object Model (POM), que representa una página o un componente grande de la UI.
 */
export interface PageObjectDefinition {
  className: string;              // Nombre de la clase (ej: "GoogleHomePage")
  locators: LocatorDefinition[];  // Array de localizadores que pertenecen a esta página
}

/**
 * Define los diferentes tipos de aserciones que podemos realizar en un paso de prueba.
 * Es una unión discriminada por el campo "type".
 */
export type TestAssertion =
  | { type: 'urlContains'; expected: string }
  | { type: 'urlEquals'; expected: string }
  | { type: 'titleContains'; expected: string }
  | { type: 'titleEquals'; expected: string }
  | { type: 'textVisible'; expected: string }
  | { type: 'text'; expected: string }
  | { type: 'elementVisible'; selector: string }
  | { type: 'elementHidden'; selector: string }
  | { type: 'elementEnabled'; selector: string }
  | { type: 'elementDisabled'; selector: string }
  | { type: 'elementContainsText'; selector: string; expected: string }
  | { type: 'elementHasText'; selector: string; expected: string }
  | { type: 'elementHasValue'; selector: string; expected: string }
  | { type: 'elementHasAttribute'; selector: string; attribute: string; expected: string }
  | { type: 'elementCount'; selector: string; expected: number }
  | { type: 'oneOf'; expectedOptions: string[] };

/**
 * Define una condición de espera explícita dentro de un paso de prueba.
 */
export interface TestWaitCondition {
  element: string; // El 'name' del locator a esperar
  state: string;   // El estado esperado (ej: "visible", "enabled")
}

/**
 * Define un único paso dentro de un caso de prueba.
 */
export interface TestStep {
  page: string;                 // El 'className' del PageObject al que pertenece este paso
  action: string;               // La acción a ejecutar (ej: "clickLoginButton")
  params?: (string | string[])[]; // Parámetros para la acción. Puede ser un array de strings o de arrays de strings.
  waitFor?: TestWaitCondition;  // Condición de espera opcional
  assert?: TestAssertion;       // Aserción opcional a realizar en este paso
}

/**
 * La interfaz principal y unificada para CUALQUIER respuesta de un LLM.
 * Esta es la estructura que el orquestador siempre esperará recibir.
 */
export interface AIResponse {
  pageObject: PageObjectDefinition;
  additionalPageObjects?: PageObjectDefinition[]; // Para flujos que involucran más de una página
  testSteps: TestStep[];
}
