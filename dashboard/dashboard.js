const BOOKS_STORAGE_KEY = "digitalLibraryBooks";
const STUDENTS_STORAGE_KEY = "digitalLibraryStudents";
const TRANSACTIONS_STORAGE_KEY = "digitalLibraryTransactions";

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
    document.getElementById("totalBooks").textContent = books.length;
    document.getElementById("totalStudents").textContent = students.length;
    document.getElementById("issuedBooks").textContent = transactions.filter((transaction) => transaction.status === "issued").length;
    document.getElementById("returnedBooks").textContent = transactions.filter((transaction) => transaction.status === "returned").length;
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
    renderStats(books, students, transactions);
    renderRecentBooks(books);
    renderRecentReturns(transactions);
    renderActivity(books, students, transactions);
}

renderDashboard();
window.addEventListener("storage", renderDashboard);
window.addEventListener("pageshow", renderDashboard);
