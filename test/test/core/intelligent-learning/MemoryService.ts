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
  // Tipos añadidos
  newSelector?: string;
  repaired?: boolean;
}

/**
 * MemoryService - Servicio de Memoria con Vector Database
 * ✅ TEMPORAL: ChromaDB deshabilitado para testing
 */
export class MemoryService {
  private client: ChromaClient;
  private collectionName = 'qa_agent_memory';
  private memoryCollection: Promise<Collection>;

  constructor() {
    // ✅ CORREGIR: ChromaDB deshabilitado temporalmente para testing
    console.log(`🧠 Servicio de Memoria inicializado. Colección: "${this.collectionName}" (ChromaDB DISABLED)`);
    
    // ChromaDB temporalmente deshabilitado
    this.client = null as any;
    this.memoryCollection = Promise.resolve(null as any);
  }

  /**
   * Guarda una reparación exitosa en la memoria del agente.
   * @param record El objeto MemoryRecord con los detalles del aprendizaje.
   */
  async saveSuccessfulRepair(record: MemoryRecord): Promise<void> {
    // ✅ CORREGIR: ChromaDB deshabilitado - solo logging
    console.log(`💾 Guardando nuevo recuerdo en la memoria (DISABLED): [${record.testName}]`);
    return;
  }

  /**
   * Busca en la memoria fallos pasados que sean similares al fallo actual.
   * @param failureContext La descripción del error actual.
   * @returns Un array de recuerdos pasados que podrían contener una solución.
   */
  async searchSimilarFailures(failureContext: string): Promise<any[]> {
    // ✅ CORREGIR: ChromaDB deshabilitado - retornar array vacío
    console.log(`🔍 Buscando en la memoria un fallo similar (DISABLED): "${failureContext.substring(0, 80)}..."`);
    return [];
  }
}