import OpenAI from "openai";

// 환경 변수에서 API 키 가져오기
const getApiKey = () => {
  const key = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!key) return '';
  return String(key).trim().replace(/^["']+|["']+$/g, '');
};

const API_KEY = getApiKey();

if (!API_KEY) {
  console.error('⚠️ VITE_OPENROUTER_API_KEY가 설정되지 않았습니다.');
}

// 1. 모델 우선순위 리스트 정의
// 사용자의 요청으로 무료 모델을 모두 제거하고 DeepSeek V3만 사용
const MODELS = [
  "deepseek/deepseek-chat", // DeepSeek V3 (유료, 고성능)
];

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true,
  defaultHeaders: {
    "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000",
    "X-Title": "Signal Voca",
  }
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 2. Fallback Wrapper Function
// API 호출을 감싸서 실패 시 다음 모델로 자동 재시도하는 함수
async function createCompletionWithFallback(messages: any[]): Promise<string> {
  if (!API_KEY) throw new Error('OpenRouter API Key Missing');

  let lastError: any = null;

  for (const model of MODELS) {
    try {
      console.log(`🤖 AI 요청 시도: ${model}`); // 현재 시도 중인 모델 로그

      const completion = await openai.chat.completions.create({
        model: model,
        messages: messages,
      });

      const result = completion.choices[0].message.content || "";
      console.log(`✅ AI 응답 성공: ${model}`);
      return result;

    } catch (error: any) {
      console.warn(`⚠️ 모델 실패 (${model}):`, error.message);
      lastError = error;

      // 재시도 전 1초 대기 (서버 부하 방지 및 Rate Limit 완화)
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }
  }

  // 모든 모델이 실패한 경우
  console.error("❌ 모든 모델이 응답하지 않습니다.");
  throw new Error(`AI Service Unavailable: ${lastError?.message || 'All models failed'}`);
}


// --- Exported Functions (Using Fallback) ---

export async function sendMessageToGemini(
  messages: ChatMessage[],
  nativeLang: string = "ko",
  targetLang: string = "en"
): Promise<string> {
  const systemPrompt = `
당신은 언어 학습 파트너입니다.
사용자의 모국어: ${nativeLang}
사용자가 학습 중인 언어: ${targetLang}

규칙:
1. **절대로 슬래시('/') 문자를 사용하지 마십시오.** 품사 구분 등 필요한 경우 괄호나 쉼표를 사용하십시오.
2. 당신은 사용자의 모국어(${nativeLang})로 자연스럽게 대화해야 합니다.
3. 답변에 포함된 모든 핵심 문장에 대해, 반드시 학습 언어(${targetLang})로 번역된 문장을 한 줄씩 덧붙여주세요.
4. 번역된 문장은 클릭 가능한 학습 재료가 됩니다.
5. 항상 친절하고 격려하는 태도를 유지하세요.
`;

  const formattedMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.role === 'user' ? "user" as const : "assistant" as const,
      content: msg.content
    }))
  ];

  return await createCompletionWithFallback(formattedMessages);
}

export async function getKoreanMeaning(word: string): Promise<string> {
  const messages = [
    {
      role: "user" as const,
      content: `다음 단어(또는 구)의 한국어 뜻을 한 단어 또는 짧은 구로만 답변해주세요. 설명 없이 뜻만 작성하세요. 예: "Apple" -> "사과". 단어: "${word}"`
    }
  ];

  try {
    let meaning = await createCompletionWithFallback(messages);
    // Clean up quotes/newlines
    meaning = meaning.trim().split('\n')[0].replace(/^["']|["']$/g, '').trim();
    return meaning;
  } catch (error) {
    console.error(`Meaning fetch failed for ${word}`, error);
    throw error;
  }
}

export async function generateStudyTips(
  wordText: string,
  status: "red" | "yellow" | "green" | "white" | "orange"
): Promise<string> {
  const statusDescriptions = {
    red: "모르는 단어",
    yellow: "학습 중인 단어",
    green: "마스터한 단어",
    white: "미분류 단어",
    orange: "중요 단어",
  };

  const prompt = `단어 "${wordText}" (${statusDescriptions[status]})를 학습하기 위한 3가지 맞춤 전략을 한국어로 제시해 주세요. 번호를 매겨주세요.`;
  const messages = [{ role: "user" as const, content: prompt }];

  return await createCompletionWithFallback(messages);
}

export async function generatePersonalizedTips(
  wordText: string,
  status: "red" | "yellow" | "green",
  contextSentence: string = ""
): Promise<string> {
  const prompt = `단어 '${wordText}' (상태: ${status}) 마스터를 위한 실용적 학습 전략 3가지를 Markdown 목록으로 제시해 주세요.`;
  const messages = [{ role: "user" as const, content: prompt }];

  return await createCompletionWithFallback(messages);
}

export async function generateText(prompt: string): Promise<string> {
  const messages = [{ role: "user" as const, content: prompt }];
  return await createCompletionWithFallback(messages);
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  const langMap: Record<string, string> = {
    ko: "Korean",
    en: "English",
    ja: "Japanese",
    zh: "Chinese",
    es: "Spanish",
    fr: "French",
    hi: "Hindi"
  };
  const targetLangName = langMap[targetLang] || targetLang;

  const messages = [
    { role: "user" as const, content: `Translate the following text to ${targetLangName}. Only provide the translated text without explanations:\n\n"${text}"` }
  ];

  return await createCompletionWithFallback(messages);
}
