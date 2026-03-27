import { assistant, user } from "@openai/agents";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runner } from "@/libs/runner";
import { transcribe_audio } from "@/libs/openai";
import { getHistory, saveMessage, updateHistory } from "@/libs/supabase";
import { buildHealthInsuranceAgent } from "@/agents/health-insurance";

const AgentRequest = z.object({
    message_id: z.string().min(1),
    message: z.string().optional().default(""),
    type: z.enum(['text', 'audio']),
    conversation_id: z.string().min(1),
    audio_base64_uri: z.string().optional().default("")
}).refine(
    (data) => data.type !== 'text' || (data.message !== undefined && data.message.length > 0),
    { message: 'message es requerido cuando type es text', path: ['message'] }
);

export async function POST(request: NextRequest) {

    try {

        const body = await request.json();
        console.log("CODELPA-AGENT-API - body", body);
        const parsed = AgentRequest.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Payload inválido', details: z.treeifyError(parsed.error) }, { status: 400 });
        }

        let { message_id, message, conversation_id, type, audio_base64_uri } = parsed.data;
        console.log('CODELPA-AGENT-API - message_id', message_id);
        console.log('CODELPA-AGENT-API - message', message);
        console.log('CODELPA-AGENT-API - conversation_id', conversation_id);
        console.log('CODELPA-AGENT-API - type', type);
        console.log('CODELPA-AGENT-API - audio_base64_uri', audio_base64_uri.slice(0, 80) + "…");

        // Transcribe audio if needed
        if (type === 'audio' && audio_base64_uri) {
            const audio_text = await transcribe_audio(audio_base64_uri);
            console.log('CODELPA-AGENT-API - audio_text', audio_text);
            message = audio_text;
        }

        // Save user message to database without waiting for the response
        saveMessage(conversation_id, 'user', type, message, message_id);

        // Get history from database
        const history = await getHistory(conversation_id);
        console.log('CODELPA-AGENT-API - current history', history.length());
        history.add(user(message));
        console.log('CODELPA-AGENT-API - new history', history.length());

        // Build agent
        const agent = buildHealthInsuranceAgent();

        // Run agent
        // maxTurns: 3 — Limita el runner loop a 3 iteraciones máximo (turno 1: tool call, turno 2: respuesta estructurada, +1 de margen). 
        // Sin esto, si el modelo no producía el structured output, el loop podía continuar indefinidamente.
        const result = await runner.run(agent, history.toArray(), { maxTurns: 3 });
        if (!result.finalOutput) {
            return NextResponse.json({ error: 'Sin salida del agente' }, { status: 422 });
        }

        // Get answer from final output
        console.log('CODELPA-AGENT-API - finalOutput', result.finalOutput);
        const answer = result.finalOutput.answer;
        
        // Update history in database
        console.log('CODELPA-AGENT-API - current history', history.length());
        history.add(assistant(answer));
        console.log('CODELPA-AGENT-API - new history', history.length());
        await updateHistory(conversation_id, history);
        console.log('CODELPA-AGENT-API - updated history', history.length());

        // Save assistant message to database without waiting for the response
        saveMessage(conversation_id, 'assistant', "text", answer, message_id);

        return NextResponse.json({ answer: answer });

    } catch (error) {
        console.error("CODELPA-AGENT-API - error", error);
        return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
    }
}