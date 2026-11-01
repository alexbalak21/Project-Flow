<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { api, ApiError } from '../api/http';
import { useAuthStore } from '../stores/auth';
import Avatar from '../components/Avatar.vue';
import Chip from '../components/Chip.vue';

const auth = useAuthStore();
const members = ref([]);
const loading = ref(true);
const error = ref('');
const dialog = ref(null);
const invite = ref({ email: '', role: 'MEMBER' });
const inviteError = ref('');

const ROLE_COLOR = { OWNER: '#7c3aed', ADMIN: '#2563eb', MANAGER: '#0d9488', MEMBER: '#64748b' };
const ROLE_LABEL = { OWNER: 'Owner', ADMIN: 'Admin', MANAGER: 'Manager', MEMBER: 'Member' };
// Only the owner can hand out or change the admin role (the API enforces this too).
const assignable = computed(() => (auth.role === 'OWNER' ? ['ADMIN', 'MANAGER', 'MEMBER'] : ['MANAGER', 'MEMBER']));
const nameOf = (m) => (m.firstName ? `${m.firstName} ${m.lastName}` : m.email);
const canEdit = (m) => auth.canManageTeam && m.role !== 'OWNER' && (auth.role === 'OWNER' || m.role !== 'ADMIN');

async function load() {
  if (!auth.workspaceId) return;
  loading.value = true;
  error.value = '';
  try {
    members.value = await api('/members');
  } catch (e) {
    error.value = e instanceof ApiError ? e.friendly : 'Could not load the team';
  } finally {
    loading.value = false;
  }
}

async function changeRole(m, role) {
  try {
    await api(`/members/${m.id}/role`, { method: 'PATCH', body: { role } });
  } catch (e) {
    error.value = e instanceof ApiError ? e.friendly : 'Could not change the role';
  }
  await load();
}

async function remove(m) {
  const what = m.status === 'INVITED' ? `Cancel the invitation for ${m.email}?` : `Remove ${nameOf(m)} from this workspace?`;
  if (!confirm(what)) return;
  try {
    await api(`/members/${m.id}`, { method: 'DELETE' });
  } catch (e) {
    error.value = e instanceof ApiError ? e.friendly : 'Could not remove this member';
  }
  await load();
}

async function sendInvite() {
  inviteError.value = '';
  try {
    await api('/members/invite', { method: 'POST', body: invite.value });
    dialog.value.close();
    invite.value = { email: '', role: 'MEMBER' };
    await load();
  } catch (e) {
    inviteError.value = e instanceof ApiError ? e.friendly : 'Could not send the invitation';
  }
}

onMounted(load);
watch(() => auth.workspaceId, load);
</script>

<template>
  <div class="mb-6 flex items-center justify-between">
    <p class="text-slate-500">{{ members.filter((m) => m.status === 'ACTIVE').length }} members in {{ auth.workspace?.name }}.</p>
    <button v-if="auth.canManageTeam" class="btn-primary" @click="dialog.showModal()">Invite member</button>
  </div>
  <p v-if="error" role="alert" class="mb-4 text-sm text-red-600">{{ error }}</p>

  <section class="overflow-x-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
    <p v-if="loading" class="text-slate-500">Loading team…</p>
    <table v-else class="w-full min-w-[560px] text-left text-sm">
      <thead class="text-slate-500">
        <tr><th class="pb-3 font-medium">Member</th><th class="font-medium">Role</th><th class="font-medium">Open tasks</th><th class="font-medium">Status</th><th></th></tr>
      </thead>
      <tbody class="divide-y divide-zinc-100">
        <tr v-for="m in members" :key="m.id" class="hover:bg-zinc-50">
          <td class="py-3">
            <div class="flex items-center gap-3">
              <Avatar :name="nameOf(m)" :size="10" />
              <div><p class="font-medium">{{ nameOf(m) }}</p><p v-if="m.firstName" class="text-xs text-slate-500">{{ m.email }}</p></div>
            </div>
          </td>
          <td>
            <select v-if="canEdit(m) && m.status === 'ACTIVE'" :value="m.role" class="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm" :aria-label="`Role for ${nameOf(m)}`" @change="changeRole(m, $event.target.value)">
              <option v-for="r in assignable" :key="r" :value="r">{{ ROLE_LABEL[r] }}</option>
            </select>
            <Chip v-else :color="ROLE_COLOR[m.role]">{{ ROLE_LABEL[m.role] }}</Chip>
          </td>
          <td>{{ m.openTasks }}</td>
          <td><Chip :color="m.status === 'ACTIVE' ? '#16a34a' : '#ea580c'">{{ m.status === 'ACTIVE' ? 'Active' : 'Invited' }}</Chip></td>
          <td class="text-right"><button v-if="canEdit(m)" class="text-sm text-red-600 hover:underline" @click="remove(m)">{{ m.status === 'INVITED' ? 'Cancel invite' : 'Remove' }}</button></td>
        </tr>
      </tbody>
    </table>
  </section>

  <dialog ref="dialog" class="w-full max-w-md rounded-3xl p-6 backdrop:bg-black/40">
    <form class="grid gap-4" @submit.prevent="sendInvite">
      <h3 class="text-xl font-semibold">Invite member</h3>
      <label class="text-sm font-medium">Email<input v-model="invite.email" type="email" required placeholder="name@company.com" class="field-input !mt-2 !h-11" /></label>
      <label class="text-sm font-medium">Role
        <select v-model="invite.role" class="field-input !mt-2 !h-11"><option v-for="r in assignable" :key="r" :value="r">{{ ROLE_LABEL[r] }}</option></select>
      </label>
      <p v-if="inviteError" role="alert" class="text-sm text-red-600">{{ inviteError }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="dialog.close()">Cancel</button>
        <button class="btn-primary">Send invitation</button>
      </div>
    </form>
  </dialog>
</template>
