import React, { useEffect, useState } from 'react';
import { Slider } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';

/** 글자 크기 단계 (화면 영역 전체에 zoom 으로 적용 → 레이아웃 비율이 함께 유지됨) */
export const FONT_SCALES = [0.9, 1, 1.15, 1.3, 1.45];
const FONT_SCALE_KEY = 'techshop_font_scale';

export function useFontScale(): [number, (v: number) => void] {
  const [scale, setScaleState] = useState<number>(() => {
    const saved = Number(localStorage.getItem(FONT_SCALE_KEY));
    return FONT_SCALES.includes(saved) ? saved : 1;
  });

  const setScale = (v: number) => {
    setScaleState(v);
    localStorage.setItem(FONT_SCALE_KEY, String(v));
  };

  return [scale, setScale];
}

/** 우측 하단 글자 크기 조절 버튼 */
export default function FontSizeControl({ scale, onChange }: { scale: number; onChange: (v: number) => void }) {
  const [open, setOpen] = useState(false);
  const idx = FONT_SCALES.indexOf(scale);

  // 바깥을 누르면 접기
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (!(e.target as HTMLElement).closest('.font-control')) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close, { passive: true });
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  return (
    <div className="font-control" id="font-size-control">
      {open && (
        <div className="font-control-panel" role="group" aria-label="글자 크기 조절">
          <button
            type="button"
            className="font-control-step"
            disabled={idx >= FONT_SCALES.length - 1}
            onClick={() => onChange(FONT_SCALES[idx + 1])}
            aria-label="글자 크게"
          >
            <PlusOutlined />
          </button>

          {/* 볼륨처럼 위로 올리면 크게, 아래로 내리면 작게 */}
          <Slider
            vertical
            min={0}
            max={FONT_SCALES.length - 1}
            step={1}
            value={idx}
            tooltip={{ open: false }}
            onChange={(v) => onChange(FONT_SCALES[v])}
            style={{ height: 120, margin: '4px 0' }}
            aria-label="글자 크기"
          />

          <button
            type="button"
            className="font-control-step"
            disabled={idx <= 0}
            onClick={() => onChange(FONT_SCALES[idx - 1])}
            aria-label="글자 작게"
          >
            <MinusOutlined />
          </button>

          <button
            type="button"
            className="font-control-level"
            onClick={() => onChange(1)}
            title="기본 크기로"
          >
            {Math.round(scale * 100)}%
          </button>
        </div>
      )}
      <button
        type="button"
        className="font-control-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label="글자 크기 조절"
        aria-expanded={open}
      >
        <span style={{ fontSize: 12 }}>가</span>
        <span style={{ fontSize: 17 }}>가</span>
      </button>
    </div>
  );
}
