/**
 * 중고 상품 대분류(메뉴) 정의
 *  - 경로: /used/:type  (appliance | furniture)
 *  - 상품은 common_code 의 대분류 코드(HOMEAPPLIANCES / OFFICEFURNITURE) 하위 코드로 구분한다.
 */
export const USED_TYPES = {
  appliance: { parentCode: 'HOMEAPPLIANCES', title: '가전' },
  furniture: { parentCode: 'OFFICEFURNITURE', title: '사무용 가구' },
} as const;

export type UsedType = keyof typeof USED_TYPES;

export function isUsedType(v: string | undefined): v is UsedType {
  return !!v && Object.prototype.hasOwnProperty.call(USED_TYPES, v);
}

/** 카테고리 코드(예: HOMEAPPLIANCES003)로부터 대분류 타입 추정 */
export function usedTypeFromCategoryCode(code?: string | null): UsedType {
  if (code?.startsWith(USED_TYPES.furniture.parentCode)) return 'furniture';
  return 'appliance';
}
