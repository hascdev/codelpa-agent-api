// libs/openai.ts
import { setDefaultOpenAIKey, setOpenAIAPI } from '@openai/agents';

// Read the API key from environment; also you could inject it in runtime
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada');
}
setDefaultOpenAIKey(process.env.OPENAI_API_KEY); // sk-...
setOpenAIAPI('responses'); // explicit (it's the default of the SDK)
