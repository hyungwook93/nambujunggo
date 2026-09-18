// AuthContext에서 re-export — 기존 import 경로 유지용
// 모든 컴포넌트에서 import { useAuth } from '../../hooks/useAuth' 그대로 사용 가능
export { useAuth, AuthProvider } from '../contexts/AuthContext';
