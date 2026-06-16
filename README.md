# TaskFlow – Personal Task Management Web Application

<div align="center">

# 📋 TaskFlow

### *A Modern Drag-and-Drop Task Management Web Application*

Organize your personal tasks and projects with an intuitive Kanban board, deadline tracking, analytics dashboard, and responsive design.

</div>

---

## 🚀 Overview

**TaskFlow** is a lightweight and modern web application designed to help users manage their daily tasks and projects efficiently. It provides a clean Kanban-style interface where tasks can be created, edited, deleted, and moved between different stages using drag-and-drop functionality.

The application also includes productivity analytics, task searching, filtering, sorting, a calendar view for reminders, and dark mode support.

---

## ✨ Features

### 📌 Task Management

* Create new tasks
* Edit existing tasks
* Delete tasks
* Mark tasks as completed
* Assign due dates
* Organize tasks by status

### 📊 Kanban Board

* Three workflow stages:

  * 📋 To Do
  * 🔄 Doing
  * ✅ Done
* Drag and drop tasks between columns
* Automatic status updates

### 🔍 Search & Filter

* Search tasks instantly
* Filter by status
* Sort tasks by:

  * Due date
  * Title
* Reset filters with one click

### 📅 Calendar View

* Monthly calendar interface
* Visual reminder indicators
* Highlighted important dates
* Deadline awareness

### 📈 Analytics Dashboard

* Total tasks
* To Do count
* Doing count
* Completed count
* Completion percentage
* Pending tasks
* Progress bar visualization

### 🌙 Dark Mode

* One-click theme switching
* Modern dark UI
* Smooth transitions

### 📱 Responsive Design

* Desktop optimized
* Tablet friendly
* Mobile compatible

### 📝 Modal-Based Task Creation

* Easy popup interface
* Add title
* Set due date
* Choose task status

---

## 🛠️ Technologies Used

| Technology           | Purpose                     |
| -------------------- | --------------------------- |
| HTML5                | Structure                   |
| CSS3                 | Styling & Responsive Design |
| JavaScript (Vanilla) | Application Logic           |
| Font Awesome         | Icons                       |
| Drag & Drop API      | Task movement               |

---

## 📂 Project Structure

```
TaskFlow/
│
├── index.html        # Main application interface
├── style.css         # Styling and responsive design
├── script.js         # Application logic
└── README.md         # Project documentation
```

---

## 🎯 Application Workflow

```
          +----------------+
          |  Create Task   |
          +-------+--------+
                  |
                  ▼
         +-------------------+
         |     To Do         |
         +-------------------+
                  |
          Drag & Drop
                  ▼
         +-------------------+
         |     Doing         |
         +-------------------+
                  |
          Drag & Drop
                  ▼
         +-------------------+
         |      Done         |
         +-------------------+
                  |
                  ▼
        Analytics Updated Automatically
```

---

## 📊 Dashboard Components

### Statistics Cards

* 📋 Total Tasks
* ⏰ To Do
* 🔄 Doing
* ✅ Done

### Analytics

* Completion Progress
* Completed Tasks
* Pending Tasks
* Progress Percentage

---

## 🔧 Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/taskflow.git
```

### 2. Navigate into the project

```bash
cd taskflow
```

### 3. Open the application

Simply open:

```text
index.html
```

in your preferred web browser.

No additional setup or dependencies are required.

---

## 💻 Usage

### Add a Task

1. Click **"Add Task"**
2. Enter task title
3. Select due date
4. Choose status
5. Save

### Edit a Task

* Click the ✏️ Edit icon
* Update information
* Save changes

### Delete a Task

* Click the 🗑️ Delete icon
* Confirm deletion

### Complete a Task

* Click the ✅ Complete button
* Task automatically moves to **Done**

### Drag & Drop

Simply drag a task card and drop it into another column to update its status.

---

## 📈 Productivity Tracking

TaskFlow automatically calculates:

* Total tasks
* Completed tasks
* Pending tasks
* Completion percentage

Example:

```
Total Tasks      : 10
Completed Tasks : 7
Pending Tasks   : 3
Progress        : 70%
```

---

## 🌙 Dark Mode

Click the moon icon in the header to switch between:

* ☀️ Light Theme
* 🌙 Dark Theme

The interface updates instantly without reloading.

---

## 🔍 Search & Filtering

Search tasks by title.

Filter options include:

* All
* To Do
* Doing
* Done

Sorting options:

* By Date
* By Title

---

## 📅 Calendar

The built-in calendar provides:

* Monthly overview
* Today's highlight
* Reminder markers
* Quick deadline visualization

---

## 🎨 UI Highlights

* Modern glass-like cards
* Rounded components
* Clean typography
* Responsive layout
* Smooth animations
* Professional dashboard appearance

---

## 🚀 Future Enhancements

* User authentication
* Multiple projects
* Local Storage / Database persistence
* Cloud synchronization
* Email reminders
* Push notifications
* Recurring tasks
* Labels and tags
* Priority levels
* File attachments
* Subtasks
* Team collaboration
* Real-time synchronization
* AI-powered task suggestions
* Calendar integrations
* Export to PDF/CSV

---

## 🐞 Known Limitations

* Tasks are stored only in memory and are lost on page refresh.
* Calendar reminders are static and not generated dynamically from task data.
* No backend or database integration.
* Single-user application.
* No notification service.

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature-name
```

3. Commit your changes

```bash
git commit -m "Add new feature"
```

4. Push to your branch

```bash
git push origin feature-name
```

5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**.

You are free to use, modify, and distribute it for personal or commercial purposes.

---

## 👨‍💻 Author

**TaskFlow – Personal Task Management Web Application**

Built with ❤️ using **HTML, CSS, and JavaScript** to provide a simple, intuitive, and visually appealing task management experience.
