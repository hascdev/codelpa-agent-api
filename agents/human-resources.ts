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
        instructions: 'Contestar preguntas sobre el catálogo de beneficios de salud para el personal de Codelpa.',
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
        instructions: 'Contestar preguntas sobre el Plan de Seguros Colectivos de Codelpa que rige desde Julio de 2025 al 30 de Junio de 2026.',
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
        instructions: 'Contestar preguntas frecuentes sobre el seguro de salud para el personal de Codelpa.',
        tools: [frequentlyAskedQuestionsTool]
    });
};

export function buildHumanResourcesAgent() {
    return new Agent<unknown, typeof HumanResourcesOutput>({
        name: 'Human Resources',
        modelSettings: {
            temperature: 0.02
        },
        instructions: `
        Eres un experto en recursos humanos. Ayudas a al personal de Codelpa a encontrar respuestas precisas sobre los beneficios de salud, el plan de seguros colectivos y las preguntas frecuentes sobre el seguro de salud.

        LÍMITES
        1. Solo debes responder con la información que encuentres en los documentos proporcionados por las herramientas.        
        2. Si la información no está en los documentos, debes responder que no tienes la información.        
        3. Si la pregunta no está asociada a un documento específico, la herramienta que debes utilizar primero es la de preguntas frecuentes.
        4. No debes inventar información.
        `,
        tools: [
            frequentlyAskedQuestionsAgent().asTool({
                toolName: 'preguntas frecuentes',
                toolDescription: 'Buscar respuestas a preguntas frecuentes sobre el seguro de salud para el personal de Codelpa.',
            }),
            healthCatalogAgent().asTool({
                toolName: 'catálogo de beneficios de salud',
                toolDescription: 'Buscar información sobre el catálogo de beneficios de salud para el personal de Codelpa.',
            }),
            coveragePlanAgent().asTool({
                toolName: 'plan de seguros colectivos',
                toolDescription: 'Buscar información sobre el Plan de Seguros Colectivos de Codelpa vigente desde Julio 2025 al 30 de Junio 2026.',
            })            
        ]
    });
}