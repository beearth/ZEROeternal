# Signal Voca (시그널 보카)

Google Gemini API를 활용한 문맥 기반 영어 단어 학습 플랫폼입니다.

**🌐 Live Demo:** [https://signal-voca-93bb9.web.app/](https://signal-voca-93bb9.web.app/)

사용자가 문장 속 단어를 탭하여 학습 상태(🔴/🟡/🟢)를 직관적으로 관리하고 스택을 쌓을 수 있습니다.

## 🚀 주요 기능

- **Gemini 기반 AI 채팅:** 자연스러운 한국어 대화와 영어 번역 제공

- **신호등 학습 시스템 (Signal Light System):**

  - 🔴 **Red Stack:** 모르는 단어 (수집)

  - 🟡 **Yellow Stack:** 학습 중인 단어

  - 🟢 **Green Stack:** 마스터한 단어

- **단어/문장 스태킹:** 클릭 한 번으로 나만의 단어장과 문장 저장소에 보관

- **직관적인 UI:** 구글 Gemini 스타일의 세련된 다크 모드 인터페이스

## 🛠 기술 스택 (Tech Stack)

- **Frontend:** React, TypeScript, Tailwind CSS

- **AI Model:** Google Gemini API (`gemini-pro-latest`)

- **Deployment:** Firebase

## 🏁 시작하기 (Getting Started)

1. 저장소를 클론합니다.

   ```bash
   git clone https://github.com/beearth/Signal-Voca.git
   ```

2. 의존성을 설치합니다.

   ```bash
   npm install
   ```

3. 환경 변수를 설정합니다.

   `.env` 파일을 생성하고 Gemini API 키를 추가하세요:

   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. 개발 서버를 실행합니다.

   ```bash
   npm run dev
   ```
