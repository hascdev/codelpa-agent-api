import { AgentInputItem } from '@openai/agents';
import { createClient } from '@supabase/supabase-js';
import { BoundedList } from '@/libs/bounded-list';

// Función helper para crear el cliente de Supabase
const getSupabaseClient = () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas');
    }

    return createClient(supabaseUrl, supabaseKey);
};

// Configuración del tamaño máximo del historial
const MAX_HISTORY_SIZE = 10;

export const updateHistory = async (conversation_id: string, history: BoundedList<AgentInputItem>) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('codelpa_agt_histories').upsert({ 
        conversation_id: conversation_id, 
        history: history.toJSON(), // Convertir a array para almacenar en Supabase
        updated_at: new Date().toISOString() }, { onConflict: 'conversation_id' });
    if (error) {
        console.error('Error updating codelpa agent history', error);
        return null;
    }
    return data;
}

export const getHistory = async (conversation_id: string) : Promise<BoundedList<AgentInputItem>> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('codelpa_agt_histories').select('history').eq('conversation_id', conversation_id).maybeSingle();
    if (error) {
        console.error('Error getting codelpa agent history', error);
        return new BoundedList<AgentInputItem>(MAX_HISTORY_SIZE);
    }
    if (data && data.history && Array.isArray(data.history)) {
        return BoundedList.fromJSON<AgentInputItem>(data.history, MAX_HISTORY_SIZE);
    }
    return new BoundedList<AgentInputItem>(MAX_HISTORY_SIZE);
}

export const saveMessage = async (conversation_id: string, role: string, type: string, content: string) : Promise<any> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('codelpa_agt_messages').insert({
        conversation_id: conversation_id,
        role: role,
        type: type,
        content: content
    });
    if (error) {
        console.error('Error saving codelpa agent message', error);
        return null;
    }
    console.log('Codelpa agent message saved', data);
    return data;
}