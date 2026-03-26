import { Agent, tool } from '@openai/agents';
import { fileSearchTool } from '@openai/agents';
import { z } from 'zod';
import { runner } from '@/libs/runner';

const HumanResourcesOutput = z.object({
    answer: z.string()
});

export type HumanResourcesOutput = z.infer<typeof HumanResourcesOutput>;

const healthCatalogAgent = () => {

    const healthCatalogTool = fileSearchTool(["vs_69b56a4fb4dc8191bd149f4f376118c4"], {
        maxNumResults: 3,
        includeSearchResults: true
    });

    return new Agent({
        name: 'Catálogo de Beneficios de Salud',
        instructions: `Eres un especialista en el Catálogo de Beneficios de Codelpa. Usa siempre la herramienta de búsqueda para consultar el documento antes de responder.

        El catálogo se organiza en tres áreas:
        - Área 1: Beneficios asociados al contrato colectivo (licencia médica, seguro complementario de salud, seguro dental, seguro de vida).
        - Área 2: Beneficios adicionales por clima laboral (vacunación anti influenza, Wellbeing by WTW, Codelpa Pace).
        - Área 3: Convenios (FALP oncológico, Óptica San Cristóbal, Óptica Schilling, Clínica Dental Cumbre, Sanasalud, Padre Mariano).

        Reglas:
        - Responde en español, de forma clara y concisa.
        - Indica si el beneficio tiene costo para el colaborador, es financiado o sin costo.
        - Cuando aplique, menciona requisitos como antigüedad mínima, capacidad crediticia o plazos.
        - Si preguntan por contactos, refiere al Área Calidad de Vida (Araceli Muñoz, Mario Mora, Carolina Pereira, Ayleen González).
        - Si la información solicitada no se encuentra en el documento, indícalo explícitamente.`,
        tools: [healthCatalogTool]
    });
};

const coveragePlanAgent = () => {

    const coveragePlanTool = fileSearchTool(["vs_69b56b01e1948191bcf8749397e8a310"], {
        maxNumResults: 3,
        includeSearchResults: true
    });

    return new Agent({
        name: 'Plan de Seguros Colectivos 2025 - 2026',
        instructions: `Eres un especialista en el Plan de Seguros Colectivos de Codelpa (MetLife, vigencia julio 2025 – junio 2026). Usa siempre la herramienta de búsqueda para consultar el documento antes de responder.

        Reglas:
        - Responde en español, de forma clara y concisa.
        - Cuando la pregunta involucre montos, incluye el porcentaje de reembolso, el tope por prestación y el tope anual tal como aparecen en el documento.
        - Si aplica la cláusula BMI, explica cómo se calcula el reembolso según el nivel de bonificación de ISAPRE/FONASA.
        - Distingue entre Seguro Complementario de Salud, Salud Ampliado, Seguro Dental, y coberturas de Vida/Adicionales.
        - Menciona carencias y requisitos de asegurabilidad cuando sean relevantes a la pregunta.
        - Si la información solicitada no se encuentra en el documento, indícalo explícitamente.`,
        tools: [coveragePlanTool]
    });
};

const frequentlyAskedQuestionsAgent = () => {

    const frequentlyAskedQuestionsTool = fileSearchTool(["vs_69b56b6989888191a64237f0470a697e"], {
        maxNumResults: 3,
        includeSearchResults: true
    });

    return new Agent({
        name: 'Preguntas Frecuentas sobre el Seguro de Salud',
        instructions: `Eres un especialista en preguntas frecuentes sobre los beneficios de salud de Codelpa. Usa siempre la herramienta de búsqueda para consultar el documento antes de responder.

        El documento cubre 4 áreas temáticas:
        1. Seguro Complementario MetLife (incorporación, coberturas, reembolsos, rechazos, Wellbeing by WTW).
        2. Convenios de Salud (Padre Mariano, FALP oncológico, Óptica San Cristóbal, SanaSalud, Ópticas Schilling, Clínica Dental Cumbre).
        3. Codelpa PACE (orientación psicológica gratuita).
        4. Orientaciones en Salud (Isapre, Fonasa, Ley de Urgencia, GES).

        Reglas:
        - Responde en español, de forma clara y concisa.
        - Cuando la respuesta incluya pasos o requisitos, preséntalos como lista numerada.
        - Incluye datos de contacto, plazos, documentos requeridos y links cuando sean relevantes a la pregunta.
        - Si la pregunta involucra reembolsos, indica los canales disponibles (APP MetLife, portal web, correo ejecutiva) y el plazo de 60 días corridos.
        - Si la información solicitada no se encuentra en el documento, indícalo explícitamente.`,
        tools: [frequentlyAskedQuestionsTool]
    });
};

