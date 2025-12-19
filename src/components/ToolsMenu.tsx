import React, { useState, useRef, useEffect } from "react";
import { Video, FileText, Image, X, Loader2, Download, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ToolsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertContent?: (content: string) => void;
}

// OpenRouter API for document/creative writing
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';

// Image generation models (via OpenRouter)
const IMAGE_MODELS = [
  { id: "openai/dall-e-3", name: "DALL-E 3", provider: "OpenAI" },
  { id: "stabilityai/stable-diffusion-3", name: "Stable Diffusion 3", provider: "Stability AI" },
];

// Document models
const DOCUMENT_MODELS = [
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI" },
];

// Video models (placeholder - most require separate API)
const VIDEO_MODELS = [
  { id: "runway", name: "Runway Gen-3", provider: "Runway", available: false },
  { id: "pika", name: "Pika Labs", provider: "Pika", available: false },
];

export function ToolsMenu({ isOpen, onClose, onInsertContent }: ToolsMenuProps) {
  const [activeTab, setActiveTab] = useState<'image' | 'document' | 'video'>('image');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('프롬프트를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      if (activeTab === 'image') {
        // Image generation via OpenRouter
        const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Signal Voca',
          },
          body: JSON.stringify({
            model: 'openai/dall-e-3',
            prompt: prompt,
            n: 1,
            size: '1024x1024',
          }),
        });

        if (!response.ok) {
          throw new Error('이미지 생성에 실패했습니다.');
        }

        const data = await response.json();
        if (data.data && data.data[0]?.url) {
          setResult(data.data[0].url);
          toast.success('이미지가 생성되었습니다!');
        } else {
          throw new Error('이미지 URL을 받지 못했습니다.');
        }
      } else if (activeTab === 'document') {
        // Document generation via OpenRouter
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Signal Voca',
          },
          body: JSON.stringify({
            model: 'anthropic/claude-sonnet-4',
            messages: [
              {
                role: 'system',
                content: '당신은 전문 문서 작성 도우미입니다. 사용자의 요청에 따라 고품질의 문서를 작성해주세요. Markdown 형식으로 작성하세요.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
          }),
        });

        if (!response.ok) {
          throw new Error('문서 생성에 실패했습니다.');
        }

        const data = await response.json();
        if (data.choices && data.choices[0]?.message?.content) {
          setResult(data.choices[0].message.content);
          toast.success('문서가 생성되었습니다!');
        } else {
          throw new Error('문서 내용을 받지 못했습니다.');
        }
      } else if (activeTab === 'video') {
        toast.info('비디오 생성 기능은 곧 지원될 예정입니다. (Runway, Pika 등 API 연동 예정)');
        setIsLoading(false);
        return;
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || '생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      toast.success('복사되었습니다!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInsert = () => {
    if (result && onInsertContent) {
      onInsertContent(result);
      toast.success('채팅에 삽입되었습니다!');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        ref={menuRef}
        className="w-full max-w-2xl mx-4 bg-[#1e1f20] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272a]">
          <h2 className="text-lg font-semibold text-white">AI 도구</h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-[#27272a] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#27272a]">
          <button
            onClick={() => { setActiveTab('image'); setResult(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'image' 
                ? 'text-white bg-[#27272a] border-b-2 border-blue-500' 
                : 'text-zinc-400 hover:text-white hover:bg-[#27272a]/50'
            }`}
          >
            <Image className="w-4 h-4" />
            이미지 생성
          </button>
          <button
            onClick={() => { setActiveTab('document'); setResult(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'document' 
                ? 'text-white bg-[#27272a] border-b-2 border-purple-500' 
                : 'text-zinc-400 hover:text-white hover:bg-[#27272a]/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            문서 작성
          </button>
          <button
            onClick={() => { setActiveTab('video'); setResult(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'video' 
                ? 'text-white bg-[#27272a] border-b-2 border-green-500' 
                : 'text-zinc-400 hover:text-white hover:bg-[#27272a]/50'
            }`}
          >
            <Video className="w-4 h-4" />
            비디오 생성
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Model Info */}
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="px-2 py-1 bg-[#27272a] rounded">
              {activeTab === 'image' && 'DALL-E 3 (OpenAI)'}
              {activeTab === 'document' && 'Claude Sonnet 4 (Anthropic)'}
              {activeTab === 'video' && 'Coming Soon'}
            </span>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">
              {activeTab === 'image' && '이미지 설명을 입력하세요'}
              {activeTab === 'document' && '문서 주제나 요청사항을 입력하세요'}
              {activeTab === 'video' && '비디오 설명을 입력하세요 (준비 중)'}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                activeTab === 'image' ? 'A futuristic city with flying cars...' :
                activeTab === 'document' ? '프로젝트 기획서를 작성해주세요...' :
                '비디오 내용을 설명해주세요...'
              }
              disabled={activeTab === 'video'}
              className="w-full h-24 p-3 bg-[#27272a] border border-[#3f3f46] rounded-xl text-white placeholder:text-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim() || activeTab === 'video'}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                {activeTab === 'image' && <Image className="w-5 h-5" />}
                {activeTab === 'document' && <FileText className="w-5 h-5" />}
                {activeTab === 'video' && <Video className="w-5 h-5" />}
                {activeTab === 'video' ? '준비 중' : '생성하기'}
              </>
            )}
          </button>

          {/* Result */}
          {result && (
            <div className="mt-4 p-4 bg-[#27272a] rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white">결과</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-[#3f3f46] rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? '복사됨' : '복사'}
                  </button>
                  {activeTab === 'image' && (
                    <a
                      href={result}
                      download="generated-image.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-[#3f3f46] rounded-lg transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      다운로드
                    </a>
                  )}
                  {activeTab === 'document' && onInsertContent && (
                    <button
                      onClick={handleInsert}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      채팅에 삽입
                    </button>
                  )}
                </div>
              </div>
              
              {activeTab === 'image' ? (
                <img 
                  src={result} 
                  alt="Generated" 
                  className="w-full rounded-lg border border-[#3f3f46]"
                />
              ) : (
                <div className="max-h-[300px] overflow-y-auto text-sm text-zinc-300 whitespace-pre-wrap">
                  {result}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
