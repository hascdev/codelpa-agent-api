// src/lib/runner.ts
import { Runner } from '@openai/agents';

// Reusar este Runner en cada request, como recomienda la guía
export const runner = new Runner({
    // Puedes fijar un default model, p.ej. 'gpt-4.1' (el SDK lo usa por defecto si no especificas)
    model: 'gpt-4.1'
});
