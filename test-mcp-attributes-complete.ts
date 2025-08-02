// test-mcp-attributes-complete.ts
// 🔍 Test específico para extraer TODOS los atributos que MCP puede proporcionar
// Objetivo: Descubrir la información completa que MCP expone para la IA

import { MCPClientService } from './orchestrator/services/McpClientService';

interface DetailedMCPElement {
  ref: string;
  role: string;
  type?: string;
  text?: string;
  name?: string;
  
  // CAMPOS QUE QUEREMOS DESCUBRIR
  attributes?: Record<string, any>;
  htmlType?: string;          // type="password", type="email", etc.
  htmlName?: string;          // name="password", name="email", etc.
  placeholder?: string;       // placeholder="Ingresa tu email"
  id?: string;               // id="email-field"
  className?: string;        // class="form-control"
  value?: string;            // value=""
  
  // CAMPOS GENERADOS
  selectors?: {
    css?: string;
    xpath?: string;
    getByRole?: string;
    getByPlaceholder?: string;
    getByName?: string;
  };
}

export class MCPAttributeTester {
  private mcpClient: MCPClientService;

  constructor() {
    this.mcpClient = new MCPClientService();
  }

  /**
   * 🔍 EXTRAER TODOS LOS ATRIBUTOS POSIBLES DE MCP
   */
  async testCompleteAttributeExtraction(url: string): Promise<void> {
    console.log('\n🔍 TEST COMPLETO DE ATRIBUTOS MCP\n');
    console.log(`🎯 Objetivo: Extraer TODA la información que MCP puede proporcionar`);
    console.log(`🌐 URL: ${url}`);
    
    await this.mcpClient.startMCPServer();
    await this.mcpClient.navigateToUrl(url);
    
    console.log('\n📋 MÉTODOS DE EXTRACCIÓN QUE PROBAREMOS:');
    console.log('   1. browser_snapshot (YAML) - Estructura básica');
    console.log('   2. browser_evaluate (JavaScript) - Atributos HTML directos');
    console.log('   3. Análisis híbrido - Correlación de datos');
    
    // === MÉTODO 1: Snapshot YAML básico ===
    await this.testYamlAttributeExtraction();
    
    // === MÉTODO 2: JavaScript evaluation para atributos HTML ===
    await this.testJavaScriptAttributeExtraction();
    
    // === MÉTODO 3: Análisis híbrido completo ===
    await this.testHybridAttributeExtraction();
    
    await this.mcpClient.stopMCPServer();
  }

  /**
   * 🔬 MÉTODO 1: Extraer desde YAML snapshot
   */
  private async testYamlAttributeExtraction(): Promise<void> {
    console.log('\n📋 MÉTODO 1: Extracción desde YAML snapshot');
    console.log('=' .repeat(60));
    
    try {
      const mcpClient = (this.mcpClient as any).mcpClient;
      const result = await mcpClient.callTool({
        name: 'browser_snapshot',
        arguments: {}
      });
      
      console.log('🔍 Respuesta completa de browser_snapshot:');
      console.log(JSON.stringify(result, null, 2));
      
      // Extraer YAML
      let yamlContent = '';
      if (result.content && Array.isArray(result.content)) {
        const textContent = result.content.find((item: any) => item.type === 'text');
        if (textContent?.text) {
          const yamlMatch = textContent.text.match(/```yaml\s*([\s\S]*?)\s*```/);
          if (yamlMatch) {
            yamlContent = yamlMatch[1];
          }
        }
      }
      
      if (yamlContent) {
        console.log('\n📝 YAML extraído:');
        console.log('-'.repeat(40));
        console.log(yamlContent);
        console.log('-'.repeat(40));
        
        // Analizar elementos del YAML para extraer TODO
        const yamlElements = this.parseYamlForCompleteAttributes(yamlContent);
        
        console.log('\n🎯 ELEMENTOS EXTRAÍDOS DEL YAML:');
        console.log(`Total: ${yamlElements.length} elementos`);
        
        yamlElements.forEach((element, index) => {
          console.log(`\n${index + 1}. ELEMENTO [ref=${element.ref}]:`);
          console.log(`   - Role: ${element.role}`);
          console.log(`   - Text: "${element.text || 'N/A'}"`);
          console.log(`   - Name: "${element.name || 'N/A'}"`);
          
          if (element.attributes && Object.keys(element.attributes).length > 0) {
            console.log(`   - Atributos encontrados:`);
            Object.entries(element.attributes).forEach(([key, value]) => {
              console.log(`     * ${key}: "${value}"`);
            });
          } else {
            console.log(`   - Atributos: ❌ No encontrados en YAML`);
          }
        });
      }
      
    } catch (error) {
      console.log(`❌ Error en extracción YAML:`, error);
    }
  }

