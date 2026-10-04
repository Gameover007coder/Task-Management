(() => {
    'use strict';

    /* ======================================================================
       Constants
       ====================================================================== */
    const STORAGE_KEY = 'taskflow.v2';
    const THEME_KEY = 'taskflow.theme';
    const MAX_UNDO = 30;

    const STATUSES = [
        { id: 'todo',  label: 'To do',       empty: 'Nothing queued. Add a task to get started.' },
        { id: 'doing', label: 'In progress', empty: 'Drag a task here when you start working on it.' },
        { id: 'done',  label: 'Done',        empty: 'Finished tasks land here.' },
    ];
    const STATUS_IDS = STATUSES.map(s => s.id);
    const PRIORITY_IDS = ['high', 'medium', 'low'];
    const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };
    const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

    const ICONS = {
        plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
        pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
        trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
        'chevron-left': '<path d="m15 18-6-6 6-6"/>',
        'chevron-right': '<path d="m9 18 6-6-6-6"/>',
        moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
        download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
        upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
        calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
        check: '<path d="M20 6 9 17l-5-5"/>',
        search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
        x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    };

    /* ======================================================================
       Small helpers
       ====================================================================== */
    const $ = (sel, root = document) => root.querySelector(sel);

    function icon(name) {
        const span = document.createElement('span');
        span.className = 'icon';
        span.setAttribute('aria-hidden', 'true');
        span.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
            'stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
        return span;
    }

    // Tiny element builder. Text is always set via textContent, never innerHTML,
    // so task titles can't inject markup.
    function el(tag, attrs = {}, ...children) {
        const node = document.createElement(tag);
        for (const [key, value] of Object.entries(attrs)) {
            if (value === null || value === undefined || value === false) continue;
            if (key === 'class') node.className = value;
            else if (key === 'text') node.textContent = value;
            else if (key === 'onclick') node.addEventListener('click', value);
            else node.setAttribute(key, value === true ? '' : value);
        }
        for (const child of children.flat()) {
            if (child !== null && child !== undefined && child !== false) node.append(child);
        }
        return node;
    }

    const uid = () =>
        (window.crypto && crypto.randomUUID)
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

    /* ---------- dates (always local time, never UTC) ---------- */
    const pad = n => String(n).padStart(2, '0');
    const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const todayISO = () => toISO(new Date());

    function parseISO(iso) {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    function isValidISO(s) {
        return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(parseISO(s)) === s;
    }
    function addDays(n) {
        const d = new Date();
        d.setDate(d.getDate() + n);
        return toISO(d);
    }
    function dayDiff(iso) {
        return Math.round((parseISO(iso) - parseISO(todayISO())) / 86400000);
    }
    function formatShort(iso) {
        const d = parseISO(iso);
        const opts = { month: 'short', day: 'numeric' };
        if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
        return d.toLocaleDateString(undefined, opts);
    }

    // Returns { text, kind } for a task's due date, or null if it has none.
    function dueInfo(task) {
        if (!task.due) return null;
        if (task.status === 'done') return { text: formatShort(task.due), kind: '' };
        const diff = dayDiff(task.due);
        if (diff < 0) return { text: diff === -1 ? '1 day overdue' : `${-diff} days overdue`, kind: 'overdue' };
        if (diff === 0) return { text: 'Due today', kind: 'today' };
        if (diff === 1) return { text: 'Due tomorrow', kind: 'soon' };
        if (diff < 7) return { text: 'Due ' + parseISO(task.due).toLocaleDateString(undefined, { weekday: 'long' }), kind: '' };
        return { text: 'Due ' + formatShort(task.due), kind: '' };
    }

    /* ======================================================================
       State
       ====================================================================== */
    const now = new Date();
    const state = {
        tasks: [],
        filters: { q: '', status: 'all', priority: 'all', sort: 'manual', date: null },
        cal: { year: now.getFullYear(), month: now.getMonth() },
        editingId: null,
    };
    let undoStack = [];
    let dragId = null;
    let storageWarned = false;

    /* ======================================================================
       DOM references
       ====================================================================== */
    const els = {
        board: $('#board'),
        quickAdd: $('#quickAdd'),
        quickInput: $('#quickInput'),
        newTaskBtn: $('#newTaskBtn'),
        exportBtn: $('#exportBtn'),
        importBtn: $('#importBtn'),
        importFile: $('#importFile'),
        themeBtn: $('#themeBtn'),
        search: $('#searchInput'),
        filterStatus: $('#filterStatus'),
        filterPriority: $('#filterPriority'),
        sortBy: $('#sortBy'),
        dateChip: $('#dateChip'),
        resetBtn: $('#resetBtn'),
        summaryLine: $('#summaryLine'),
        progressTrack: $('#progressTrack'),
        progressFill: $('#progressFill'),
        statOverdue: $('#statOverdue'),
        statToday: $('#statToday'),
        statWeek: $('#statWeek'),
        calPrev: $('#calPrev'),
        calNext: $('#calNext'),
        calToday: $('#calToday'),
        calMonth: $('#calMonth'),
        calGrid: $('#calGrid'),
        upcoming: $('#upcomingList'),
        toasts: $('#toasts'),
        dialog: $('#taskDialog'),
        form: $('#taskForm'),
        dialogTitle: $('#dialogTitle'),
        fTitle: $('#fTitle'),
        fNotes: $('#fNotes'),
        fDue: $('#fDue'),
        fPriority: $('#fPriority'),
        fStatus: $('#fStatus'),
        fDelete: $('#fDelete'),
        fCancel: $('#fCancel'),
        fSave: $('#fSave'),
    };
    const columns = {}; // status id -> { root, count, list, clear }

    /* ======================================================================
       Persistence
       ====================================================================== */
    function sanitize(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const title = String(raw.title ?? '').trim().slice(0, 200);
        if (!title) return null;
        return {
            id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
            title,
            notes: String(raw.notes ?? '').slice(0, 2000),
            due: isValidISO(raw.due) ? raw.due : '',
            status: STATUS_IDS.includes(raw.status) ? raw.status : 'todo',
            priority: PRIORITY_IDS.includes(raw.priority) ? raw.priority : 'medium',
            order: Number.isFinite(raw.order) ? raw.order : 0,
            createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
            completedAt: Number.isFinite(raw.completedAt) ? raw.completedAt : null,
        };
    }

    function loadTasks() {
        let raw = null;
        try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
        if (raw === null) return null;
        try {
            const data = JSON.parse(raw);
            const list = Array.isArray(data) ? data : data.tasks;
            if (!Array.isArray(list)) throw new Error('bad shape');
            return list.map(sanitize).filter(Boolean);
        } catch (e) {
            // Keep a copy of unreadable data instead of silently overwriting it.
            try { localStorage.setItem(STORAGE_KEY + '.backup', raw); } catch (_) { /* ignore */ }
            return [];
        }
    }

    function persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, tasks: state.tasks }));
        } catch (e) {
            if (!storageWarned) {
                storageWarned = true;
                toast('Changes can’t be saved in this browser. Use export to keep a copy.', { timeout: 9000 });
            }
        }
    }

    function makeTask(title, opts = {}) {
        return {
            id: uid(),
            title,
            notes: opts.notes || '',
            due: opts.due || '',
            status: opts.status || 'todo',
            priority: opts.priority || 'medium',
            order: 0,
            createdAt: Date.now(),
            completedAt: opts.status === 'done' ? Date.now() : null,
        };
    }

    function seedTasks() {
        return [
            makeTask('Click a task to edit it', {
                due: addDays(0), priority: 'medium',
                notes: 'Drag cards between columns, or use the arrow buttons on each card.',
            }),
            makeTask('Try quick add: “Call the dentist @tomorrow !high”', { due: addDays(1), priority: 'high' }),
            makeTask('Plan the week', { due: addDays(3), status: 'doing' }),
            makeTask('Reply to an old email', { due: addDays(-1), priority: 'low' }),
            makeTask('Open TaskFlow', { status: 'done' }),
        ];
    }

    function normalizeOrder() {
        for (const id of STATUS_IDS) {
            columnTasks(id).forEach((t, i) => { t.order = i; });
        }
    }

    /* ======================================================================
       Task operations (always call these inside mutate())
       ====================================================================== */
    const findTask = id => state.tasks.find(t => t.id === id);
    const columnTasks = status =>
        state.tasks.filter(t => t.status === status).sort((a, b) => a.order - b.order);

    function mutate(label, fn, { message = null, focus = null } = {}) {
        const snapshot = JSON.stringify(state.tasks);
        fn();
        undoStack.push({ label, snapshot });
        if (undoStack.length > MAX_UNDO) undoStack.shift();
        persist();
        render();
        if (focus) restoreFocus(focus);
        if (message) toast(message, { action: 'Undo', onAction: undo });
    }

    function undo() {
        const entry = undoStack.pop();
        if (!entry) { toast('Nothing to undo'); return; }
        state.tasks = JSON.parse(entry.snapshot);
        persist();
        render();
        toast(`Undid: ${entry.label}`);
    }

    function placeTask(id, status, beforeId) {
        const task = findTask(id);
        if (!task) return;
        const prev = task.status;
        task.status = status;
        if (status === 'done' && prev !== 'done') task.completedAt = Date.now();
        if (status !== 'done' && prev === 'done') task.completedAt = null;

        const col = columnTasks(status).filter(t => t.id !== id);
        let index = beforeId ? col.findIndex(t => t.id === beforeId) : -1;
        if (index < 0) index = col.length;
        col.splice(index, 0, task);
        col.forEach((t, i) => { t.order = i; });
        if (prev !== status) columnTasks(prev).forEach((t, i) => { t.order = i; });
    }

    function addTask(fields) {
        const task = makeTask(fields.title, fields);
        task.order = columnTasks(task.status).length;
        state.tasks.push(task);
        return task;
    }

    function updateTask(id, patch) {
        const task = findTask(id);
        if (!task) return;
        const { status, ...rest } = patch;
        Object.assign(task, rest);
        if (status && status !== task.status) placeTask(id, status, null);
    }

    function removeTask(id) {
        state.tasks = state.tasks.filter(t => t.id !== id);
        normalizeOrder();
    }

    /* ======================================================================
       Filtering & sorting
       ====================================================================== */
    function matches(task) {
        const f = state.filters;
        if (f.status !== 'all' && task.status !== f.status) return false;
        if (f.priority !== 'all' && task.priority !== f.priority) return false;
        if (f.date && task.due !== f.date) return false;
        if (f.q) {
            const q = f.q.toLowerCase();
            if (!task.title.toLowerCase().includes(q) && !task.notes.toLowerCase().includes(q)) return false;
        }
        return true;
    }

    const filtersActive = () => {
        const f = state.filters;
        return !!(f.q || f.date || f.status !== 'all' || f.priority !== 'all' || f.sort !== 'manual');
    };

    const dueKey = t => t.due || '9999-99-99';
    function compare(a, b) {
        switch (state.filters.sort) {
            case 'due': return dueKey(a).localeCompare(dueKey(b)) || a.order - b.order;
            case 'priority': return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || dueKey(a).localeCompare(dueKey(b));
            case 'title': return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
            case 'newest': return b.createdAt - a.createdAt;
            default: return a.order - b.order;
        }
    }

    /* ======================================================================
       Rendering
       ====================================================================== */
    function buildBoardSkeleton() {
        for (const s of STATUSES) {
            const count = el('span', { class: 'count', text: '0' });
            const clear = el('button', { class: 'link-btn', type: 'button', 'data-action': 'clear-done', text: 'Clear done', hidden: true });
            const add = el('button', {
                class: 'icon-btn', type: 'button', 'data-action': 'add', 'data-status': s.id,
                'aria-label': `Add a task to ${s.label}`, title: `Add a task to ${s.label}`,
            }, icon('plus'));
            const list = el('ul', { class: 'column-list', 'aria-labelledby': `col-title-${s.id}` });
            const root = el('section', { class: 'column', 'data-status': s.id },
                el('div', { class: 'column-head' },
                    el('h2', { id: `col-title-${s.id}`, text: s.label }),
                    count,
                    el('span', { class: 'head-spacer' }),
                    s.id === 'done' ? clear : null,
                    add),
                list);
            columns[s.id] = { root, count, list, clear };
            els.board.append(root);
        }
    }

    function buildCard(task) {
        const done = task.status === 'done';
        const info = dueInfo(task);
        const idx = STATUS_IDS.indexOf(task.status);

        const check = el('button', {
            class: 'check', type: 'button', 'data-action': 'toggle',
            'aria-pressed': String(done),
            'aria-label': done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`,
            title: done ? 'Mark as not done' : 'Mark as done',
        }, icon('check'));

        const chips = el('div', { class: 'chips' },
            task.priority === 'high' ? el('span', { class: 'chip high', text: 'High priority' }) : null,
            task.priority === 'low' ? el('span', { class: 'chip', text: 'Low priority' }) : null,
            info ? el('span', { class: `chip ${info.kind}` }, icon('calendar'), info.text) : null);

        const actionBtn = (action, iconName, label, extra = '') => el('button', {
            class: `icon-btn ${extra}`.trim(), type: 'button', 'data-action': action,
            'aria-label': label, title: label,
        }, icon(iconName));

        const actions = el('div', { class: 'card-actions' },
            idx > 0 ? actionBtn('left', 'chevron-left', `Move to ${STATUSES[idx - 1].label}`) : null,
            idx < STATUSES.length - 1 ? actionBtn('right', 'chevron-right', `Move to ${STATUSES[idx + 1].label}`) : null,
            actionBtn('edit', 'pencil', `Edit “${task.title}”`),
            actionBtn('delete', 'trash', `Delete “${task.title}”`, 'danger'));

        return el('li', {
            class: `card${done ? ' is-done' : ''}${info && info.kind === 'overdue' ? ' is-overdue' : ''}`,
            draggable: 'true',
            'data-id': task.id,
        },
            check,
            el('div', { class: 'card-body' },
                el('button', { class: 'card-title', type: 'button', 'data-action': 'edit', text: task.title }),
                task.notes ? el('p', { class: 'card-notes', text: task.notes }) : null,
                el('div', { class: 'card-meta' }, chips, actions)));
    }

    function renderBoard() {
        const f = state.filters;
        els.board.dataset.single = String(f.status !== 'all');
        const anyDone = state.tasks.some(t => t.status === 'done');

        for (const s of STATUSES) {
            const col = columns[s.id];
            const total = state.tasks.filter(t => t.status === s.id).length;
            const visible = state.tasks.filter(t => t.status === s.id && matches(t)).sort(compare);

            col.root.hidden = f.status !== 'all' && f.status !== s.id;
            col.count.textContent = visible.length === total ? String(total) : `${visible.length} of ${total}`;
            if (col.clear) col.clear.hidden = !anyDone;

            const kids = visible.map(buildCard);
            if (!kids.length) {
                const filtered = total > 0 || filtersActive();
                kids.push(el('li', { class: 'empty', text: filtered && total > 0 ? 'No tasks match your filters.' : s.empty }));
            }
            col.list.replaceChildren(...kids);
        }
    }

    function renderSummary() {
        const total = state.tasks.length;
        const done = state.tasks.filter(t => t.status === 'done').length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const open = state.tasks.filter(t => t.status !== 'done' && t.due);
        const overdue = open.filter(t => dayDiff(t.due) < 0).length;
        const today = open.filter(t => dayDiff(t.due) === 0).length;
        const weekAgo = Date.now() - 7 * 86400000;
        const week = state.tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= weekAgo).length;

        els.summaryLine.textContent = total ? `${done} of ${total} tasks done (${pct}%)` : 'No tasks yet';
        els.progressFill.style.width = pct + '%';
        els.progressTrack.setAttribute('aria-valuenow', String(pct));
        els.statOverdue.textContent = overdue;
        els.statOverdue.classList.toggle('has-value', overdue > 0);
        els.statToday.textContent = today;
        els.statWeek.textContent = week;
    }

    function renderCalendar() {
        const { year, month } = state.cal;
        const first = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const offset = (first.getDay() + 6) % 7; // weeks start on Monday
        const today = todayISO();

        els.calMonth.textContent = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

        const byDate = new Map();
        for (const t of state.tasks) {
            if (!t.due) continue;
            if (!byDate.has(t.due)) byDate.set(t.due, []);
            byDate.get(t.due).push(t);
        }

        const cells = [];
        for (let i = 0; i < 7; i++) {
            // 2024-01-01 was a Monday
            const label = new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: 'narrow' });
            cells.push(el('div', { class: 'cal-dow', 'aria-hidden': 'true', text: label }));
        }
        for (let i = 0; i < offset; i++) cells.push(el('div'));

        for (let day = 1; day <= daysInMonth; day++) {
            const iso = `${year}-${pad(month + 1)}-${pad(day)}`;
            const list = byDate.get(iso) || [];
            const openCount = list.filter(t => t.status !== 'done').length;
            const dots = list.slice(0, 3).map(t => {
                const cls = t.status === 'done' ? 'done' : (iso < today ? 'overdue' : '');
                return el('span', { class: `dot ${cls}`.trim() });
            });
            const longDate = new Date(year, month, day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
            const label = longDate + (openCount ? `, ${openCount} open task${openCount === 1 ? '' : 's'}` : '');

            cells.push(el('button', {
                class: `cal-day${iso === today ? ' is-today' : ''}`,
                type: 'button',
                'data-date': iso,
                'aria-label': label,
                'aria-pressed': String(state.filters.date === iso),
            }, el('span', { text: String(day) }), el('span', { class: 'dots' }, dots)));
        }
        els.calGrid.replaceChildren(...cells);
    }

    function renderUpcoming() {
        const items = state.tasks
            .filter(t => t.status !== 'done' && t.due)
            .sort((a, b) => a.due.localeCompare(b.due))
            .slice(0, 6);

        if (!items.length) {
            els.upcoming.replaceChildren(el('li', { class: 'upcoming-empty', text: 'No upcoming deadlines. Add a due date to a task and it shows up here.' }));
            return;
        }
        els.upcoming.replaceChildren(...items.map(t => {
            const info = dueInfo(t);
            return el('li', {},
                el('button', { class: 'upcoming-item', type: 'button', 'data-edit': t.id },
                    el('span', { class: 'upcoming-title', text: t.title }),
                    el('span', { class: `upcoming-due ${info.kind}`.trim(), text: info.text })));
        }));
    }

    function renderControls() {
        const f = state.filters;
        els.dateChip.hidden = !f.date;
        if (f.date) {
            els.dateChip.replaceChildren(document.createTextNode(`Due ${formatShort(f.date)}`), icon('x'));
            els.dateChip.setAttribute('aria-label', `Due ${formatShort(f.date)}. Select to clear this date filter.`);
        }
        els.resetBtn.disabled = !filtersActive();
    }

    function render() {
        renderBoard();
        renderSummary();
        renderCalendar();
        renderUpcoming();
        renderControls();
    }

    // After a re-render the clicked button no longer exists; put focus on its replacement.
    function restoreFocus({ id, action }) {
        const card = els.board.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
        if (!card) return;
        (card.querySelector(`[data-action="${action}"]`) || card.querySelector('.card-title')).focus();
    }

    /* ======================================================================
       Toasts
       ====================================================================== */
    function toast(message, { action = null, onAction = null, timeout = 6000 } = {}) {
        const node = el('div', { class: 'toast' }, el('span', { text: message }));
        if (action) {
            node.append(el('button', {
                class: 'toast-action', type: 'button', text: action,
                onclick: () => { node.remove(); if (onAction) onAction(); },
            }));
        }
        els.toasts.append(node);
        while (els.toasts.children.length > 3) els.toasts.firstElementChild.remove();
        setTimeout(() => node.remove(), timeout);
    }

    /* ======================================================================
       Dialog
       ====================================================================== */
    function openDialog(id = null, status = 'todo') {
        const task = id ? findTask(id) : null;
        if (id && !task) return;
        state.editingId = task ? task.id : null;

        els.dialogTitle.textContent = task ? 'Edit task' : 'New task';
        els.fSave.textContent = task ? 'Save changes' : 'Add task';
        els.fDelete.hidden = !task;
        els.fTitle.classList.remove('touched');
        els.fTitle.setCustomValidity('');

        els.fTitle.value = task ? task.title : '';
        els.fNotes.value = task ? task.notes : '';
        els.fDue.value = task ? task.due : (state.filters.date || '');
        els.fPriority.value = task ? task.priority : 'medium';
        els.fStatus.value = task ? task.status : status;

        els.dialog.showModal();
        els.fTitle.focus();
        els.fTitle.select();
    }

    function submitDialog(e) {
        e.preventDefault();
        const title = els.fTitle.value.trim();
        if (!title) {
            els.fTitle.classList.add('touched');
            els.fTitle.setCustomValidity('Enter a task title');
            els.fTitle.reportValidity();
            return;
        }
        const fields = {
            title,
            notes: els.fNotes.value.trim(),
            due: isValidISO(els.fDue.value) ? els.fDue.value : '',
            priority: els.fPriority.value,
            status: els.fStatus.value,
        };
        const id = state.editingId;
        els.dialog.close();
        if (id) mutate('edit task', () => updateTask(id, fields));
        else mutate('add task', () => addTask(fields));
    }

    /* ======================================================================
       Quick add
       ====================================================================== */
    function parseQuick(input) {
        let priority = 'medium';
        let due = '';
        let title = input.replace(/(^|\s)!(high|h|medium|med|m|low|l)(?=\s|$)/gi, (m, pre, p) => {
            priority = { h: 'high', m: 'medium', l: 'low' }[p.toLowerCase()[0]];
            return pre;
        });
        title = title.replace(/(^|\s)@(today|tomorrow|\d{4}-\d{2}-\d{2})(?=\s|$)/gi, (m, pre, v) => {
            v = v.toLowerCase();
            const iso = v === 'today' ? todayISO() : v === 'tomorrow' ? addDays(1) : v;
            if (!isValidISO(iso)) return m;
            due = iso;
            return pre;
        });
        title = title.replace(/\s+/g, ' ').trim();
        return { title: title || input.trim(), priority, due };
    }

    function handleQuickAdd(e) {
        e.preventDefault();
        const text = els.quickInput.value.trim();
        if (!text) { els.quickInput.focus(); return; }
        const parsed = parseQuick(text);
        const fields = { ...parsed, due: parsed.due || state.filters.date || '', status: 'todo' };
        let created = null;
        mutate('add task', () => { created = addTask(fields); });
        els.quickInput.value = '';
        els.quickInput.focus();
        if (created && !matches(created)) {
            toast('Task added, but your current filters hide it.', {
                action: 'Reset filters', onAction: resetFilters,
            });
        }
    }

    /* ======================================================================
       Filters
       ====================================================================== */
    function resetFilters() {
        state.filters = { q: '', status: 'all', priority: 'all', sort: 'manual', date: null };
        els.search.value = '';
        els.filterStatus.value = 'all';
        els.filterPriority.value = 'all';
        els.sortBy.value = 'manual';
        render();
    }

    /* ======================================================================
       Import / export
       ====================================================================== */
    function exportTasks() {
        const blob = new Blob(
            [JSON.stringify({ app: 'taskflow', version: 2, exportedAt: new Date().toISOString(), tasks: state.tasks }, null, 2)],
            { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = el('a', { href: url, download: `taskflow-${todayISO()}.json` });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast(`Exported ${state.tasks.length} task${state.tasks.length === 1 ? '' : 's'}`);
    }

    async function importTasks(file) {
        if (!file) return;
        try {
            const data = JSON.parse(await file.text());
            const list = Array.isArray(data) ? data : data.tasks;
            if (!Array.isArray(list)) throw new Error('bad shape');
            const seen = new Set();
            const imported = list.map(sanitize).filter(Boolean).map(t => {
                if (seen.has(t.id)) t.id = uid();
                seen.add(t.id);
                return t;
            });
            mutate('import tasks', () => { state.tasks = imported; normalizeOrder(); },
                { message: `Imported ${imported.length} task${imported.length === 1 ? '' : 's'}, replacing your current list` });
        } catch (err) {
            toast('That file isn’t a valid TaskFlow export.');
        } finally {
            els.importFile.value = '';
        }
    }

    /* ======================================================================
       Theme
       ====================================================================== */
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        els.themeBtn.replaceChildren(icon(theme === 'dark' ? 'sun' : 'moon'));
        const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
        els.themeBtn.setAttribute('aria-label', label);
        els.themeBtn.title = label;
    }

    function toggleTheme() {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
    }

    /* ======================================================================
       Drag and drop
       ====================================================================== */
    const dropLine = el('li', { class: 'drop-line', 'aria-hidden': 'true' });

    function clearDragUI() {
        dropLine.remove();
        els.board.querySelectorAll('.drag-over').forEach(n => n.classList.remove('drag-over'));
    }

    function cardAfterPointer(list, y) {
        const cards = [...list.querySelectorAll('.card:not(.dragging)')];
        return cards.find(card => {
            const box = card.getBoundingClientRect();
            return y < box.top + box.height / 2;
        }) || null;
    }

    function bindDragAndDrop() {
        els.board.addEventListener('dragstart', e => {
            const card = e.target.closest && e.target.closest('.card');
            if (!card) return;
            dragId = card.dataset.id;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', dragId);
            requestAnimationFrame(() => card.classList.add('dragging'));
        });

        els.board.addEventListener('dragend', () => {
            dragId = null;
            clearDragUI();
            els.board.querySelectorAll('.dragging').forEach(n => n.classList.remove('dragging'));
        });

        els.board.addEventListener('dragover', e => {
            const col = e.target.closest('.column');
            if (!col || !dragId) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            els.board.querySelectorAll('.drag-over').forEach(n => { if (n !== col) n.classList.remove('drag-over'); });
            col.classList.add('drag-over');
            if (state.filters.sort === 'manual') {
                const list = col.querySelector('.column-list');
                list.insertBefore(dropLine, cardAfterPointer(list, e.clientY));
            }
        });

        els.board.addEventListener('dragleave', e => {
            const col = e.target.closest('.column');
            if (col && !col.contains(e.relatedTarget)) {
                col.classList.remove('drag-over');
                dropLine.remove();
            }
        });

        els.board.addEventListener('drop', e => {
            const col = e.target.closest('.column');
            if (!col || !dragId) return;
            e.preventDefault();
            const id = dragId;
            let beforeId = null;
            if (dropLine.parentNode) {
                let next = dropLine.nextElementSibling;
                while (next && (next.classList.contains('dragging') || !next.dataset.id)) next = next.nextElementSibling;
                beforeId = next ? next.dataset.id : null;
            }
            dragId = null;
            clearDragUI();
            mutate('move task', () => placeTask(id, col.dataset.status, beforeId));
        });
    }

    /* ======================================================================
       Event wiring
       ====================================================================== */
    function bindEvents() {
        // Board actions (delegated)
        els.board.addEventListener('click', e => {
            const btn = e.target.closest('[data-action]');
            const card = e.target.closest('.card');
            const action = btn ? btn.dataset.action : null;

            if (action === 'add') return openDialog(null, btn.dataset.status);
            if (action === 'clear-done') {
                const n = state.tasks.filter(t => t.status === 'done').length;
                if (!n) return;
                return mutate('clear done', () => { state.tasks = state.tasks.filter(t => t.status !== 'done'); normalizeOrder(); },
                    { message: `Cleared ${n} done task${n === 1 ? '' : 's'}` });
            }
            if (!card) return;
            const id = card.dataset.id;
            const task = findTask(id);
            if (!task) return;

            switch (action) {
                case 'toggle':
                    return mutate(task.status === 'done' ? 'reopen task' : 'complete task',
                        () => placeTask(id, task.status === 'done' ? 'todo' : 'done', null),
                        { focus: { id, action: 'toggle' } });
                case 'left':
                case 'right': {
                    const target = STATUS_IDS[STATUS_IDS.indexOf(task.status) + (action === 'left' ? -1 : 1)];
                    return mutate('move task', () => placeTask(id, target, null), { focus: { id, action } });
                }
                case 'delete':
                    return mutate('delete task', () => removeTask(id), { message: 'Task deleted' });
                case 'edit':
                    return openDialog(id);
                default:
                    // Clicking blank card space opens the editor too
                    if (!e.target.closest('button')) openDialog(id);
            }
        });

        bindDragAndDrop();

        // Header
        els.quickAdd.addEventListener('submit', handleQuickAdd);
        els.newTaskBtn.addEventListener('click', () => openDialog());
        els.exportBtn.addEventListener('click', exportTasks);
        els.importBtn.addEventListener('click', () => els.importFile.click());
        els.importFile.addEventListener('change', () => importTasks(els.importFile.files[0]));
        els.themeBtn.addEventListener('click', toggleTheme);

        // Filters
        els.search.addEventListener('input', () => { state.filters.q = els.search.value.trim(); render(); });
        els.search.addEventListener('keydown', e => {
            if (e.key === 'Escape' && els.search.value) {
                e.preventDefault();
                els.search.value = '';
                state.filters.q = '';
                render();
            }
        });
        els.filterStatus.addEventListener('change', () => { state.filters.status = els.filterStatus.value; render(); });
        els.filterPriority.addEventListener('change', () => { state.filters.priority = els.filterPriority.value; render(); });
        els.sortBy.addEventListener('change', () => { state.filters.sort = els.sortBy.value; render(); });
        els.resetBtn.addEventListener('click', resetFilters);
        els.dateChip.addEventListener('click', () => { state.filters.date = null; render(); });

        // Calendar
        const shiftMonth = delta => {
            const d = new Date(state.cal.year, state.cal.month + delta, 1);
            state.cal = { year: d.getFullYear(), month: d.getMonth() };
            renderCalendar();
        };
        els.calPrev.addEventListener('click', () => shiftMonth(-1));
        els.calNext.addEventListener('click', () => shiftMonth(1));
        els.calToday.addEventListener('click', () => {
            const d = new Date();
            state.cal = { year: d.getFullYear(), month: d.getMonth() };
            renderCalendar();
        });
        els.calGrid.addEventListener('click', e => {
            const btn = e.target.closest('[data-date]');
            if (!btn) return;
            const iso = btn.dataset.date;
            state.filters.date = state.filters.date === iso ? null : iso;
            render();
            const again = els.calGrid.querySelector(`[data-date="${iso}"]`);
            if (again) again.focus();
        });

        // Upcoming list
        els.upcoming.addEventListener('click', e => {
            const btn = e.target.closest('[data-edit]');
            if (btn) openDialog(btn.dataset.edit);
        });

        // Dialog
        els.form.addEventListener('submit', submitDialog);
        els.fTitle.addEventListener('input', () => els.fTitle.setCustomValidity(''));
        els.fCancel.addEventListener('click', () => els.dialog.close());
        els.fDelete.addEventListener('click', () => {
            const id = state.editingId;
            if (!id) return;
            els.dialog.close();
            mutate('delete task', () => removeTask(id), { message: 'Task deleted' });
        });
        els.form.addEventListener('click', e => {
            const btn = e.target.closest('[data-quick]');
            if (!btn) return;
            const q = btn.dataset.quick;
            els.fDue.value = q === 'today' ? addDays(0) : q === 'tomorrow' ? addDays(1) : q === 'week' ? addDays(7) : '';
        });
        // Close when clicking the backdrop (but not when a text selection drag ends there)
        let downOnBackdrop = false;
        els.dialog.addEventListener('pointerdown', e => { downOnBackdrop = e.target === els.dialog; });
        els.dialog.addEventListener('click', e => { if (downOnBackdrop && e.target === els.dialog) els.dialog.close(); });

        // Keyboard shortcuts
        document.addEventListener('keydown', e => {
            const tag = e.target.tagName;
            const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
            if (els.dialog.open) return;

            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !typing) {
                e.preventDefault();
                undo();
                return;
            }
            if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.key === 'n') { e.preventDefault(); openDialog(); }
            else if (e.key === '/') { e.preventDefault(); els.search.focus(); }
        });

        // Keep multiple tabs in sync
        window.addEventListener('storage', e => {
            if (e.key !== STORAGE_KEY && e.key !== null) return;
            const fresh = loadTasks();
            if (fresh) { state.tasks = fresh; normalizeOrder(); render(); }
        });

        // Roll over at midnight / when returning to a stale tab
        let lastDay = todayISO();
        const checkDay = () => {
            const d = todayISO();
            if (d !== lastDay) { lastDay = d; render(); }
        };
        setInterval(checkDay, 60000);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDay(); });
    }

    /* ======================================================================
       Init
       ====================================================================== */
    function init() {
        document.querySelectorAll('[data-icon]').forEach(node => node.replaceWith(icon(node.dataset.icon)));
        buildBoardSkeleton();
        applyTheme(document.documentElement.getAttribute('data-theme') || 'light');

        const stored = loadTasks();
        state.tasks = stored !== null ? stored : seedTasks();
        normalizeOrder();
        if (stored === null) persist();

        bindEvents();
        render();
    }

    init();
})();
