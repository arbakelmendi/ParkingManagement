export interface StoredAuth {
  token: string;
  user: any | null;
  role: string;
  isAdmin: boolean;
}

export const readAuth = (): StoredAuth => {
  const token = localStorage.getItem('token') || '';
  const rawUser = localStorage.getItem('user');
  let user: any | null = null;
  try {
    user = rawUser ? JSON.parse(rawUser) : null;
  } catch {
    user = null;
  }
  const role = String(user?.role ?? '').trim().toLowerCase();
  const isAdmin = role === 'admin' || role.includes('admin');
  return { token, user, role, isAdmin };
};
