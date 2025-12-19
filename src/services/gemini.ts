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
  "google/gemini-2.0-flash-exp:free", // Vision 지원 및 고성능 (이미지 처리를 위해 우선순위 상향 또는 Fallback)
  "deepseek/deepseek-chat", // DeepSeek V3 (유료, 고성능, 텍스트 전용)
];

// 사용 가능한 모델 목록 (UI에서 선택 가능)
export const AVAILABLE_MODELS = [
  { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash", provider: "Google", free: true },
  { id: "deepseek/deepseek-chat", name: "DeepSeek V3", provider: "DeepSeek", free: false },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic", free: false },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", free: false },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", free: false },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", provider: "Meta", free: false },
  { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B", provider: "Alibaba", free: false },
];

// 선택된 모델 저장/불러오기
let selectedModel = localStorage.getItem('selectedModel') || MODELS[0];

export function getSelectedModel(): string {
  return selectedModel;
}

export function setSelectedModel(modelId: string): void {
  selectedModel = modelId;
  localStorage.setItem('selectedModel', modelId);
}

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
  images?: string[]; // 이미지 데이터 (Base64) 추가
}

// 2. Fallback Wrapper Function
// API 호출을 감싸서 실패 시 다음 모델로 자동 재시도하는 함수
async function createCompletionWithFallback(messages: any[], hasImages: boolean = false): Promise<string> {
  if (!API_KEY) throw new Error('OpenRouter API Key Missing');

  let lastError: any = null;

  // 이미지가 있으면 Gemini 모델만 사용 (DeepSeek은 비전 미지원일 수 있음)
  const targetModels = hasImages
    ? MODELS.filter(m => m.includes('gemini') || m.includes('vision'))
    : MODELS;

  for (const model of targetModels) {
    try {
      console.log(`🤖 AI 요청 시도: ${model} (이미지 포함: ${hasImages})`); // 현재 시도 중인 모델 로그

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
당신은 OETERNAL의 AI 파트너입니다. 사용자의 성장을 돕는 지식 안내자입니다.
사용자의 언어: ${nativeLang}

## 핵심 철학: 레드룸 (Red Room)
- 사용자가 "모르겠다", "어렵다", "이해가 안 된다" 등의 표현을 하면, 해당 개념/단어를 **레드룸에 저장**할 것을 부드럽게 제안하세요.
- 레드룸에 저장된 모든 것은 **개인적 유산(Personal Stack)**으로 영구 보존됩니다. 절대 사라지지 않습니다.
- 사용자가 자신의 '모름'을 인식하고 기록하는 행위 자체가 가장 가치 있는 성장의 시작점임을 강조하세요.

## 대화 규칙
1. 사용자의 질문에 정확하고 상세하게 답변하세요.
2. 복잡한 개념은 쉽게 설명하고, 필요하면 예시를 들어주세요.
3. 사용자가 모르는 단어나 개념이 나오면: "이 개념을 레드룸에 저장해두시면, 나중에 다시 학습할 수 있습니다."라고 안내하세요.
4. 부정적 키워드(모르겠다, 어렵다, 헷갈린다 등)를 감지하면 공감 후 레드룸 저장을 제안하세요.
5. 이미지가 제공된 경우, 해당 이미지에 대해 분석하고 설명해주세요.
6. 항상 따뜻하고 격려하는 태도를 유지하세요. 사용자가 자기 자신을 관찰하고 메모하는 행위에 높은 가치를 부여하세요.

## 레드룸 저장 제안 예시
- "이 개념이 어려우시다면, 레드룸에 저장해두세요. 당신만의 지식 자산으로 영원히 남습니다."
- "모르는 것을 발견하셨군요! 이것이 바로 성장의 시작점입니다. 레드룸에 기록해두시겠어요?"
`;

  // 메시지 포맷 변환 (멀티모달 지원)
  const formattedMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map(msg => {
      // 이미지가 있는 경우 (OpenAI Vision API 포맷)
      if (msg.images && msg.images.length > 0) {
        return {
          role: msg.role === 'user' ? "user" as const : "assistant" as const,
          content: [
            { type: "text", text: msg.content || "이 이미지에 대해 설명해줘." },
            ...msg.images.map(img => ({
              type: "image_url",
              image_url: { url: img }
            }))
          ]
        };
      }
      // 텍스트만 있는 경우
      return {
        role: msg.role === 'user' ? "user" as const : "assistant" as const,
        content: msg.content
      };
    })
  ];

  const hasImages = messages.some(m => m.images && m.images.length > 0);
  return await createCompletionWithFallback(formattedMessages, hasImages);
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
