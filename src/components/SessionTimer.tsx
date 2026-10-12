import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getLastActivity, SESSION_TTL_MS } from '../contexts/AuthContext';

const WARN_MS = 5 * 60 * 1000; // 5분 이하 경고 표시

function format(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/** 헤더용 세션 남은 시간 + 연장 버튼 (1초마다 자기 자신만 리렌더) */
export default function SessionTimer({ onExtend }: { onExtend: () => void }) {
  const calc = () => SESSION_TTL_MS - (Date.now() - getLastActivity());
  const [remain, setRemain] = useState(calc);

  useEffect(() => {
    setRemain(calc());
    const t = window.setInterval(() => setRemain(calc()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const warn = remain <= WARN_MS;

  return (
    <>
      <span className={`session-timer-text${warn ? ' warn' : ''}`}>{format(remain)}</span>
      <Button
        id="session-extend-btn"
        size="small"
        shape="round"
        icon={<ReloadOutlined />}
        onClick={onExtend}
        className="session-extend-btn"
      >
        연장
      </Button>
    </>
  );
}
