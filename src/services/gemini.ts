import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn('VITE_GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.');
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendMessageToGemini(
  messages: ChatMessage[]
): Promise<string> {
  if (!genAI) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.');
  }

  try {
    // 지원되는 최신 모델 사용 (콘솔에 나온 목록 중 하나 선택)
    // gemini-pro-latest, gemini-2.0-flash-lite 등 사용 가능
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-latest' });

    // 대화 히스토리를 Gemini 형식으로 변환
    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

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
    
    // 더 자세한 에러 메시지 제공
    if (error.message?.includes('API_KEY')) {
      throw new Error('API 키가 유효하지 않습니다. .env 파일의 VITE_GEMINI_API_KEY를 확인해주세요.');
    } else if (error.message?.includes('quota') || error.message?.includes('429')) {
      throw new Error('API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.');
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
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-latest' });
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
    return "";
  }
}

