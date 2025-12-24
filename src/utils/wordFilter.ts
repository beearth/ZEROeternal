/**
 * Scroll #13: [성공의 물리학] - 금기어 필터
 * '실패'라는 단어를 '재시도' 또는 '계획 수정'으로 변환합니다.
 */

export const filterBannedWords = (text: string): string => {
  if (!text) return text;
  
  // '실패' -> '계획 수정' 또는 '재시도'
  // 문맥에 따라 다르겠지만 '재시도'가 보편적으로 UI에 잘 어울립니다.
  return text.replace(/실패/g, '계정 수정/재시도');
};

// 범용 텍스트 클리너 (Toast 메시지 등에서 사용)
export const cleanUIWord = (text: any): any => {
  if (typeof text === 'string') {
    return filterBannedWords(text);
  }
  return text;
};
