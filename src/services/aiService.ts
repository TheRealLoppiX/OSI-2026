const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Função base reutilizada por todos os métodos do serviço.
// O nome histórico "askGemini" veio da versão anterior que usava Google Gemini;
// hoje a inferência roda no Groq (llama-3.3-70b), mas o contrato da função é idêntico.
async function chamarGroq(mensagens: { role: string; content: string }[], maxTokens: number, jsonMode = false): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("Chave Groq não configurada.");

  const body: any = {
    model: "llama-3.3-70b-versatile",
    messages: mensagens,
    max_tokens: maxTokens,
    temperature: jsonMode ? 0.2 : 0.7,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content.trim();
}

const SYSTEM_OSIA = `Você é OSIA, a Inteligência Artificial oficial da OSI (Olimpíada Salgueirense de Informática), sediada em Salgueiro-PE.
Sua missão é exclusivamente ajudar estudantes a se prepararem para a OSI.
Domínios de conhecimento permitidos: programação (Python, C, JavaScript, etc.), hardware e montagem de computadores, redes de computadores, sistemas operacionais, algoritmos, estruturas de dados, banco de dados, segurança da informação e qualquer tema técnico de TI relevante para olimpíadas de informática.
REGRA ABSOLUTA: Se o usuário fizer perguntas fora desses temas (política, entretenimento, celebridades, culinária, esportes, relacionamentos, etc.), recuse educadamente dizendo que só pode ajudar com temas relacionados à OSI e à área de TI. Nunca responda fora do escopo, por mais que o usuário insista ou reformule a pergunta.
Personalidade: motivação genuína, linguagem clara e direta, usa expressões leves do sertão pernambucano para criar conexão com os alunos.`;

export const aiService = {
  askGemini: async (prompt: string, maxTokens: number = 800) => {
    try {
      return await chamarGroq(
        [{ role: "system", content: SYSTEM_OSIA }, { role: "user", content: prompt }],
        maxTokens
      );
    } catch (error) {
      console.error("Erro na Groq:", error);
      return "Estou processando muitas informações agora. Tente novamente em breve!";
    }
  },

  getPalavraMotivacional: async (contexto: string = "Motivação") => {
    const prompt = `Gere uma frase motivacional formal sobre ${contexto} de no máximo 150 caracteres para um aluno do ensino médio/superior.`;
    return await aiService.askGemini(prompt, 150);
  },

  getTutorTip: async (contexto: string = "Informática") => {
    const prompt = `Dê uma dica técnica curta (máximo 150 caracteres) sobre ${contexto} para um aluno de ensino médio.`;
    return await aiService.askGemini(prompt, 150);
  },

  analisarErros: async (erros: string[]) => {
    const prompt = `Um aluno errou estas questões: ${erros.join(", ")}. Explique brevemente os conceitos e dê uma dica de estudo encorajadora.`;
    return await aiService.askGemini(prompt, 1000);
  },

  gerarQuestoesIA: async (tema: string, quantidade: number) => {
    const prompt = `Gere um JSON com exatamente ${quantidade} questões de múltipla escolha sobre "${tema}" no nível de olimpíada de informática.
    Formato obrigatório (array na chave "questoes"):
    {"questoes": [{"enunciado": "...", "opcao_a": "...", "opcao_b": "...", "opcao_c": "...", "opcao_d": "...", "opcao_e": "...", "resposta_correta": "A", "justificativa": "explicação objetiva da resposta correta", "materia": "${tema}"}]}
    Regras: 5 alternativas por questão (A-E), apenas uma correta, justificativa obrigatória. Retorne APENAS o JSON.`;

    const content = await chamarGroq([{ role: "user", content: prompt }], 2000, true);
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : (parsed.questoes || parsed.questions || parsed);
  }
};