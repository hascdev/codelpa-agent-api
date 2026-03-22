// libs/openai.ts
import { setDefaultOpenAIKey, setOpenAIAPI } from '@openai/agents';
import OpenAI from "openai";
import fs from "fs";

// Read the API key from environment; also you could inject it in runtime
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada');
}
setDefaultOpenAIKey(process.env.OPENAI_API_KEY); // sk-...
setOpenAIAPI('responses'); // explicit (it's the default of the SDK)

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * @description Recibe audio en Base64 (con o sin data-URI), lo guarda en /tmp y lo transcribe con gpt-4o-transcribe.
 * @param audio_base64_uri 
 * @returns 
 */
export const transcribe_audio = async (audio_base64_uri: string): Promise<string> => {
    
    // 1. Separar encabezado y extraer extensión
    let b64data: string;
    let ext: string;

    if (audio_base64_uri.startsWith("data:")) {
        const commaIndex = audio_base64_uri.indexOf(",");
        if (commaIndex === -1) throw new Error("Data URI malformado: falta coma separadora");

        const header = audio_base64_uri.substring(0, commaIndex);
        b64data = audio_base64_uri.substring(commaIndex + 1);

        const mime_match = header.match(/^data:([^;]+);base64$/);
        const mime_type = mime_match?.[1] ?? null;
        ext = mime_type?.split("/")[1] ?? "mp3";
    } else {
        b64data = audio_base64_uri;
        ext = "mp3";
    }

    if (!b64data) throw new Error("No se encontró contenido base64 en el audio");

    // 2. Decodificar Base64 → bytes
    const audio_bytes = Buffer.from(b64data, "base64");

    // 3. Escribir en /tmp con nombre único
    const file_path = `/tmp/${crypto.randomUUID()}.${ext}`;
    fs.writeFileSync(file_path, audio_bytes);

    // 4. Transcribir con cleanup garantizado en finally
    try {
        const response = await client.audio.transcriptions.create({
            file: fs.createReadStream(file_path),
            model: "gpt-4o-transcribe",
        });

        return response.text;
    } finally {
        // 5. Limpiar siempre, incluso si hay error
        try {
            fs.unlinkSync(file_path);
        } catch {
            console.warn(`No se pudo eliminar archivo temporal: ${file_path}`);
        }
    }
};