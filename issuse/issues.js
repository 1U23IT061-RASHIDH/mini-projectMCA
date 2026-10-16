const BOOKS_STORAGE_KEY = "digitalLibraryBooks";
const STUDENTS_STORAGE_KEY = "digitalLibraryStudents";
const TRANSACTIONS_STORAGE_KEY = "digitalLibraryTransactions";

const issueFormPanel = document.getElementById("issueFormPanel");
const returnFormPanel = document.getElementById("returnFormPanel");
const transactionTableBody = document.getElementById("transactionTableBody");
const issueMessage = document.getElementById("issueMessage");
const returnMessage = document.getElementById("returnMessage");
const issueSearch = document.getElementById("issueSearch");
const statusFilter = document.getElementById("statusFilter");

function readStorage(key) {
    try {
        const values = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(values) ? values : [];
    } catch (error) {
        return [];
    }
}

function saveStorage(key, values) { localStorage.setItem(key, JSON.stringify(values)); }
function getBooks() { return readStorage(BOOKS_STORAGE_KEY); }
function getStudents() { return readStorage(STUDENTS_STORAGE_KEY); }
function getTransactions() { return readStorage(TRANSACTIONS_STORAGE_KEY); }
function today() { return new Date().toISOString().slice(0, 10); }
function setMessage(element, message, type) { element.className = `form-message ${type}`; element.textContent = message; }
function formatDate(value) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "-"; }

function setFieldError(id, message) {
    const input = document.getElementById(id);
    document.getElementById(`${id}Error`).textContent = message;
    input.classList.toggle("field-invalid", Boolean(message));
    return !message;
}

function validateIssueField(id) {
    const value = document.getElementById(id).value;
    const message = value ? "" : `${id === "issueBookId" ? "Book" : id === "issueStudentId" ? "Student" : id === "issueDate" ? "Issue Date" : "Due Date"} is required.`;
    return setFieldError(id, message);
}

function validateIssueForm() {
    const fields = ["issueBookId", "issueStudentId", "issueDate", "dueDate"];
    const valid = fields.map(validateIssueField).every(Boolean);
    const issueDate = document.getElementById("issueDate").value;
    const dueDate = document.getElementById("dueDate").value;
    if (issueDate && dueDate && dueDate < issueDate) {
        setFieldError("dueDate", "Due date cannot be before issue date.");
        return false;
    }
    if (!valid) document.getElementById(fields.find((id) => !validateIssueField(id))).focus();
    return valid;
}

function validateReturnField(id) {
    const value = document.getElementById(id).value;
    const message = value ? "" : `${id === "returnTransactionId" ? "Issued Book" : "Return Date"} is required.`;
    return setFieldError(id, message);
}

function validateReturnForm() {
    const fields = ["returnTransactionId", "returnDate"];
    const valid = fields.map(validateReturnField).every(Boolean);
    const transaction = getTransactions().find((item) => item.transactionId === document.getElementById("returnTransactionId").value && item.status === "issued");
    const returnDate = document.getElementById("returnDate").value;
    if (transaction && returnDate && returnDate < transaction.issueDate) {
        setFieldError("returnDate", "Return date cannot be before issue date.");
        return false;
    }
    if (!valid) document.getElementById(fields.find((id) => !validateReturnField(id))).focus();
    return valid;
}

["issueBookId", "issueStudentId", "issueDate", "dueDate"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => validateIssueField(id));
    document.getElementById(id).addEventListener("change", () => validateIssueField(id));
    document.getElementById(id).addEventListener("blur", () => validateIssueField(id));
});
["returnTransactionId", "returnDate"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => validateReturnField(id));
    document.getElementById(id).addEventListener("change", () => validateReturnField(id));
    document.getElementById(id).addEventListener("blur", () => validateReturnField(id));
});

function closePanels() {
    issueFormPanel.hidden = true;
    returnFormPanel.hidden = true;
    setMessage(issueMessage, "", "");
    setMessage(returnMessage, "", "");
    ["issueBookId", "issueStudentId", "issueDate", "dueDate", "returnTransactionId", "returnDate"].forEach((id) => {
        document.getElementById(`${id}Error`).textContent = "";
        document.getElementById(id).classList.remove("field-invalid");
    });
}

function setDateDefaults() {
    const currentDate = today();
    document.getElementById("issueDate").value = currentDate;
    const dueDate = new Date(`${currentDate}T00:00:00`);
    dueDate.setDate(dueDate.getDate() + 14);
    document.getElementById("dueDate").value = dueDate.toISOString().slice(0, 10);
    document.getElementById("returnDate").value = currentDate;
}

function fillSelects() {
    const bookSelect = document.getElementById("issueBookId");
    const studentSelect = document.getElementById("issueStudentId");
    const returnSelect = document.getElementById("returnTransactionId");
    bookSelect.replaceChildren();
    studentSelect.replaceChildren();
    returnSelect.replaceChildren();
    getBooks().forEach((book) => {
        const option = new Option(`${book.bookName} (${book.quantity} available)`, book.bookId);
        option.disabled = Number(book.quantity) <= 0;
        bookSelect.appendChild(option);
    });
    getStudents().forEach((student) => studentSelect.appendChild(new Option(`${student.studentName} (${student.studentId})`, student.studentId)));
    getTransactions().filter((transaction) => transaction.status === "issued").forEach((transaction) => returnSelect.appendChild(new Option(`${transaction.bookName} - ${transaction.studentName} (${transaction.transactionId})`, transaction.transactionId)));
    if (!bookSelect.options.length) bookSelect.appendChild(new Option("Add a book first", ""));
    if (!studentSelect.options.length) studentSelect.appendChild(new Option("Add a student first", ""));
    if (!returnSelect.options.length) returnSelect.appendChild(new Option("No issued books", ""));
}

