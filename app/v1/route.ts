import { AgentInputItem, RunState, user } from "@openai/agents";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BoundedList } from '@/libs/bounded-list';
import { buildHumanResourcesAgent } from "@/agents/human-resources";
import { runner } from "@/libs/runner";
import { transcribe_audio } from "@/libs/openai";


const AgentRequest = z.object({
    message: z.string().min(1),
    type: z.enum(['text', 'audio']),
    conversation_id: z.string().min(1),
    audio_base64_uri: z.string().optional().nullable()
});

const historyTemp = new Map<string, BoundedList<AgentInputItem>>();

export const MAX_HISTORY_SIZE = 10;

export const getHistory = async (conversation_id: string): Promise<BoundedList<AgentInputItem>> => {
    if (historyTemp.has(conversation_id)) {
        return historyTemp.get(conversation_id)!;
    }
    return new BoundedList<AgentInputItem>(MAX_HISTORY_SIZE);
}

export const updateHistory = async (conversation_id: string, history: BoundedList<AgentInputItem>) => {
    historyTemp.set(conversation_id, history);
}

export async function POST(request: NextRequest) {

    try {

        const body = await request.json();
        console.log("CODELPA-AGENT-API - body", body);
        const parsed = AgentRequest.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Payload inválido', details: z.treeifyError(parsed.error) }, { status: 400 });
        }

        let { message, conversation_id, type, audio_base64_uri } = parsed.data;

        if (type === 'audio' && audio_base64_uri) {
            const audio_text = await transcribe_audio(audio_base64_uri);
            console.log('CODELPA-AGENT-API - audio_text', audio_text);
            message = audio_text;
        }

        const agent = buildHumanResourcesAgent();
        const history = await getHistory(conversation_id);

        console.log('CODELPA-AGENT-API - current history', history.length());
        history.add(user(message));
        console.log('CODELPA-AGENT-API - new history', history.length());
        const result = await runner.run(agent, history.toArray());
        console.log('CODELPA-AGENT-API - result', result);
        console.log('CODELPA-AGENT-API - finalOutput', result.finalOutput);
        return NextResponse.json({ answer: result.finalOutput });

    } catch (error) {
        console.error("CODELPA-AGENT-API - error", error);
        return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
    }
}