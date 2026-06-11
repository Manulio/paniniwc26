import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import stickersData from '../data/stickers.json';

export interface RecognizedSticker {
  number: string;
}

// La compresión manual rompía la legibilidad de los números (muy pequeños).
// Gemini internamente ya reescala imágenes a un tamaño óptimo.

export async function recognizeStickersFromImages(
  base64Images: string[]
): Promise<{ mode: 'album' | 'loose', stickers: RecognizedSticker[] }> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('API Key de Gemini no configurada en el archivo .env');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
      mode: {
        type: SchemaType.STRING,
        description: "El modo detectado de la imagen. Usa 'album' si la figurita ya está PEGADA en una hoja de álbum con más texto alrededor. Usa 'loose' si se está mostrando de forma individual (en la mano de alguien, sobre una mesa, sola)."
      },
      stickers: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            number: {
              type: SchemaType.STRING,
              description: "El código exacto de la figurita, ej. 'ARG 10', 'FWC 5', 'FRA 2'"
            },
            country: {
              type: SchemaType.STRING,
              description: "El nombre del país o equipo, ej. 'Argentina', 'FIFA'"
            }
          },
          required: ["number", "country"]
        }
      }
    },
    required: ["mode", "stickers"]
  } as any;

  // Comprimir el mapping para ahorrar tokens (ej. ARG:1=Badge,10=Messi;BRA:1=Badge,10=Neymar)
  const grouped: Record<string, string[]> = {};
  stickersData.forEach((s: any) => {
    const parts = s.number.split(' ');
    if (parts.length === 2) {
      const team = parts[0];
      const num = parts[1];
      if (!grouped[team]) grouped[team] = [];
      grouped[team].push(`${num}=${s.name}`);
    } else {
      if (!grouped['MISC']) grouped['MISC'] = [];
      grouped['MISC'].push(`${s.number}=${s.name}`);
    }
  });
  
  const mappingText = Object.entries(grouped)
    .map(([team, players]) => `${team}:${players.join(',')}`)
    .join(';');

  const systemPrompt = `Eres un experto identificando figuritas del Mundial de la FIFA Panini 2026. Tu trabajo es extraer la información de las figuritas visibles y determinar el contexto en el que se encuentran. Debes devolver ÚNICAMENTE un objeto JSON válido.
  
1. Determina el 'mode': 
- Si la imagen muestra una figurita que ya está pegada dentro de un álbum (se ven marcos, texto del álbum alrededor, otras figuritas en la misma hoja), el mode debe ser 'album'.
- Si la imagen muestra una figurita sostenida en la mano, sobre una mesa o mostrada de forma individual, el mode debe ser 'loose'.

2. Identifica las figuritas ('stickers'):
- Si la figurita se muestra de FRENTE, no podrás ver su código. En este caso, DEBES leer el nombre del jugador y el país/equipo impresos en el frente de la figurita, y usar la lista de mapeo exacta proporcionada abajo para deducir cuál es su código 'number' correcto.
- Si la figurita se muestra de ESPALDAS, simplemente extrae el código 'number' impreso en la parte trasera (ej. 'ARG 10').

MUY IMPORTANTE (Solo para mode 'album'): A menudo verás fotos de las páginas del álbum. Las páginas tienen imágenes de fondo descoloridas o marcos con números impresos que indican DÓNDE pegar la figurita. ¡DEBES IGNORARLAS COMPLETAMENTE! Solo debes extraer los códigos de las figuritas que estén REALMENTE PEGADAS (las que se ven brillantes, a todo color). Si el recuadro está vacío o solo tiene la imagen de fondo impresa por Panini, NO lo incluyas.

CONSEJO CLAVE: Las figuritas que muestran un equipo completo posando para una foto (Team Photo) generalmente tienen el número 13 de ese país (ej. ARG 13, BRA 13). Los escudos o badges suelen ser el número 1. La figurita 00 o Panini Logo es siempre 'FWC 00'.

Para mayor precisión, aquí tienes la lista exacta de códigos y qué jugador/item representan. Úsala para deducir el 'number' si la foto está tomada de frente:
${mappingText}`;

  const model = genAI.getGenerativeModel({ 
    model: "gemini-pro-latest",
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    }
  });

  const taskPrompt = `Te estoy enviando ${base64Images.length} imagen(es). Analiza la imagen, determina si es una figurita pegada en un álbum ('album') o suelta individual ('loose'). Identifica de forma exhaustiva TODAS las figuritas que se ven claramente. Si la foto es frontal, deduce el código por el nombre del jugador.`;

  const parts: any[] = [
    { text: taskPrompt }
  ];

  base64Images.forEach(base64 => {
    // base64 comes as "data:image/jpeg;base64,/9j/4..."
    const match = base64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      });
    }
  });

  let retries = 3;
  let delay = 2000;

  while (retries > 0) {
    try {
      const result = await model.generateContent(parts);
      const content = result.response.text();
      
      if (!content) return { mode: 'loose', stickers: [] };
      
      try {
        const parsed = JSON.parse(content);
        if (parsed.stickers && Array.isArray(parsed.stickers)) {
          return { mode: parsed.mode || 'loose', stickers: parsed.stickers };
        }
        return { mode: 'loose', stickers: [] };
      } catch (e) {
        console.error("Failed to parse JSON from Gemini response", content);
        return { mode: 'loose', stickers: [] };
      }
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      // Si es error de límite de peticiones (429), reintentamos con backoff
      const isRateLimit = error?.status === 429 || (error?.message && error.message.includes('429'));
      if (isRateLimit && retries > 1) {
        retries--;
        console.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      
      throw new Error(error?.message || "Error al reconocer las figuritas. Revisa tu API key y tu conexión a internet.");
    }
  }
  
  return { mode: 'loose', stickers: [] };
}