function buildSearchAllTool() {
    const faqAgent = frequentlyAskedQuestionsAgent();
    const catalogAgent = healthCatalogAgent();
    const coverageAgent = coveragePlanAgent();

    return tool({
        name: 'buscar_informacion',
        description: 'Busca información sobre beneficios de salud en todas las fuentes disponibles: preguntas frecuentes, catálogo de beneficios y plan de coberturas. Úsala siempre para responder cualquier consulta del colaborador.',
        parameters: z.object({
            query: z.string().describe('La pregunta del colaborador tal como la formuló')
        }),
        execute: async ({ query }) => {
            const results = await Promise.allSettled([
                runner.run(faqAgent, query),
                runner.run(catalogAgent, query),
                runner.run(coverageAgent, query),
            ]);

            const extract = (r: PromiseSettledResult<any>) =>
                r.status === 'fulfilled'
                    ? (r.value.finalOutput ?? 'Sin información encontrada.')
                    : 'Error al consultar esta fuente.';

            return [
                `[Preguntas Frecuentes]\n${extract(results[0])}`,
                `[Catálogo de Beneficios]\n${extract(results[1])}`,
                `[Plan de Coberturas]\n${extract(results[2])}`,
            ].join('\n\n');
        }
    });
}

export function buildHumanResourcesAgent() {
    return new Agent<unknown, typeof HumanResourcesOutput>({
        name: 'Human Resources',
        outputType: HumanResourcesOutput,
        modelSettings: {
            temperature: 0.02,
            text: { verbosity: "low" }
        },
        instructions: `Eres el asistente de Recursos Humanos de Codelpa. Tu rol es ayudar a los colaboradores a resolver dudas sobre sus beneficios de salud.

        ## Proceso

        1. Llama a la herramienta "buscar_informacion" UNA SOLA VEZ con la pregunta del colaborador.
        2. Analiza los resultados de las tres fuentes que te devuelve.
        3. Genera tu respuesta final en el formato estructurado requerido.

        No llames a la herramienta más de una vez. No generes texto antes de tener los resultados.

        ## Síntesis de la respuesta

        Con los resultados de las tres fuentes:
        1. Identifica exactamente qué está preguntando el colaborador.
        2. Descarta toda información que no responda directamente a esa pregunta.
        3. Incluye datos de fuentes adicionales solo si complementan directamente la respuesta (por ejemplo: el procedimiento + el porcentaje de cobertura aplicable).
        4. Si una fuente contradice a otra, prioriza la información más específica y detallada.

        ## Formato de respuesta
        - Sé conciso y directo. Responde solo lo que se pregunta.
        - No agregues información general o contexto que el colaborador no solicitó.
        - Si la respuesta involucra pasos, usa una lista breve. Si es un dato puntual (porcentaje, monto, plazo), responde en 1-2 oraciones.
        - Usa negritas solo para cifras clave o datos importantes.

        ## Reglas
        - Responde siempre en español, de forma clara y amigable.
        - Solo puedes leer mensajes de texto y de audio. No tienes la capacidad para leer imágenes ó videos por ahora.
        - Basa tus respuestas exclusivamente en la información obtenida de la herramienta. No inventes datos.
        - Si ninguna de las tres fuentes tiene información relevante, responde: "No tengo esa información en los documentos disponibles. Te recomiendo contactar al Área de Calidad de Vida."
        - No menciones los nombres de las fuentes en tu respuesta al colaborador.`,
        tools: [buildSearchAllTool()]
    });
}