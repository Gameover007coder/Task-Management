
(function() {
    // ----- DATA -----
    let tasks = [
        { id: '1', title: 'Design landing page', due: '2026-06-18', status: 'todo' },
        { id: '2', title: 'Set up CI/CD', due: '2026-06-20', status: 'doing' },
        { id: '3', title: 'User testing', due: '2026-06-22', status: 'done' },
        { id: '4', title: 'Write documentation', due: '2026-06-25', status: 'todo' },
        { id: '5', title: 'Deploy to production', due: '2026-06-28', status: 'doing' },
    ];
    let nextId = 6;

    // DOM refs
    const todoList = document.getElementById('todoList');
    const doingList = document.getElementById('doingList');
    const doneList = document.getElementById('doneList');
    const totalSpan = document.getElementById('totalTasks');
    const todoCount = document.getElementById('todoCount');
    const doingCount = document.getElementById('doingCount');
    const doneCount = document.getElementById('doneCount');
    const todoBadge = document.getElementById('todoBadge');
    const doingBadge = document.getElementById('doingBadge');
    const doneBadge = document.getElementById('doneBadge');
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    const completedTasksSpan = document.getElementById('completedTasks');
    const pendingTasksSpan = document.getElementById('pendingTasks');
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    const sortBy = document.getElementById('sortBy');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    // modal
    const modal = document.getElementById('taskModal');
    const modalTitle = document.getElementById('modalTitle');
    const taskTitleInput = document.getElementById('taskTitleInput');
    const taskDueDate = document.getElementById('taskDueDate');
    const taskStatusSelect = document.getElementById('taskStatusSelect');
    const modalSave = document.getElementById('modalSave');
    const modalCancel = document.getElementById('modalCancel');
    const addTaskBtn = document.getElementById('addTaskBtn');

    let editingTaskId = null;

    // ----- helpers -----
    function getTasks() {
        return tasks;
    }

    function setTasks(newTasks) {
        tasks = newTasks;
        renderAll();
    }

    // render calendar (static june 2026 with reminders)
    function renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';
        const days = ['Mo','Tu','We','Th','Fr','Sa','Su'];
        days.forEach(d => { 
            const div = document.createElement('div'); 
            div.className='day'; 
            div.style.background='transparent'; 
            div.style.fontWeight='600'; 
            div.textContent=d; 
            grid.appendChild(div); 
        });
        // june 2026: 1 = monday
        const totalDays = 30;
        const reminderDays = [18, 22, 28]; // due dates from tasks
        for (let i = 1; i <= totalDays; i++) {
            const div = document.createElement('div');
            div.className = 'day';
            if (i === 16) div.classList.add('today'); // today marker
            if (reminderDays.includes(i)) div.classList.add('reminder');
            div.textContent = i;
            grid.appendChild(div);
        }
    }

    // render kanban + stats + analytics
    function renderAll() {
        const taskList = getTasks();
        // filter & search
        const search = searchInput.value.toLowerCase();
        const filter = filterStatus.value;
        let filtered = taskList.filter(t => {
            const matchSearch = t.title.toLowerCase().includes(search);
            const matchFilter = filter === 'all' || t.status === filter;
            return matchSearch && matchFilter;
        });
        // sort
        const sort = sortBy.value;
        if (sort === 'title') {
            filtered.sort((a,b) => a.title.localeCompare(b.title));
        } else {
            filtered.sort((a,b) => (a.due || '').localeCompare(b.due || ''));
        }

        // clear lists
        todoList.innerHTML = ''; 
        doingList.innerHTML = ''; 
        doneList.innerHTML = '';
        let counts = { todo:0, doing:0, done:0 };

        filtered.forEach(task => {
            const card = createTaskCard(task);
            if (task.status === 'todo') { 
                todoList.appendChild(card); 
                counts.todo++; 
            } else if (task.status === 'doing') { 
                doingList.appendChild(card); 
                counts.doing++; 
            } else if (task.status === 'done') { 
                doneList.appendChild(card); 
                counts.done++; 
            }
        });

        // update badges & stats
        todoBadge.textContent = counts.todo;
        doingBadge.textContent = counts.doing;
        doneBadge.textContent = counts.done;
        const total = taskList.length;
        totalSpan.textContent = total;
        todoCount.textContent = taskList.filter(t=>t.status==='todo').length;
        doingCount.textContent = taskList.filter(t=>t.status==='doing').length;
        doneCount.textContent = taskList.filter(t=>t.status==='done').length;

        const doneTotal = taskList.filter(t=>t.status==='done').length;
        const percent = total === 0 ? 0 : Math.round((doneTotal / total) * 100);
        progressFill.style.width = percent + '%';
        progressPercent.textContent = percent + '%';
        completedTasksSpan.textContent = doneTotal;
        pendingTasksSpan.textContent = total - doneTotal;
    }

    function createTaskCard(task) {
        const div = document.createElement('div');
        div.className = 'task-card';
        div.draggable = true;
        div.dataset.id = task.id;
        div.innerHTML = `
            <div class="task-title">${task.title}</div>
            <div class="task-meta">
                <span><i class="far fa-calendar-alt"></i> ${task.due || 'No due'}</span>
                <span class="badge">${task.status}</span>
            </div>
            <div class="task-actions">
                <button class="edit-task" data-id="${task.id}"><i class="fas fa-pen"></i></button>
                <button class="delete-task" data-id="${task.id}"><i class="fas fa-trash"></i></button>
                <button class="complete-task" data-id="${task.id}"><i class="fas fa-check-circle"></i></button>
            </div>
        `;
        // drag events
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragend', handleDragEnd);
        // edit
        div.querySelector('.edit-task').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(task.id);
        });
        div.querySelector('.delete-task').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Delete task?')) {
                tasks = tasks.filter(t => t.id !== task.id);
                renderAll();
            }
        });
        div.querySelector('.complete-task').addEventListener('click', (e) => {
            e.stopPropagation();
            const t = tasks.find(tk => tk.id === task.id);
            if (t) { 
                t.status = 'done'; 
                renderAll(); 
            }
        });
        return div;
    }

    // Drag & Drop
    let draggedId = null;
    function handleDragStart(e) {
        draggedId = this.dataset.id;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }
    function handleDragEnd(e) {
        this.classList.remove('dragging');
    }

    // drop targets
    document.querySelectorAll('.kanban-col').forEach(col => {
        col.addEventListener('dragover', (e) => e.preventDefault());
        col.addEventListener('drop', (e) => {
            e.preventDefault();
            const status = col.dataset.status;
            if (draggedId) {
                const task = tasks.find(t => t.id === draggedId);
                if (task) {
                    task.status = status;
                    renderAll();
                }
                draggedId = null;
            }
        });
    });

    // ----- MODAL -----
    function openEditModal(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        editingTaskId = id;
        modalTitle.textContent = 'Edit Task';
        taskTitleInput.value = task.title;
        taskDueDate.value = task.due || '';
        taskStatusSelect.value = task.status;
        modal.classList.add('active');
    }

    function openNewModal() {
        editingTaskId = null;
        modalTitle.textContent = 'New Task';
        taskTitleInput.value = '';
        taskDueDate.value = '';
        taskStatusSelect.value = 'todo';
        modal.classList.add('active');
    }

    function closeModal() {
        modal.classList.remove('active');
    }

    function saveTask() {
        const title = taskTitleInput.value.trim();
        const due = taskDueDate.value;
        const status = taskStatusSelect.value;
        if (!title) { 
            alert('Title is required'); 
            return; 
        }
        if (editingTaskId) {
            const task = tasks.find(t => t.id === editingTaskId);
            if (task) {
                task.title = title;
                task.due = due;
                task.status = status;
            }
        } else {
            tasks.push({ id: String(nextId++), title, due, status });
        }
        renderAll();
        closeModal();
    }

    // event listeners
    addTaskBtn.addEventListener('click', openNewModal);
    modalSave.addEventListener('click', saveTask);
    modalCancel.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { 
        if (e.target === modal) closeModal(); 
    });

    // dark mode
    const darkToggle = document.getElementById('darkToggle');
    darkToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        darkToggle.innerHTML = document.body.classList.contains('dark') ? 
            '<i class="fas fa-sun"></i>' : 
            '<i class="fas fa-moon"></i>';
    });

    // search, filter, sort
    searchInput.addEventListener('input', renderAll);
    filterStatus.addEventListener('change', renderAll);
    sortBy.addEventListener('change', renderAll);
    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterStatus.value = 'all';
        sortBy.value = 'date';
        renderAll();
    });

    // init
    renderCalendar();
    renderAll();
})();