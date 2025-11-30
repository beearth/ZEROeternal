import { useEffect, useRef } from 'react';

export function useBackNavigation(
    onBack: () => void,
    active: boolean = true
) {
    const pushedRef = useRef(false);

    useEffect(() => {
        if (!active) return;

        // 이미 push하지 않았을 때만 history 추가
        if (!pushedRef.current) {
            window.history.pushState(null, '', window.location.pathname);
            pushedRef.current = true;
        }

        const handlePopState = (event: PopStateEvent) => {
            // 뒤로가기 이벤트 발생 시 실행
            // 브라우저 뒤로가기는 history를 하나 소모하므로 pushedRef를 false로 리셋할 필요 없음 (이미 pop됨)
            onBack();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Backspace' && !isInputActive()) {
                // 백스페이스 키 누름 (입력창이 아닐 때)
                // history.back()을 호출하여 popstate를 유발하거나 직접 onBack 호출
                // 여기서는 브라우저 동작과 일치시키기 위해 history.back() 호출
                window.history.back();
            }
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('keydown', handleKeyDown);

            // 컴포넌트가 언마운트될 때 (닫힐 때), 만약 우리가 push한 상태가 아직 남아있다면?
            // 사용자가 'X' 버튼으로 닫았을 경우, history에는 여전히 우리가 push한 state가 남아있음.
            // 이를 정리해주지 않으면 사용자가 뒤로가기를 눌렀을 때 닫힌 모달이 다시 열리는게 아니라, 그냥 URL만 바뀜.
            // 하지만 브라우저 history 조작은 부작용이 있을 수 있으므로 신중해야 함.
            // 여기서는 'X'로 닫았을 때 history.back()을 호출하면 사용자가 의도치 않게 페이지를 이탈할 수 있음.
            // 따라서 그냥 둠 (대부분의 모달 구현체들이 이렇게 함).
        };
    }, [active, onBack]);
}

function isInputActive() {
    const activeElement = document.activeElement as HTMLElement;
    return (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable)
    );
}