function transactionStatus(transaction) {
    if (transaction.status === "returned") return "returned";
    return transaction.dueDate < today() ? "overdue" : "issued";
}

function renderTransactions() {
    const query = issueSearch.value.trim().toLowerCase();
    const filter = statusFilter.value;
    const transactions = getTransactions();
    const filtered = transactions.filter((transaction) => {
        const status = transactionStatus(transaction);
        return (filter === "all" || status === filter) && Object.values(transaction).some((value) => String(value).toLowerCase().includes(query));
    });
    transactionTableBody.replaceChildren();
    document.getElementById("transactionCount").textContent = `${filtered.length} ${filtered.length === 1 ? "transaction" : "transactions"}`;
    if (!filtered.length) {
        const row = document.createElement("tr");
        const emptyCell = document.createElement("td");
        emptyCell.className = "empty-state";
        emptyCell.colSpan = 8;
        emptyCell.textContent = query || filter !== "all" ? "No transactions match your filters." : "No transactions yet. Issue a book to begin.";
        row.appendChild(emptyCell);
        transactionTableBody.appendChild(row);
        return;
    }
    filtered.forEach((transaction) => {
        const status = transactionStatus(transaction);
        const row = document.createElement("tr");
        [transaction.transactionId, transaction.bookName, transaction.studentName, formatDate(transaction.issueDate), formatDate(transaction.dueDate), formatDate(transaction.returnDate)].forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });
        const statusCell = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = `status status-${status}`;
        badge.textContent = status[0].toUpperCase() + status.slice(1);
        statusCell.appendChild(badge);
        row.appendChild(statusCell);
        const actionCell = document.createElement("td");
        if (status !== "returned") {
            const returnButton = document.createElement("button");
            returnButton.className = "action-button";
            returnButton.type = "button";
            returnButton.dataset.returnId = transaction.transactionId;
            returnButton.textContent = "Return";
            actionCell.appendChild(returnButton);
        } else {
            actionCell.textContent = "Completed";
        }
        row.appendChild(actionCell);
        transactionTableBody.appendChild(row);
    });
}

function openIssueForm() { closePanels(); fillSelects(); issueFormPanel.hidden = false; setDateDefaults(); }
function openReturnForm(transactionId) { closePanels(); fillSelects(); returnFormPanel.hidden = false; setDateDefaults(); if (transactionId) document.getElementById("returnTransactionId").value = transactionId; }

document.getElementById("showIssueFormButton").addEventListener("click", openIssueForm);
document.getElementById("showReturnFormButton").addEventListener("click", () => openReturnForm());
document.querySelectorAll("[data-close-panel]").forEach((button) => button.addEventListener("click", closePanels));
issueSearch.addEventListener("input", renderTransactions);
statusFilter.addEventListener("change", renderTransactions);

document.getElementById("issueForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateIssueForm()) {
        setMessage(issueMessage, "Please correct the highlighted fields.", "error");
        return;
    }
    const values = Object.fromEntries(new FormData(event.target).entries());
    const books = getBooks();
    const students = getStudents();
    const book = books.find((item) => item.bookId === values.bookId);
    const student = students.find((item) => item.studentId === values.studentId);
    if (!book || !student) return setMessage(issueMessage, "Add a book and a student before issuing.", "error");
    if (Number(book.quantity) <= 0) return setMessage(issueMessage, "This book is currently unavailable.", "error");
    book.quantity = Number(book.quantity) - 1;
    saveStorage(BOOKS_STORAGE_KEY, books);
    const transaction = { transactionId: `TXN-${Date.now().toString().slice(-6)}`, bookId: book.bookId, bookName: book.bookName, studentId: student.studentId, studentName: student.studentName, issueDate: values.issueDate, dueDate: values.dueDate, returnDate: "", status: "issued", issuedAt: new Date().toISOString() };
    saveStorage(TRANSACTIONS_STORAGE_KEY, [...getTransactions(), transaction]);
    setMessage(issueMessage, "Book issued successfully.", "success");
    fillSelects();
    renderTransactions();
    window.setTimeout(closePanels, 700);
});

document.getElementById("returnForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateReturnForm()) {
        setMessage(returnMessage, "Please correct the highlighted fields.", "error");
        return;
    }
    const values = Object.fromEntries(new FormData(event.target).entries());
    const transactions = getTransactions();
    const transaction = transactions.find((item) => item.transactionId === values.transactionId && item.status === "issued");
    if (!transaction) return setMessage(returnMessage, "Select an active issued book.", "error");
    const books = getBooks();
    const book = books.find((item) => item.bookId === transaction.bookId);
    if (book) { book.quantity = Number(book.quantity) + 1; saveStorage(BOOKS_STORAGE_KEY, books); }
    transaction.returnDate = values.returnDate;
    transaction.status = "returned";
    transaction.returnedAt = new Date().toISOString();
    saveStorage(TRANSACTIONS_STORAGE_KEY, transactions);
    setMessage(returnMessage, "Book returned successfully.", "success");
    renderTransactions();
    window.setTimeout(closePanels, 700);
});

transactionTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-return-id]");
    if (button) openReturnForm(button.dataset.returnId);
});

fillSelects();
renderTransactions();
