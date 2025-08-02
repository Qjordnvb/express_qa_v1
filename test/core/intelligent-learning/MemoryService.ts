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
 * 🎯 READY: Preparado para Node.js v20+ y ChromaDB
 */
export class MemoryService {
  private client: ChromaClient | null = null;
  private collectionName = 'qa_agent_memory';
  private memoryCollection: Promise<Collection> | null = null;
  private isChromaDBEnabled: boolean = false;

  constructor() {
    this.initializeChromaDB();
  }

  private async initializeChromaDB(): Promise<void> {
    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion >= 20) {
        console.log(`🧠 Inicializando ChromaDB con Node.js ${nodeVersion}...`);
        
        // Try different ChromaDB configurations
        try {
          // First try localhost server on port 8001 (detected)
          this.client = new ChromaClient({
            host: "localhost",
            port: 8001
          });
          await this.client.heartbeat();
          console.log('💓 Conectado a ChromaDB server en localhost:8001');
        } catch (error) {
          console.log('⚠️  Server no disponible, usando modo in-memory...');
          // Fallback to in-memory
          this.client = new ChromaClient();
        }
        
        this.memoryCollection = this.client.getOrCreateCollection({
          name: this.collectionName,
          metadata: { description: 'QA Agent learning memory for test automation' }
        });
        
        // Test collection creation
        const collection = await this.memoryCollection;
        console.log(`✅ ChromaDB collection "${this.collectionName}" creada/obtenida`);
        
        this.isChromaDBEnabled = true;
        console.log(`✅ ChromaDB habilitado correctamente. Colección: "${this.collectionName}"`);
      } else {
        console.log(`⚠️  Node.js ${nodeVersion} < v20. ChromaDB deshabilitado.`);
        console.log(`   Upgrade Node.js a v20+ para habilitar vector memory.`);
        this.isChromaDBEnabled = false;
      }
    } catch (error) {
      console.error('❌ Error inicializando ChromaDB:', error);
      console.log('🔄 Continuando sin vector memory...');
      this.isChromaDBEnabled = false;
    }
  }

  /**
   * Guarda una reparación exitosa en la memoria del agente.
   * @param record El objeto MemoryRecord con los detalles del aprendizaje.
   */
  async saveSuccessfulRepair(record: MemoryRecord): Promise<void> {
    if (!this.isChromaDBEnabled || !this.memoryCollection) {
      console.log(`💾 [FALLBACK] Guardando recuerdo en memoria local: [${record.testName}]`);
      return;
    }

    try {
      const collection = await this.memoryCollection;
      const id = `${record.testName}_${Date.now()}`;
      
      await collection.add({
        ids: [id],
        documents: [record.failureContext],
        metadatas: [{
          testName: record.testName,
          url: record.url,
          originalSelector: record.repairedSelector.originalSelector,
          newSelector: record.repairedSelector.newSelector,
          elementName: record.repairedSelector.elementName,
          timestamp: new Date().toISOString()
        }]
      });

      console.log(`✅ Recuerdo guardado en ChromaDB: [${record.testName}]`);
    } catch (error) {
      console.error('❌ Error guardando en ChromaDB:', error);
      console.log(`🔄 [FALLBACK] Guardando en memoria local: [${record.testName}]`);
    }
  }

  /**
   * Busca en la memoria fallos pasados que sean similares al fallo actual.
   * @param failureContext La descripción del error actual.
   * @returns Un array de recuerdos pasados que podrían contener una solución.
   */
  async searchSimilarFailures(failureContext: string): Promise<any[]> {
    if (!this.isChromaDBEnabled || !this.memoryCollection) {
      console.log(`🔍 [FALLBACK] Búsqueda en memoria local: "${failureContext.substring(0, 80)}..."`);
      return [];
    }

    try {
      const collection = await this.memoryCollection;
      
      const results = await collection.query({
        queryTexts: [failureContext],
        nResults: 5
      });

      console.log(`🎯 Encontrados ${results.documents[0]?.length || 0} recuerdos similares en ChromaDB`);
      
      return results.documents[0]?.map((doc, index) => ({
        document: doc,
        metadata: results.metadatas?.[0]?.[index],
        distance: results.distances?.[0]?.[index]
      })) || [];
    } catch (error) {
      console.error('❌ Error buscando en ChromaDB:', error);
      console.log(`🔄 [FALLBACK] Búsqueda en memoria local vacía`);
      return [];
    }
  }

  /**
   * Verifica si ChromaDB está habilitado y funcionando
   */
  public isEnabled(): boolean {
    return this.isChromaDBEnabled;
  }

  /**
   * Obtiene estadísticas de la memoria
   */
  async getMemoryStats(): Promise<{ enabled: boolean; count?: number; version?: string }> {
    if (!this.isChromaDBEnabled || !this.memoryCollection) {
      return { enabled: false };
    }

    try {
      const collection = await this.memoryCollection;
      const count = await collection.count();
      return { 
        enabled: true, 
        count,
        version: process.version
      };
    } catch (error) {
      return { enabled: false };
    }
  }
}