const BOOKS_STORAGE_KEY = "digitalLibraryBooks";
const STUDENTS_STORAGE_KEY = "digitalLibraryStudents";
const TRANSACTIONS_STORAGE_KEY = "digitalLibraryTransactions";
const REGISTERED_USERS_STORAGE_KEY = "digitalLibraryUsers";

function readRecords(key) {
    try {
        const records = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(records) ? records : [];
    } catch (error) {
        return [];
    }
}

function formatDate(value) {
    if (!value) return "Date unavailable";
    return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
    if (!value) return "Date unavailable";
    return new Date(value).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function addEmptyState(container, message) {
    const item = document.createElement("li");
    item.className = "empty-state";
    item.textContent = message;
    container.appendChild(item);
}

function createIcon(className, text) {
    const icon = document.createElement("span");
    icon.className = `dashboard-icon ${className}`;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = text;
    return icon;
}

function renderStats(books, students, transactions) {
    const users = readRecords(REGISTERED_USERS_STORAGE_KEY);
    document.getElementById("totalUsers").textContent = users.length;
    document.getElementById("totalBooks").textContent = books.length;
    document.getElementById("availableBooks").textContent = books.reduce((total, book) => total + Math.max(0, Number(book.quantity) || 0), 0);
    document.getElementById("totalTransactions").textContent = transactions.length;
    document.getElementById("totalStudents").textContent = students.length;
    document.getElementById("issuedBooks").textContent = transactions.filter((transaction) => transaction.status === "issued").length;
    document.getElementById("returnedBooks").textContent = transactions.filter((transaction) => transaction.status === "returned").length;
}

function getRegisteredUserId(user, index) {
    return user.userId || `USR-${String(index + 1).padStart(4, "0")}`;
}

function renderProfile() {
    const session = getSession() || { name: "Library Admin", email: "", role: "Admin" };
    const name = session.name || "Library Admin";
    document.getElementById("profileName").textContent = name;
    document.getElementById("profileEmail").textContent = session.email || "";
    document.getElementById("dashboardWelcome").textContent = `Welcome, ${name}`;
    document.getElementById("profileAvatar").textContent = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "DL";
    document.getElementById("profileRole").textContent = session.role.toUpperCase();
}

function renderRegisteredUsers() {
    const query = document.getElementById("userSearch").value.trim().toLowerCase();
    const statusFilter = document.getElementById("userStatusFilter").value;
    const users = readRecords(REGISTERED_USERS_STORAGE_KEY);
    const filteredUsers = users.filter((user, index) => {
        const status = user.status || "Active";
        const userId = getRegisteredUserId(user, index);
        const matchesQuery = [userId, user.name, user.email, user.phone].some((value) => String(value || "").toLowerCase().includes(query));
        return matchesQuery && (statusFilter === "all" || status === statusFilter);
    });
    const tableBody = document.getElementById("registeredUserTableBody");
    tableBody.replaceChildren();
    document.getElementById("registeredUserCount").textContent = `${users.length} ${users.length === 1 ? "registered user" : "registered users"}`;
    if (!filteredUsers.length) {
        const row = document.createElement("tr");
        const emptyCell = document.createElement("td");
        emptyCell.className = "empty-state";
        emptyCell.colSpan = 6;
        emptyCell.textContent = query || statusFilter !== "all" ? "No registered users match your filters." : "No users have registered yet.";
        row.appendChild(emptyCell);
        tableBody.appendChild(row);
        return;
    }

    filteredUsers.forEach((user) => {
        const userIndex = users.indexOf(user);
        const row = document.createElement("tr");
        [getRegisteredUserId(user, userIndex), user.name, user.email, formatDate(user.createdAt), user.status || "Active"].forEach((value, index) => {
            const cell = document.createElement("td");
            cell.textContent = value || (index === 3 ? "Date unavailable" : "—");
            if (index === 0 || index === 2) cell.title = value || "";
            if (index === 4) {
                const badge = document.createElement("span");
                badge.className = `status status-${String(value || "Active").toLowerCase()}`;
                badge.textContent = value || "Active";
                cell.replaceChildren(badge);
            }
            row.appendChild(cell);
        });
        const actionsCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "user-actions";
        const viewButton = document.createElement("button");
        viewButton.className = "user-view-button";
        viewButton.dataset.userAction = "view";
        viewButton.dataset.userId = user.userId || "";
        viewButton.dataset.userEmail = user.email;
        viewButton.type = "button";
        viewButton.textContent = "View";
        actions.appendChild(viewButton);
        if (user.role !== "Admin") {
            const statusButton = document.createElement("button");
            statusButton.className = `user-status-button ${user.status === "Inactive" ? "is-inactive" : "is-active"}`;
            statusButton.dataset.userAction = "toggle-status";
            statusButton.dataset.userId = user.userId || "";
            statusButton.dataset.userEmail = user.email;
            statusButton.type = "button";
            statusButton.textContent = user.status === "Inactive" ? "Activate" : "Deactivate";
            actions.appendChild(statusButton);
        }
        actionsCell.appendChild(actions);
        row.appendChild(actionsCell);
        tableBody.appendChild(row);
    });
}

function showRegisteredUserDetails(user) {
    const details = document.getElementById("registeredUserDetails");
    const userIndex = readRecords(REGISTERED_USERS_STORAGE_KEY).findIndex((item) => item.email === user.email);
    document.getElementById("dialogUserName").textContent = user.name || "Registered user";
    details.replaceChildren();
    [
        ["User ID", user.userId || getRegisteredUserId(user, Math.max(0, userIndex))],
        ["Full Name", user.name || "—"],
        ["Email Address", user.email || "—"],
        ["Phone", user.phone || "—"],
        ["Registration Date", formatDate(user.createdAt)],
        ["Account Status", user.status || "Active"],
        ["Role", user.role || "User"]
    ].forEach(([label, value]) => {
        const wrapper = document.createElement("div");
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = value;
        wrapper.append(term, description);
        details.appendChild(wrapper);
    });
    document.getElementById("registeredUserDialog").showModal();
}

function renderRecentBooks(books) {
    const list = document.getElementById("recentBooks");
    list.replaceChildren();
    const recentBooks = [...books].sort( (first, second) => new Date(second.dateAdded || 0) - new Date(first.dateAdded || 0)).slice(0, 5);
    if (!recentBooks.length) return addEmptyState(list, "No books saved yet. Add your first book to begin.");
    recentBooks.forEach((book) => {
        const item = document.createElement("li");
        item.appendChild(createIcon("dashboard-book-icon", "▱"));
        const details = document.createElement("span");
        const title = document.createElement("strong");
        const metadata = document.createElement("small");
        title.textContent = book.bookName;
        metadata.textContent = `${book.author || "Unknown author"} · ${book.category || "Uncategorized"} · Added ${formatDate(book.dateAdded)}`;
        details.append(title, metadata);
        item.appendChild(details);
        list.appendChild(item);
    });
}

function renderRecentReturns(transactions) {
    const list = document.getElementById("recentReturns");
    list.replaceChildren();
    const recentReturns = transactions.filter((transaction) => transaction.status === "returned").sort((first, second) => new Date(second.returnedAt || second.returnDate) - new Date(first.returnedAt || first.returnDate)).slice(0, 4);
    if (!recentReturns.length) return addEmptyState(list, "No books have been returned yet.");
    recentReturns.forEach((transaction) => {
        const item = document.createElement("div");
        item.className = "return-item";
        const details = document.createElement("div");
        const bookName = document.createElement("strong");
        const studentName = document.createElement("small");
        const date = document.createElement("small");
        const badge = document.createElement("span");
        bookName.textContent = transaction.bookName;
        studentName.textContent = `Returned by ${transaction.studentName}`;
        date.textContent = formatDate(transaction.returnDate);
        badge.className = "status status-returned";
        badge.textContent = "Returned";
        details.append(bookName, studentName, date);
        item.append(details, badge);
        list.appendChild(item);
    });
}

function renderActivity(books, students, transactions) {
    const activity = [];
    books.forEach((book) => activity.push({ date: book.dateAdded, icon: "▱", text: `New book added: ${book.bookName}` }));
    students.forEach((student) => activity.push({ date: student.createdAt, icon: "♙", text: `New student registered: ${student.studentName}` }));
    transactions.forEach((transaction) => {
        activity.push({ date: transaction.issuedAt || transaction.issueDate, icon: "▥", text: `${transaction.studentName} borrowed: ${transaction.bookName}` });
        if (transaction.status === "returned") activity.push({ date: transaction.returnedAt || transaction.returnDate, icon: "↻", text: `${transaction.studentName} returned: ${transaction.bookName}` });
    });
    const list = document.getElementById("activityList");
    list.replaceChildren();
    const recentActivity = activity.filter((item) => item.date).sort((first, second) => new Date(second.date) - new Date(first.date)).slice(0, 7);
    if (!recentActivity.length) return addEmptyState(list, "No library activity yet.");
    recentActivity.forEach((item) => {
        const row = document.createElement("li");
        row.appendChild(createIcon("activity-icon", item.icon));
        const text = document.createElement("span");
        const description = document.createElement("strong");
        const date = document.createElement("small");
        description.textContent = item.text;
        date.textContent = formatDateTime(item.date);
        text.append(description, date);
        row.appendChild(text);
        list.appendChild(row);
    });
}

function renderDashboard() {
    const books = readRecords(BOOKS_STORAGE_KEY);
    const students = readRecords(STUDENTS_STORAGE_KEY);
    const transactions = readRecords(TRANSACTIONS_STORAGE_KEY);
    renderProfile();
    renderStats(books, students, transactions);
    renderRecentBooks(books);
    renderRecentReturns(transactions);
    renderActivity(books, students, transactions);
    renderRegisteredUsers();
}

renderDashboard();
document.getElementById("userSearch").addEventListener("input", renderRegisteredUsers);
document.getElementById("userStatusFilter").addEventListener("change", renderRegisteredUsers);
document.getElementById("closeRegisteredUserDialog").addEventListener("click", () => document.getElementById("registeredUserDialog").close());
document.getElementById("registeredUserTableBody").addEventListener("click", (event) => {
    const button = event.target.closest("[data-user-action]");
    if (!button) return;
    const users = readRecords(REGISTERED_USERS_STORAGE_KEY);
    const user = users.find((item) => item.userId === button.dataset.userId && button.dataset.userId)
        || users.find((item) => item.email === button.dataset.userEmail);
    if (!user) return;
    if (button.dataset.userAction === "view") showRegisteredUserDetails(user);
    if (button.dataset.userAction === "toggle-status" && user.role !== "Admin") {
        user.status = user.status === "Inactive" ? "Active" : "Inactive";
        saveUsers(users);
        renderDashboard();
    }
});
window.addEventListener("storage", (event) => {
    if (!event.key || [BOOKS_STORAGE_KEY, STUDENTS_STORAGE_KEY, TRANSACTIONS_STORAGE_KEY, REGISTERED_USERS_STORAGE_KEY].includes(event.key)) renderDashboard();
});
window.addEventListener("pageshow", renderDashboard);
