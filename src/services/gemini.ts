import { GoogleGenerativeAI } from '@google/generative-ai';

// 환경 변수에서 API 키 가져오기 (앞뒤 공백 및 따옴표 제거)
const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) return '';

  // 문자열로 변환하고 앞뒤 공백 제거
  let cleaned = String(key).trim();

  // 따옴표 제거 (단일 따옴표, 이중 따옴표 모두)
  cleaned = cleaned.replace(/^["']+|["']+$/g, '');

  // 다시 공백 제거 (따옴표 제거 후 생긴 공백)
  cleaned = cleaned.trim();

  return cleaned;
};

const API_KEY = getApiKey();

if (!API_KEY) {
  console.error('⚠️ VITE_GEMINI_API_KEY가 설정되지 않았습니다.');
  console.error('📝 .env 파일에 VITE_GEMINI_API_KEY=여기에_API_키_입력 형식으로 설정해주세요.');
  console.error('🔄 개발 서버를 재시작했는지 확인해주세요. (npm run dev)');
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// 사용 가능한 모델 목록 확인 함수
export async function listAvailableModels() {
  if (!genAI || !API_KEY) {
    console.error('API 키가 설정되지 않아 모델 목록을 가져올 수 없습니다.');
    return;
  }

  try {
    // REST API를 통해 모델 목록 가져오기
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();

    if (data.models) {
      console.log('📋 사용 가능한 모델 목록:');
      data.models.forEach((model: any) => {
        console.log(`  - ${model.name} (지원 메서드: ${model.supportedGenerationMethods?.join(', ') || 'N/A'})`);
      });

      // generateContent를 지원하는 모델만 필터링
      const supportedModels = data.models.filter((model: any) =>
        model.supportedGenerationMethods?.includes('generateContent')
      );

      console.log('\n✅ generateContent를 지원하는 모델:');
      supportedModels.forEach((model: any) => {
        const modelName = model.name.replace('models/', '');
        console.log(`  - ${modelName}`);
      });

      return supportedModels.map((model: any) => model.name.replace('models/', ''));
    }
  } catch (error: any) {
    console.error('모델 목록 가져오기 실패:', error);
  }
}

// 디버깅용: API 키가 로드되었는지 확인 (처음 10자만 표시)
if (API_KEY) {
  console.log('✅ Gemini API 키가 로드되었습니다:', API_KEY.substring(0, 10) + '...');
  console.log('🔍 API 키 길이:', API_KEY.length);
  console.log('🔍 API 키 시작 문자:', API_KEY.charAt(0));
  console.log('🔍 API 키 끝 문자:', API_KEY.charAt(API_KEY.length - 1));

  // 앱 시작 시 사용 가능한 모델 목록 확인
  if (typeof window !== 'undefined') {
    listAvailableModels().catch(console.error);
  }
} else {
  console.error('❌ Gemini API 키를 로드할 수 없습니다.');
  console.error('🔍 원본 값:', import.meta.env.VITE_GEMINI_API_KEY);
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendMessageToGemini(
  messages: ChatMessage[],
  nativeLang: string = "ko",
  targetLang: string = "en"
): Promise<string> {
  if (!genAI || !API_KEY) {
    const errorMsg = 'Gemini API 키가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY를 설정하고 개발 서버를 재시작해주세요.';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }

  try {
    // 할당량이 더 여유로운 Flash 모델 사용 (일반 채팅용)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    // 시스템 프롬프트 구성
    const systemPrompt = `
당신은 언어 학습 파트너입니다.
사용자의 모국어: ${nativeLang}
사용자가 학습 중인 언어: ${targetLang}

규칙:
1. **절대로 슬래시('/') 문자를 사용하지 마십시오. 단어의 품사 구분 등 필요한 경우에도 슬래시 대신 괄호나 쉼표를 사용하십시오.**
2. 당신은 사용자의 모국어(${nativeLang})로 자연스럽게 대화해야 합니다.
3. 당신의 답변에 포함된 모든 문장 또는 핵심 문장에 대해, 반드시 학습 언어(${targetLang})로 번역된 문장을 한 줄씩 덧붙여주세요.
4. 번역된 문장은 클릭 가능한 학습 재료가 되므로, 명확하게 구분되어야 합니다.
5. 형식 예시:
   [모국어 문장]
   [학습 언어 번역 문장]
   
   (예시: 한국어 -> 영어 학습 시)
   안녕하세요! 오늘 기분은 어떠신가요?
   Hello! How are you feeling today?
   
   저는 당신의 AI 친구입니다.
   I am your AI friend.

5. 항상 친절하고 격려하는 태도를 유지하세요.
`;

    // 대화 히스토리를 Gemini 형식으로 변환 (시스템 프롬프트 포함)
    const history = [
      {
        role: 'user',
        parts: [{ text: systemPrompt + "\n\n이제 대화를 시작합니다." }]
      },
      {
        role: 'model',
        parts: [{ text: `알겠습니다. ${nativeLang}로 대화하며 ${targetLang} 번역을 함께 제공하겠습니다.` }]
      },
      ...messages.slice(0, -1).map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }))
    ];

    const currentMessage = messages[messages.length - 1].content;

    // 채팅 시작
    const chat = model.startChat({
      history: history,
    });

    // 메시지 전송 및 응답 받기
    const result = await chat.sendMessage(currentMessage);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error: any) {
    console.error('Gemini API 오류:', error);
    console.error('에러 상세:', error.message || error);
    console.error('에러 전체:', JSON.stringify(error, null, 2));

    // 더 자세한 에러 메시지 제공
    if (error.message?.includes('API_KEY') || error.message?.includes('401')) {
      throw new Error('API 키가 유효하지 않습니다. .env 파일의 VITE_GEMINI_API_KEY를 확인해주세요.');
    } else if (error.message?.includes('quota') || error.message?.includes('429') || error.status === 429) {
      // 할당량 초과 에러 - 더 자세한 정보 제공
      const retryAfter = error.response?.data?.error?.details?.[0]?.retryInfo?.retryDelay || '33';
      const quotaLimit = error.response?.data?.error?.details?.[0]?.quotaFailure?.violations?.[0]?.quotaValue || '50';
      throw new Error(
        `API 할당량을 초과했습니다. (무료 티어 한도: ${quotaLimit}회)\n` +
        `${retryAfter}초 후에 다시 시도해주세요.\n` +
        `또는 Google AI Studio에서 할당량을 확인해주세요.`
      );
    } else if (error.message?.includes('404') || error.message?.includes('not found')) {
      throw new Error(`모델을 찾을 수 없습니다. API 키와 모델 이름을 확인해주세요. 에러: ${error.message}`);
    } else {
      throw new Error(`AI 응답 오류: ${error.message || '알 수 없는 오류가 발생했습니다.'}`);
    }
  }
}

