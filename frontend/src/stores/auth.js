import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api, refreshSession, setAccessToken, setAuthLostHandler, setWorkspaceId } from '../api/http';

const WS_KEY = 'pf_workspace';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const workspaces = ref([]);
  const workspaceId = ref(null);
  const ready = ref(false);

  const workspace = computed(() => workspaces.value.find((w) => w.id === workspaceId.value) ?? null);
  const role = computed(() => workspace.value?.role ?? null);
  const canManageTeam = computed(() => ['OWNER', 'ADMIN'].includes(role.value));

  function apply(data) {
    if (data.accessToken) setAccessToken(data.accessToken);
    user.value = data.user;
    workspaces.value = data.workspaces;
    const saved = localStorage.getItem(WS_KEY);
    const pick = data.workspaces.find((w) => w.id === (workspaceId.value || saved)) ?? data.workspaces[0];
    selectWorkspace(pick?.id ?? null);
  }

  function selectWorkspace(id) {
    workspaceId.value = id;
    setWorkspaceId(id);
    if (id) localStorage.setItem(WS_KEY, id);
  }

  function clear() {
    setAccessToken(null);
    setWorkspaceId(null);
    user.value = null;
    workspaces.value = [];
    workspaceId.value = null;
  }

  /** Called once by the router guard: restores the session from the refresh cookie, if any. */
  async function init() {
    if (ready.value) return;
    const data = await refreshSession();
    if (data) apply(data);
    ready.value = true;
  }

  async function login(email, password) {
    apply(await api('/auth/login', { method: 'POST', body: { email, password }, auth: false }));
  }

  async function register(payload) {
    apply(await api('/auth/register', { method: 'POST', body: payload, auth: false }));
  }

  async function reloadMe() {
    apply({ ...(await api('/auth/me')) });
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST', auth: false }).catch(() => {});
    clear();
  }

  setAuthLostHandler(clear);

  return { user, workspaces, workspaceId, workspace, role, canManageTeam, ready, init, login, register, logout, reloadMe, selectWorkspace };
});