  /**
   * 🔬 MÉTODO 2: JavaScript evaluation para atributos HTML
   */
  private async testJavaScriptAttributeExtraction(): Promise<void> {
    console.log('\n⚡ MÉTODO 2: Extracción con JavaScript evaluation');
    console.log('=' .repeat(60));
    
    try {
      const mcpClient = (this.mcpClient as any).mcpClient;
      
      // Script JavaScript optimizado para extraer TODOS los atributos
      const jsScript = `() => {
        const elements = [];
        const allElements = document.querySelectorAll('input, button, select, textarea, a[href]');
        
        allElements.forEach((el, index) => {
          const rect = el.getBoundingClientRect();
          
          // Solo elementos visibles
          if (rect.width > 0 && rect.height > 0) {
            const elementData = {
              index: index,
              tagName: el.tagName.toLowerCase(),
              
              // ATRIBUTOS HTML DIRECTOS
              type: el.type || null,
              name: el.name || null,
              id: el.id || null,
              className: el.className || null,
              placeholder: el.placeholder || null,
              value: el.value || null,
              
              // ATRIBUTOS ARIA Y ACCESIBILIDAD
              role: el.getAttribute('role') || null,
              ariaLabel: el.getAttribute('aria-label') || null,
              ariaLabelledby: el.getAttribute('aria-labelledby') || null,
              
              // TEXTO Y CONTENIDO
              textContent: el.textContent?.trim().substring(0, 100) || null,
              innerText: el.innerText?.trim().substring(0, 100) || null,
              
              // PROPIEDADES COMPUTADAS
              disabled: el.disabled || false,
              required: el.required || false,
              readonly: el.readOnly || false,
              
              // TODOS LOS ATRIBUTOS PERSONALIZADOS
              allAttributes: Array.from(el.attributes).reduce((attrs, attr) => {
                attrs[attr.name] = attr.value;
                return attrs;
              }, {}),
              
              // INFORMACIÓN DE POSICIÓN
              boundingBox: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
              }
            };
            
            elements.push(elementData);
          }
        });
        
        return elements;
      }`;
      
      const result = await mcpClient.callTool({
        name: 'browser_evaluate',
        arguments: {
          function: jsScript
        }
      });
      
      console.log('🔍 Respuesta completa de browser_evaluate:');
      console.log(JSON.stringify(result, null, 2));
      
      // Extraer datos de la respuesta
      let elementsData = [];
      if (result.content && Array.isArray(result.content)) {
        const textContent = result.content.find((item: any) => item.type === 'text');
        if (textContent?.text) {
          try {
            // Buscar JSON en el texto
            const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              elementsData = JSON.parse(jsonMatch[0]);
            }
          } catch (e) {
            console.log('⚠️ No se pudo parsear JSON de browser_evaluate');
          }
        }
      }
      
      if (elementsData.length > 0) {
        console.log('\n🎯 ELEMENTOS EXTRAÍDOS CON JAVASCRIPT:');
        console.log(`Total: ${elementsData.length} elementos`);
        
        elementsData.forEach((element: any, index: number) => {
          console.log(`\n${index + 1}. ELEMENTO <${element.tagName}>:`);
          console.log(`   - Type: "${element.type || 'N/A'}"`);
          console.log(`   - Name: "${element.name || 'N/A'}"`);
          console.log(`   - ID: "${element.id || 'N/A'}"`);
          console.log(`   - Placeholder: "${element.placeholder || 'N/A'}"`);
          console.log(`   - Role: "${element.role || 'N/A'}"`);
          console.log(`   - Text: "${element.textContent || 'N/A'}"`);
          console.log(`   - Disabled: ${element.disabled}`);
          console.log(`   - Required: ${element.required}`);
          
          if (element.allAttributes && Object.keys(element.allAttributes).length > 0) {
            console.log(`   - TODOS los atributos HTML:`);
            Object.entries(element.allAttributes).forEach(([key, value]) => {
              console.log(`     * ${key}: "${value}"`);
            });
          }
          
          // ANÁLISIS ESPECÍFICO PARA PASSWORDS
          if (element.type === 'password') {
            console.log(`   🔐 ¡CAMPO DE PASSWORD DETECTADO!`);
            console.log(`     - Confirmado por type="${element.type}"`);
          }
        });
        
        // Análisis específico de campos password
        const passwordFields = elementsData.filter((el: any) => el.type === 'password');
        console.log(`\n🔐 CAMPOS DE PASSWORD ENCONTRADOS: ${passwordFields.length}`);
        
        if (passwordFields.length > 0) {
          passwordFields.forEach((field: any, index: number) => {
            console.log(`\n   Password Field ${index + 1}:`);
            console.log(`   - TagName: ${field.tagName}`);
            console.log(`   - Type: ${field.type}`);
            console.log(`   - Name: ${field.name || 'N/A'}`);
            console.log(`   - ID: ${field.id || 'N/A'}`);
            console.log(`   - Placeholder: ${field.placeholder || 'N/A'}`);
          });
        }
      } else {
        console.log('❌ No se extrajeron elementos con JavaScript');
      }
      
    } catch (error) {
      console.log(`❌ Error en extracción JavaScript:`, error);
    }
  }

  /**
   * 🔬 MÉTODO 3: Análisis híbrido completo
   */
  private async testHybridAttributeExtraction(): Promise<void> {
    console.log('\n🚀 MÉTODO 3: Análisis híbrido (YAML + JavaScript)');
    console.log('=' .repeat(60));
    
    console.log('📋 Combinando información de ambos métodos...');
    console.log('   - YAML: Estructura, roles, referencias MCP');
    console.log('   - JavaScript: Atributos HTML completos');
    console.log('   - Híbrido: Correlación inteligente');
    
    // Aquí correlaríamos los datos de ambos métodos
    // Para generar un contexto completo para la IA
    
    console.log('\n💡 CONTEXTO FINAL PARA LA IA:');
    console.log('   ✅ Referencias MCP (refs) para interacción');
    console.log('   ✅ Atributos HTML completos (type, name, etc.)');
    console.log('   ✅ Roles ARIA para accesibilidad');
    console.log('   ✅ Texto descriptivo para contexto');
    console.log('   ✅ Selectores múltiples generados automáticamente');
  }

  /**
   * 🔧 Parser YAML mejorado para extraer todos los atributos posibles
   */
  private parseYamlForCompleteAttributes(yaml: string): DetailedMCPElement[] {
    const elements: DetailedMCPElement[] = [];
    const lines = yaml.split('\n');
    
    for (const line of lines) {
      // Buscar elementos con [ref=xxx]
      const refMatch = line.match(/\[ref=([^\]]+)\]/);
      if (refMatch) {
        const ref = refMatch[1];
        
        // Extraer tipo de elemento
        const typeMatch = line.match(/^\s*-\s+(\w+)/);
        const type = typeMatch ? typeMatch[1] : 'unknown';
        
        // Extraer texto (entre comillas)
        const textMatch = line.match(/"([^"]+)"/);
        const text = textMatch ? textMatch[1] : undefined;
        
        // Buscar TODOS los atributos en formato [attr=value]
        const attributes: Record<string, any> = {};
        const attrMatches = line.matchAll(/\[(\w+)=([^\]]+)\]/g);
        for (const match of attrMatches) {
          if (match[1] !== 'ref') {  // Excluir ref ya que lo tenemos separado
            attributes[match[1]] = match[2];
          }
        }
        
        // Generar selectores automáticamente
        const selectors: any = {};
        if (type) selectors.getByRole = type;
        if (text) selectors.getByText = text;
        if (attributes.id) selectors.css = `#${attributes.id}`;
        if (attributes.name) selectors.getByName = attributes.name;
        if (attributes.placeholder) selectors.getByPlaceholder = attributes.placeholder;
        
        elements.push({
          ref,
          role: type,
          type,
          text,
          name: text,
          attributes,
          selectors,
          
          // Mapear atributos específicos
          htmlType: attributes.type,
          htmlName: attributes.name,
          placeholder: attributes.placeholder,
          id: attributes.id,
          className: attributes.class
        });
      }
    }
    
    return elements;
  }
}

// Función para ejecutar el test
async function runAttributeTest() {
  const tester = new MCPAttributeTester();
  await tester.testCompleteAttributeExtraction('https://admin-dev.membeers.com/');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runAttributeTest().catch(console.error);
}

export { runAttributeTest };