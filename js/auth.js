/**
 * Simple auth client: keeps access token in memory, refresh via httpOnly cookie
 */
export const auth = {
  accessToken: null,
  user: null,

  async login(email, password){
    const res = await fetch('/api/auth/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    this.accessToken = data.accessToken;
    this.user = data.user;
    localStorage.setItem('bt.user', JSON.stringify(this.user));
    return data;
  },

  async register(payload){
    const res = await fetch('/api/auth/register', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Register failed');
    const data = await res.json();
    this.accessToken = data.accessToken;
    this.user = data.user;
    localStorage.setItem('bt.user', JSON.stringify(this.user));
    return data;
  },

  async me(){
    const res = await this.fetch('/api/auth/me');
    if (!res.ok) throw new Error('Unauthorized');
    const data = await res.json();
    this.user = data;
    localStorage.setItem('bt.user', JSON.stringify(this.user));
    return data;
  },

  async logout(){
    await fetch('/api/auth/logout', { method:'POST' });
    this.accessToken = null; this.user = null;
    localStorage.removeItem('bt.user');
  },

  async fetch(url, options={}){
    const opts = { ...options, headers: { ...(options.headers||{}) } };
    if (this.accessToken) opts.headers['Authorization'] = 'Bearer '+this.accessToken;
    let res = await fetch(url, opts);
    if (res.status === 401) {
      const rr = await fetch('/api/auth/refresh', { method:'POST' });
      if (rr.ok) {
        const { accessToken } = await rr.json();
        this.accessToken = accessToken;
        opts.headers['Authorization'] = 'Bearer '+this.accessToken;
        res = await fetch(url, opts);
      }
    }
    return res;
  }
};
