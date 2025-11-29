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

