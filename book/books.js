const BOOKS_STORAGE_KEY = "digitalLibraryBooks";

const bookForm = document.getElementById("bookForm");
const bookTableBody = document.getElementById("bookTableBody");
const bookCount = document.getElementById("bookCount");
const addBookPanel = document.getElementById("addBookPanel");
const bookListPanel = document.getElementById("bookListPanel");
const formMessage = document.getElementById("formMessage");
const bookSearch = document.getElementById("bookSearch");
let editingBookId = null;

function getBooks() {
    const savedBooks = localStorage.getItem(BOOKS_STORAGE_KEY);

    if (!savedBooks) {
        return [];
    }

    try {
        const books = JSON.parse(savedBooks);
        return Array.isArray(books) ? books : [];
    } catch (error) {
        return [];
    }
}

function saveBooks(books) {
    localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books));
}

function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value;
    return cell;
}

function createBookCell(book) {
    const cell = document.createElement("td");
    const wrapper = document.createElement("div");
    const icon = document.createElement("span");
    const details = document.createElement("span");
    const title = document.createElement("strong");
    const id = document.createElement("small");

    wrapper.className = "book-cell";
    icon.className = `book-icon book-icon-${Math.abs(String(book.bookId).length % 4)}`;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = ["▱", "▥", "▰", "▤"][Math.abs(String(book.bookId).length % 4)];
    details.className = "book-cell-details";
    title.textContent = book.bookName;
    id.textContent = book.bookId;
    details.append(title, id);
    wrapper.append(icon, details);
    cell.appendChild(wrapper);
    return cell;
}

function renderBooks() {
    const books = getBooks();
    const query = bookSearch.value.trim().toLowerCase();
    const visibleBooks = books.filter((book) => Object.values(book).some((value) => String(value).toLowerCase().includes(query)));
    bookTableBody.replaceChildren();
    bookCount.textContent = `${visibleBooks.length} ${visibleBooks.length === 1 ? "book" : "books"}`;

    if (visibleBooks.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.className = "empty-state";
        cell.colSpan = 5;
        cell.textContent = query ? "No books match your search." : "No books saved yet. Add your first book to begin.";
        row.appendChild(cell);
        bookTableBody.appendChild(row);
        return;
    }

    visibleBooks.forEach((book) => {
        const row = document.createElement("tr");
        row.appendChild(createBookCell(book));
        row.appendChild(createCell(book.author));
        row.appendChild(createCell(book.category));
        row.appendChild(createCell(book.quantity));

        const actionCell = document.createElement("td");
        const editButton = document.createElement("button");
        editButton.className = "action-button";
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.dataset.bookId = book.bookId;
        editButton.dataset.action = "edit";
        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.dataset.bookId = book.bookId;
        actionCell.append(editButton, deleteButton);
        row.appendChild(actionCell);
        bookTableBody.appendChild(row);
    });
}

function showAddBookForm(book) {
    addBookPanel.hidden = false;
    bookListPanel.hidden = true;
    bookForm.reset();
    editingBookId = book ? book.bookId : null;
    document.querySelector("#addBookPanel h2").textContent = book ? "Edit Book" : "Add Book";
    ["bookId", "bookName", "author", "category", "publisher", "year", "quantity"].forEach((id) => {
        document.getElementById(`${id}Error`).textContent = "";
        document.getElementById(id).classList.remove("field-invalid");
    });
    updateWordCount("bookName");
    updateWordCount("author");
    updateCharacterCounts();
    if (book) {
        Object.entries(book).forEach(([key, value]) => {
            const input = document.getElementById(key);
            if (input) input.value = value;
        });
    }
    document.getElementById("bookId").focus();
}

function showBookList() {
    addBookPanel.hidden = true;
    bookListPanel.hidden = false;
    editingBookId = null;
    bookForm.reset();
    document.querySelector("#addBookPanel h2").textContent = "Add Book";
    formMessage.textContent = "";
    ["bookId", "bookName", "author", "category", "publisher", "year", "quantity"].forEach((id) => {
        document.getElementById(`${id}Error`).textContent = "";
        document.getElementById(id).classList.remove("field-invalid");
    });
    updateWordCount("bookName");
    updateWordCount("author");
    updateCharacterCounts();
}

function showMessage(message, type) {
    formMessage.className = `form-message ${type}`;
    formMessage.textContent = message;
}

