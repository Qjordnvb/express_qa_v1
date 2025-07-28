// orchestrator/services/MemoryService.ts
import { ChromaClient, Collection } from 'chromadb';

/**
 * Define la estructura de un "recuerdo" que el agente guardará.
 * Contiene el contexto del fallo y la solución que funcionó.
 */
export interface MemoryRecord {
  testName: string;          // Nombre del caso de prueba
  failureContext: string;    // El mensaje de error o descripción del fallo
  repairedSelector: {        // La información de la reparación exitosa
    originalSelector: string;
    newSelector: string;
    elementName: string;
  };
  url: string;               // La URL donde ocurrió el fallo
  // <-- INICIO DE LA CORRECCIÓN: Tipos añadidos
  newSelector?: string;
  repaired?: boolean;
  // <-- FIN DE LA CORRECCIÓN
}

/**
 * Gestiona la memoria a largo plazo del agente, interactuando
 * con la base de datos vectorial (ChromaDB).
 */
export class MemoryService {
  private client: ChromaClient;
  private collectionName = 'qa_agent_memory';
  private memoryCollection: Promise<Collection>;

  constructor() {
    // Inicializa el cliente de ChromaDB. Se conectará a una instancia local.
    this.client = new ChromaClient({
      host: 'localhost',
      port: 8001
    });
    // getOrCreateCollection asegura que no intentemos crear la colección si ya existe.
    this.memoryCollection = this.client.getOrCreateCollection({ name: this.collectionName });
    console.log(`🧠 Servicio de Memoria inicializado. Colección: "${this.collectionName}"`);
  }

  /**
   * Guarda una reparación exitosa en la memoria del agente.
   * @param record El objeto MemoryRecord con los detalles del aprendizaje.
   */
  async saveSuccessfulRepair(record: MemoryRecord): Promise<void> {
    const collection = await this.memoryCollection;

    // Usamos el contexto del fallo como el "documento" principal para la búsqueda por similitud.
    // El id debe ser único. Creamos uno combinando el nombre del test y el elemento.
    const uniqueId = `${record.testName}-${record.repairedSelector.elementName}-${Date.now()}`;

    console.log(`💾 Guardando nuevo recuerdo en la memoria: [${uniqueId}]`);

    await collection.add({
      ids: [uniqueId],
      documents: [record.failureContext], // El texto que se usará para buscar fallos similares
      metadatas: [{
        testName: record.testName,
        originalSelector: record.repairedSelector.originalSelector,
        newSelector: record.repairedSelector.newSelector,
        elementName: record.repairedSelector.elementName,
        url: record.url,
      }],
    });
  }

  /**
   * Busca en la memoria fallos pasados que sean similares al fallo actual.
   * @param failureContext La descripción del error actual.
   * @returns Un array de recuerdos pasados que podrían contener una solución.
   */
  async searchSimilarFailures(failureContext: string): Promise<any[]> {
    const collection = await this.memoryCollection;

    console.log(`🔍 Buscando en la memoria un fallo similar a: "${failureContext.substring(0, 80)}..."`);

    // Realiza la consulta a la base de datos vectorial.
    // Le pedimos los 3 resultados más similares.
    const results = await collection.query({
      queryTexts: [failureContext],
      nResults: 3,
    });

    // Devolvemos los metadatos, que contienen la información útil de la solución.
    return results.metadatas[0] || [];
  }
}
