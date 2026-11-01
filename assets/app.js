// Shared shell (top bar + sidebar) + helpers. Each page only contains <main id="page">.
tailwind.config = { theme: { extend: { fontFamily: { sans: ['Poppins', 'system-ui', 'sans-serif'] }, colors: { primary: { 50: '#eff6ff', 100: '#dbeafe', 400: '#60a5fa', 500: '#2563eb', 600: '#1e40af', 700: '#1e3a8a' } } } } };
const P = { home: 'M3 10.5 12 3l9 7.5V21H3z', folder: 'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', board: 'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v13h-4z', users: 'M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M21 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8', bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0', search: 'M21 21l-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14', plus: 'M12 5v14M5 12h14', clip: 'm21 11-8.6 8.6a5 5 0 0 1-7-7L14 4a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4L15 7', chev: 'm6 9 6 6 6-6', out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', cal: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2', x: 'M18 6 6 18M6 6l12 12' };
const ic = (n, c = 'h-5 w-5') => `<svg class="${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="${P[n]}"/></svg>`;
const COL = ['#2563eb', '#0d9488', '#7c3aed', '#db2777', '#ea580c', '#0891b2'];
const av = (n, s = 8) => `<span title="${n}" class="inline-flex h-${s} w-${s} items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white" style="background:${COL[n.charCodeAt(0) % 6]}">${n.split(' ').map(x => x[0]).join('')}</span>`;
const chip = (t, c) => `<span class="rounded-lg px-3 py-1 text-xs font-semibold" style="background:${c}20;color:${c}">${t}</span>`;
const ST = { Todo: '#64748b', 'In Progress': '#0d9488', Review: '#7c3aed', Done: '#16a34a', Planned: '#64748b', Active: '#2563eb', 'On Hold': '#ea580c', Completed: '#16a34a' };
const PR = { Low: '#64748b', Medium: '#2563eb', High: '#ea580c', Critical: '#dc2626' };
document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page'), cur = document.body.dataset.page, title = document.body.dataset.title;
    const nav = [['dashboard', 'Dashboard', 'home'], ['projects', 'Projects', 'folder'], ['board', 'Board', 'board'], ['team', 'Team', 'users']]
        .map(([k, l, i]) => `<a href="${k}.html" class="relative flex items-center gap-4 rounded-sm px-5 py-3.5 font-medium ${k == cur ? 'bg-[#e4eaf5] text-[#32589f] before:absolute before:right-0 before:top-0 before:h-full before:w-1 before:bg-[#2f6de5]' : 'text-[#151515] hover:bg-[#e9edf6]'}">${ic(i, 'h-6 w-6')}${l}</a>`).join('');
    document.body.className = 'min-h-screen bg-neutral-50 font-sans text-slate-800';
    document.body.insertAdjacentHTML('afterbegin', `
  <header class="flex h-20 items-center justify-between gap-4 border-b-2 border-zinc-100 bg-white px-6 lg:px-12">
    <div class="flex items-center gap-4"><span class="text-xl font-semibold text-primary-500">ProjectFlow</span><span class="hidden text-zinc-300 sm:inline">/</span><h1 class="hidden text-2xl font-semibold tracking-tight sm:block">${title}</h1></div>
    <div class="flex items-center gap-3">
      <label class="hidden items-center gap-2 rounded-lg bg-[#f5f5f7] px-3 py-2 text-sm text-slate-500 md:flex">${ic('search', 'h-4 w-4')}<input class="w-48 bg-transparent outline-none" placeholder="Search tasks, projects"></label>
      <button class="relative rounded-full p-2 hover:bg-zinc-100" aria-label="Notifications">${ic('bell')}<span class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"></span></button>
      <div class="relative"><button id="um" class="flex items-center gap-1 rounded-full p-1 hover:bg-zinc-100">${av('Alex Balakirev', 10)}${ic('chev', 'h-4 w-4')}</button>
        <div id="umm" class="absolute right-0 top-12 z-50 hidden w-56 overflow-hidden rounded-lg border border-zinc-100 bg-white shadow-lg">
          <div class="border-b border-zinc-100 px-4 py-3"><p class="text-sm font-semibold">Alex Balakirev <span class="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] text-violet-700">Owner</span></p><p class="text-xs text-slate-500">alex@projectflow.app</p></div>
          <a href="login.html" class="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">${ic('out', 'h-4 w-4')}Log out</a></div></div>
    </div></header>
  <div class="flex"><aside class="hidden min-h-[calc(100vh-80px)] w-64 shrink-0 flex-col border-r-2 border-zinc-100 bg-white py-6 lg:flex">
    <div class="mx-4 mb-5 rounded-lg border border-zinc-100 bg-[#f5f5f7] px-4 py-2.5"><p class="text-xs text-slate-500">Workspace</p><p class="text-sm font-semibold">Acme Studio</p></div><nav class="grid gap-2">${nav}</nav></aside><div id="slot" class="min-w-0 flex-1"></div></div>`);
    document.getElementById('slot').appendChild(page);
    const m = document.getElementById('umm'); document.getElementById('um').onclick = e => { e.stopPropagation(); m.classList.toggle('hidden') }; document.onclick = () => m.classList.add('hidden');
});