// 단어의 한글 뜻을 가져오는 함수
export async function getKoreanMeaning(word: string): Promise<string> {
  if (!genAI) {
    console.warn('Gemini API가 초기화되지 않았습니다.');
    return "";
  }

  try {
    // 할당량이 더 여유로운 Flash 모델 사용 (일반 채팅용)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `다음 영어 단어의 한글 뜻을 한 단어 또는 짧은 구로만 답변해주세요. 다른 설명 없이 뜻만 답변하세요: "${word}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // 답변에서 한글 뜻만 추출 (불필요한 설명 제거)
    let meaning = text.split('\n')[0].trim();

    // 따옴표나 특수문자 제거
    meaning = meaning.replace(/^["']|["']$/g, '').trim();

    // 빈 문자열이거나 너무 긴 경우 재시도
    if (!meaning || meaning.length > 50) {
      console.warn(`의심스러운 번역 결과: "${meaning}"`);
      // 간단한 재시도
      const retryResult = await model.generateContent(`"${word}"의 한글 뜻만 답변:`);
      const retryResponse = await retryResult.response;
      meaning = retryResponse.text().trim().split('\n')[0].replace(/^["']|["']$/g, '').trim();
    }

    return meaning || "";
  } catch (error: any) {
    console.error(`단어 "${word}"의 한글 뜻 가져오기 실패:`, error);
    console.error('에러 상세:', error.message || error);

    // 할당량 초과 에러인 경우 명확한 메시지와 함께 에러를 다시 throw
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
      const quotaError = new Error('API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.');
      (quotaError as any).status = 429;
      throw quotaError;
    }

    return "";
  }
}

// 단어의 맞춤 학습 전략을 생성하는 함수
export async function generateStudyTips(
  wordText: string,
  status: "red" | "yellow" | "green" | "white"
): Promise<string> {
  if (!genAI) {
    throw new Error('Gemini API가 초기화되지 않았습니다.');
  }

  try {
    // 할당량이 더 여유로운 Flash 모델 사용 (일반 채팅용)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const statusDescriptions = {
      red: "모르는 단어 (처음 접하는 단어)",
      yellow: "학습 중인 단어 (어느 정도 알고 있지만 완전히 마스터하지 못한 단어)",
      green: "마스터한 단어 (완전히 익힌 단어)",
      white: "미분류 단어 (아직 학습 상태가 정해지지 않은 단어)",
    };

    const prompt = `나는 현재 영단어 "${wordText}"를 ${statusDescriptions[status]} 상태로 분류했습니다. 

이 단어를 가장 효과적으로 학습하고 마스터할 수 있는 3가지 맞춤 학습 전략을 한국어로 제시해 주세요. 각 전략은 구체적이고 실용적이어야 하며, 번호를 매겨서 명확하게 구분해주세요.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    return text;
  } catch (error: any) {
    console.error('학습 전략 생성 실패:', error);
    throw new Error(`학습 전략 생성 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
  }
}

// AI 맞춤 학습 전략 생성 함수 (새로운 버전)
export async function generatePersonalizedTips(
  wordText: string,
  status: "red" | "yellow" | "green",
  contextSentence: string = ""
): Promise<string> {
  if (!genAI) {
    throw new Error('Gemini API가 초기화되지 않았습니다.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `토익 학습을 위한 개인 코치입니다. 단어 '${wordText}'를 '${status}' 상태에 두고 있습니다. 이 단어를 마스터하기 위한 **실용적인 학습 전략 3가지**를 간결한 Markdown 목록 형태로 제시해주세요.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    return text;
  } catch (error: any) {
    console.error('AI 맞춤 전략 생성 실패:', error);
    throw new Error(`전략 생성 중 오류가 발생했습니다: ${error.message}`);
  }
}

export async function generateText(prompt: string): Promise<string> {
  if (!genAI) {
    throw new Error('Gemini API가 초기화되지 않았습니다.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error: any) {
    console.error('텍스트 생성 실패:', error);
    throw new Error(`텍스트 생성 중 오류가 발생했습니다: ${error.message}`);
  }
}
