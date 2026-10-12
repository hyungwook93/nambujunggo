import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';

// ─── 세션 관련 유틸 ────────────────────────────────────────────
const SESSION_KEY = 'techshop_user';
const ACTIVITY_KEY = 'techshop_last_activity';
export const SESSION_TTL_MS = 30 * 60 * 1000; // 30분 무활동 시 로그아웃
const ACTIVITY_WRITE_INTERVAL_MS = 10 * 1000; // 활동 시각 저장 쓰로틀
const EXPIRE_CHECK_INTERVAL_MS = 5 * 1000; // 만료 검사 주기

/** 마지막 활동 시각 (localStorage 공유 → 여러 탭에서 동일 값) */
export function getLastActivity(): number {
  const v = Number(localStorage.getItem(ACTIVITY_KEY));
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function touchActivity(now = Date.now()) {
  localStorage.setItem(ACTIVITY_KEY, String(now));
}

function isExpired(): boolean {
  const last = getLastActivity();
  return !last || Date.now() - last > SESSION_TTL_MS;
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ACTIVITY_KEY);
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    // 활동 기록이 없는 기존 세션은 loginAt 기준으로 이어받는다
    if (!getLastActivity() && session?.loginAt) touchActivity(session.loginAt);
    if (isExpired()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function saveSession(user: any) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    touchActivity();
  } else {
    clearSession();
  }
}

