import React, { useState } from "react";
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from "../services/auth";
import { toast } from "sonner";
import { Mail, Lock, LogIn, UserPlus, Chrome } from "lucide-react";

interface AuthProps {
  onAuthSuccess: () => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);

    // 10초 타임아웃 설정
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("응답 시간이 초과되었습니다. 네트워크 상태를 확인해주세요.")), 10000)
    );

    try {
      const authPromise = isLogin
        ? signInWithEmail(email, password)
        : signUpWithEmail(email, password);

      const result: any = await Promise.race([authPromise, timeoutPromise]);

      if (result.error) {
        toast.error(result.error);
        setLoading(false);
      } else {
        toast.success(isLogin ? "로그인 성공!" : "회원가입 성공!");
        // 성공 시 로딩 상태 유지 (App.tsx에서 화면 전환될 때까지)
        // 단, 너무 오래 걸리면 풀어줌
        setTimeout(() => setLoading(false), 2000);
        onAuthSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || "인증 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();

      if (result.error) {
        setLoading(false);
        if (result.error === '로그인이 취소되었습니다.') {
          toast.info("로그인이 취소되었습니다.");
        } else if (result.error.includes('configuration-not-found') || result.error.includes('설정되지 않았습니다')) {
          toast.error("Google 로그인을 사용할 수 없습니다. 이메일로 로그인해주세요.", {
            duration: 4000,
          });
        } else {
          toast.error(result.error);
        }
      } else {
        toast.success("로그인 성공!");
        onAuthSuccess();
        // 팝업 로그인은 즉시 완료되므로 여기서 로딩을 끌 필요는 없지만(App.tsx가 리렌더링됨),
        // 만약 리렌더링이 늦어질 경우를 대비해 안전하게 둠
      }
    } catch (error: any) {
      setLoading(false);
      toast.error("Google 로그인 중 오류가 발생했습니다.");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {isLogin ? "로그인" : "회원가입"}
          </h1>
          <p className="text-slate-500">
            {isLogin
              ? "Signal Voca에 오신 것을 환영합니다"
              : "새 계정을 만들어보세요"}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              이메일
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLogin ? (
              <LogIn className="w-5 h-5" />
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
            <span>{loading ? "처리 중..." : isLogin ? "로그인" : "회원가입"}</span>
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">또는</span>
            </div>
          </div>

          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Chrome className="w-5 h-5" />
            <span>Google로 로그인</span>
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {isLogin
              ? "계정이 없으신가요? 회원가입"
              : "이미 계정이 있으신가요? 로그인"}
          </button>
        </div>
      </div>
    </div>
  );
}

