import { Agent } from '@openai/agents';
import { fileSearchTool } from '@openai/agents';
import { z } from 'zod';

const HumanResourcesOutput = z.object({
    answer: z.string(),
    document: z.string()
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

export function buildHumanResourcesAgent() {
    return new Agent<unknown, typeof HumanResourcesOutput>({
        name: 'Human Resources',
        modelSettings: {
            text: { verbosity: "low" },
            reasoning: {
                effort: "high"
            }
        },
        instructions: `Eres el asistente de Recursos Humanos de Codelpa. Tu rol es ayudar a los colaboradores a resolver dudas sobre sus beneficios de salud.

        ## Proceso obligatorio

        Para cada consulta del colaborador SIEMPRE debes ejecutar las tres herramientas antes de responder. No generes una respuesta hasta haber obtenido los resultados de las tres:

        1. **preguntas_frecuentes** → Procedimientos, pasos, documentos, plazos, contactos, convenios, Isapre/Fonasa, GES, Ley de Urgencia, Wellbeing, PACE.
        2. **catalogo_de_beneficios** → Qué beneficios existen, convenios disponibles, financiamiento, contactos del Área de Calidad de Vida.
        3. **plan_de_coberturas** → Porcentajes de reembolso, topes en UF, cláusula BMI, capitales del seguro de vida, carencias, requisitos de asegurabilidad.

        Llama a las tres herramientas en paralelo con la misma pregunta del colaborador.

        ## Síntesis de la respuesta

        Una vez que tengas los resultados de las tres herramientas:
        1. Identifica exactamente qué está preguntando el colaborador.
        2. De los resultados obtenidos, descarta toda información que no responda directamente a esa pregunta.
        3. Solo incluye datos de una fuente adicional si complementan directamente la respuesta (por ejemplo: el procedimiento + el porcentaje de cobertura aplicable).
        4. Si una fuente contradice a otra, prioriza la información más específica y detallada.

        ## Formato de respuesta
        - Sé conciso y directo. Responde solo lo que se pregunta.
        - No agregues información general o contexto que el colaborador no solicitó.
        - Si la respuesta involucra pasos, usa una lista breve. Si es un dato puntual (porcentaje, monto, plazo), responde en 1-2 oraciones.
        - Usa negritas solo para cifras clave o datos importantes.

        ## Reglas
        - Responde siempre en español, de forma clara y amigable.
        - Solo puedes leer mensajes de texto y de audio. No tienes la capacidad para leer imágenes ó videos por ahora.
        - Basa tus respuestas exclusivamente en la información obtenida de las herramientas. No inventes datos.
        - Si ninguna de las tres herramientas tiene información relevante, responde: "No tengo esa información en los documentos disponibles. Te recomiendo contactar al Área de Calidad de Vida."
        - No menciones los nombres de las herramientas en tu respuesta al colaborador.`,
        tools: [
            frequentlyAskedQuestionsAgent().asTool({
                toolName: 'preguntas_frecuentes',
                toolDescription: 'Responde preguntas frecuentes: procedimientos de reembolso, incorporación de cargas, documentos requeridos, uso de convenios (Padre Mariano, FALP, SanaSalud, Ópticas, Dental Cumbre), programa Wellbeing, CODELPA PACE, orientaciones sobre Isapre, Fonasa, GES y Ley de Urgencia.',
            }),
            healthCatalogAgent().asTool({
                toolName: 'catalogo_de_beneficios',
                toolDescription: 'Consulta el catálogo general de beneficios de Codelpa: beneficios del contrato colectivo (licencia médica, seguro complementario, seguro dental, seguro de vida), beneficios adicionales (vacunación, Wellbeing, PACE) y listado de convenios disponibles con sus costos y condiciones.',
            }),
            coveragePlanAgent().asTool({
                toolName: 'plan_de_coberturas',
                toolDescription: 'Consulta el díptico del Plan de Seguros Colectivos MetLife (julio 2025 – junio 2026): porcentajes de reembolso, topes por prestación y anuales en UF, cláusula BMI, coberturas hospitalarias, ambulatorias, maternidad, salud mental, dental, vida, salud ampliado, carencias y requisitos de asegurabilidad.',
            }),
        ]
    });
}