// ─── Context 타입 ──────────────────────────────────────────────
interface AuthContextType {
  currentUser: any;
  login: (userId: string, password: string) => Promise<any>;
  logout: () => void;
  /** 세션 30분 연장. 이미 만료된 세션이면 연장하지 않고 로그아웃하며 false 반환 */
  extendSession: () => boolean;
  /** 무활동으로 자동 로그아웃된 시각. 안내 메시지 표시용 (없으면 null) */
  expiredAt: number | null;
  clearExpired: () => void;
  register: (formData: any) => Promise<any>;
  checkDuplicateId: (userId: string) => Promise<boolean>;
  verifyPassword: (password: string) => Promise<any>;
  getUserInfo: () => Promise<any>;
  updateProfile: (formData: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState(loadSession);
  const [expiredAt, setExpiredAt] = useState<number | null>(null);

  const clearExpired = useCallback(() => setExpiredAt(null), []);

  /** 만료되었으면 즉시 로그아웃 처리. 만료되었다면 true */
  const expireIfNeeded = useCallback(() => {
    if (localStorage.getItem(SESSION_KEY) && isExpired()) {
      clearSession();
      setCurrentUser(null);
      setExpiredAt(Date.now());
      return true;
    }
    return false;
  }, []);

  /** 세션 연장 (만료 후에는 연장 불가) */
  const extendSession = useCallback(() => {
    if (expireIfNeeded()) return false;
    if (!localStorage.getItem(SESSION_KEY)) return false;
    touchActivity();
    return true;
  }, [expireIfNeeded]);

  // 활동 감지 / 만료 검사 / 탭 간 동기화
  useEffect(() => {
    if (!currentUser) return;

    let lastWrite = 0;
    const onActivity = () => {
      // 만료 후에 발생한 활동은 세션을 되살리지 못함
      if (expireIfNeeded()) return;
      const now = Date.now();
      if (now - lastWrite < ACTIVITY_WRITE_INTERVAL_MS) return;
      lastWrite = now;
      touchActivity(now);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') expireIfNeeded();
    };

    // 다른 탭에서 로그아웃/로그인 시 동기화
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY && !e.newValue) setCurrentUser(null);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);
    const timer = window.setInterval(expireIfNeeded, EXPIRE_CHECK_INTERVAL_MS);
    expireIfNeeded();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
      window.clearInterval(timer);
    };
  }, [currentUser, expireIfNeeded]);

  /** 로그인 */
  const login = useCallback(async (userId: string, password: string) => {
    if (!userId || !password) {
      return { success: false, message: '아이디와 비밀번호를 입력해주세요.' };
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('user_seq, user_id, user_name, user_pw, status, password_fail')
      .eq('user_id', userId)
      .limit(1);

    if (error) return { success: false, message: 'DB 오류: ' + error.message };
    if (!users || users.length === 0) {
      return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
    }

    const user = users[0];

    if (user.status === 'L') return { success: false, locked: true, message: '해당 계정이 잠금 처리되었습니다.' };
    if (user.status === 'D') return { success: false, message: '탈퇴한 계정입니다.' };

    const isMatch = await bcrypt.compare(password, user.user_pw);
    if (!isMatch) {
      const newFail = (user.password_fail || 0) + 1;
      const newStatus = newFail >= 5 ? 'L' : user.status;
      await supabase
        .from('users')
        .update({ password_fail: newFail, status: newStatus, mod_date: new Date().toISOString() })
        .eq('user_id', userId);
      if (newFail >= 5) return { success: false, locked: true, message: '해당 계정이 잠금 처리되었습니다.' };
      return { success: false, message: `비밀번호가 올바르지 않습니다. (${newFail}/5회 오류)` };
    }

    if (user.password_fail > 0) {
      await supabase
        .from('users')
        .update({ password_fail: 0, mod_date: new Date().toISOString() })
        .eq('user_id', userId);
    }

    const { data: roles } = await supabase
      .from('user_role')
      .select('role_code')
      .eq('user_id', userId)
      .eq('status', 'Y');

    const roleList = roles ? roles.map((r: any) => r.role_code) : [];

    if (!roleList.includes('USER')) {
      await supabase.from('user_role').insert({ user_id: userId, role_code: 'USER', status: 'Y' });
      roleList.push('USER');
    }

    const isAdmin = roleList.includes('SYSTEM');
    const sessionUser = {
      userSeq: user.user_seq,
      userId: user.user_id,
      userName: user.user_name,
      roles: roleList,
      isAdmin,
      loginAt: Date.now(),
    };

    saveSession(sessionUser);
    setCurrentUser(sessionUser); // ← Context state 업데이트 → 모든 컴포넌트 리렌더
    return { success: true, user: sessionUser };
  }, []);

  /** 로그아웃 */
  const logout = useCallback(() => {
    saveSession(null);
    setCurrentUser(null);
  }, []);

  /** 회원가입 */
  const register = useCallback(async (formData: any) => {
    const { userId, userName, password, phone, email, address, addressDetail } = formData;

    const { data: exists } = await supabase.from('users').select('user_id').eq('user_id', userId).limit(1);
    if (exists && exists.length > 0) return { success: false, message: '이미 사용 중인 아이디입니다.' };

    const hashedPw = await bcrypt.hash(password, 10);
    const { error } = await supabase.from('users').insert({
      user_id: userId,
      user_name: userName,
      user_pw: hashedPw,
      user_phone: phone,
      user_email: email,
      user_address: address,
      user_address_detail: addressDetail,
      status: 'C',
      password_fail: 0,
    });

    if (error) return { success: false, message: '가입 실패: ' + error.message };

    await supabase.from('user_role').insert({ user_id: userId, role_code: 'USER', status: 'Y' });
    return { success: true };
  }, []);

  /** 아이디 중복 확인 */
  const checkDuplicateId = useCallback(async (userId: string) => {
    const { data } = await supabase.from('users').select('user_id').eq('user_id', userId).limit(1);
    return data != null && data.length > 0;
  }, []);

  /** 비밀번호 2차 인증 */
  const verifyPassword = useCallback(
    async (password: string) => {
      if (!currentUser) return { success: false, message: '로그인이 필요합니다.' };
      const { data: users, error } = await supabase
        .from('users')
        .select('user_pw')
        .eq('user_id', currentUser.userId)
        .limit(1);
      if (error || !users || users.length === 0) return { success: false, message: '사용자 조회 실패' };
      const isMatch = await bcrypt.compare(password, users[0].user_pw);
      if (!isMatch) return { success: false, message: '비밀번호가 일치하지 않습니다.' };
      return { success: true };
    },
    [currentUser]
  );

  /** 내 정보 조회 */
  const getUserInfo = useCallback(async () => {
    if (!currentUser) return null;
    const { data } = await supabase
      .from('users')
      .select('user_id, user_name, user_phone, user_email, user_address, user_address_detail')
      .eq('user_id', currentUser.userId)
      .limit(1);
    return data && data.length > 0 ? data[0] : null;
  }, [currentUser]);

  /** 내 정보 수정 */
  const updateProfile = useCallback(
    async (formData: any) => {
      if (!currentUser) return { success: false, message: '로그인이 필요합니다.' };

      const updates: any = {
        user_name: formData.userName,
        user_phone: formData.phone,
        user_email: formData.email,
        user_address: formData.address,
        user_address_detail: formData.addressDetail,
        mod_date: new Date().toISOString(),
      };

      if (formData.password) {
        updates.user_pw = await bcrypt.hash(formData.password, 10);
      }

      const { error } = await supabase.from('users').update(updates).eq('user_id', currentUser.userId);
      if (error) return { success: false, message: '수정 실패: ' + error.message };

      if (formData.userName !== currentUser.userName) {
        const updatedSession = { ...currentUser, userName: formData.userName };
        saveSession(updatedSession);
        setCurrentUser(updatedSession);
      }

      return { success: true };
    },
    [currentUser]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        extendSession,
        expiredAt,
        clearExpired,
        register,
        checkDuplicateId,
        verifyPassword,
        getUserInfo,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook (기존 useAuth와 동일한 인터페이스) ───────────────────
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