function countWords(value) {
    return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function setBookFieldError(id, message) {
    const input = document.getElementById(id);
    const error = document.getElementById(`${id}Error`);
    error.textContent = message;
    input.classList.toggle("field-invalid", Boolean(message));
    return !message;
}

function updateWordCount(id) {
    const count = countWords(document.getElementById(id).value);
    document.getElementById(`${id}Count`).textContent = `${count} / 20 words`;
    return count;
}

const textFieldIds = ["bookId", "bookName", "author", "category", "publisher"];

function updateCharacterCounts() {
    textFieldIds.forEach((id) => {
        document.getElementById(`${id}CharacterCount`).textContent = `${document.getElementById(id).value.length}/50`;
    });
}

function validateBookField(id, books = getBooks()) {
    const value = document.getElementById(id).value.trim();
    let message = "";
    if (!value) message = `${id === "bookId" ? "Book ID" : id === "bookName" ? "Book Name" : id[0].toUpperCase() + id.slice(1)} is required.`;
    if (!message && textFieldIds.includes(id) && value.length > 50) message = "Maximum 50 characters allowed.";
    if (!message && ["bookName", "author"].includes(id) && countWords(value) > 20) message = "Maximum 20 words allowed.";
    if (!message && id === "bookId" && books.some((book) => book.bookId.toLowerCase() === value.toLowerCase() && book.bookId !== editingBookId)) message = "Book ID must be unique.";
    if (!message && id === "year" && (!Number.isInteger(Number(value)) || Number(value) < 0)) message = "Year must be a valid non-negative number.";
    if (!message && id === "quantity" && (!Number.isInteger(Number(value)) || Number(value) <= 0)) message = "Quantity must be greater than zero.";
    return setBookFieldError(id, message);
}

function validateBookForm() {
    const fields = ["bookId", "bookName", "author", "category", "publisher", "year", "quantity"];
    const books = getBooks();
    const valid = fields.map((id) => validateBookField(id, books)).every(Boolean);
    if (!valid) document.getElementById(fields.find((id) => !validateBookField(id, books))).focus();
    return valid;
}

["bookName", "author"].forEach((id) => {
    const input = document.getElementById(id);
    input.addEventListener("input", () => {
        updateWordCount(id);
        updateCharacterCounts();
        validateBookField(id);
    });
    input.addEventListener("blur", () => validateBookField(id));
});
["bookId", "category", "publisher", "year", "quantity"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
        updateCharacterCounts();
        validateBookField(id);
    });
    document.getElementById(id).addEventListener("blur", () => validateBookField(id));
});
textFieldIds.forEach((id) => document.getElementById(id).addEventListener("beforeinput", (event) => {
    if (event.data && document.getElementById(id).value.length + event.data.length > 50) {
        event.preventDefault();
        setBookFieldError(id, "Maximum 50 characters allowed.");
    }
}));
document.getElementById("showAddBookButton").addEventListener("click", showAddBookForm);
document.getElementById("cancelAddBookButton").addEventListener("click", showBookList);
bookSearch.addEventListener("input", renderBooks);

bookForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateBookForm()) {
        showMessage("Please correct the highlighted fields.", "error");
        return;
    }
    const formData = new FormData(bookForm);
    const bookId = formData.get("bookId").trim();
    const bookName = formData.get("bookName").trim();
    const quantity = Number(formData.get("quantity"));
    const books = getBooks();

    const bookRecord = {
        bookId,
        bookName,
        author: formData.get("author").trim(),
        category: formData.get("category").trim(),
        publisher: formData.get("publisher").trim(),
        year: formData.get("year"),
        quantity,
        dateAdded: editingBookId ? books.find((book) => book.bookId === editingBookId).dateAdded : new Date().toISOString()
    };
    const nextBooks = editingBookId ? books.map((book) => book.bookId === editingBookId ? bookRecord : book) : [...books, bookRecord];
    saveBooks(nextBooks);
    bookForm.reset();
    showMessage("Book saved successfully.", "success");
    renderBooks();
    window.setTimeout(showBookList, 700);
});

bookTableBody.addEventListener("click", (event) => {
    if (event.target.matches("[data-action='edit']")) {
        const book = getBooks().find((item) => item.bookId === event.target.dataset.bookId);
        if (book) showAddBookForm(book);
        return;
    }
    if (!event.target.matches(".delete-button")) {
        return;
    }

    const bookId = event.target.dataset.bookId;
    const books = getBooks().filter((book) => book.bookId !== bookId);
    saveBooks(books);
    renderBooks();
});

renderBooks();
