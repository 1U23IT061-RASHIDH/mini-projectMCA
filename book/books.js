const BOOKS_STORAGE_KEY = "digitalLibraryBooks";
const TRANSACTIONS_STORAGE_KEY = "digitalLibraryTransactions";
const LOW_STOCK_THRESHOLD_KEY = "digitalLibraryLowStockThreshold";

const bookForm = document.getElementById("bookForm");
const bookTableBody = document.getElementById("bookTableBody");
const bookCount = document.getElementById("bookCount");
const addBookPanel = document.getElementById("addBookPanel");
const formMessage = document.getElementById("formMessage");
const bookSearch = document.getElementById("bookSearch");
const categoryFilter = document.getElementById("categoryFilter");
const bookSort = document.getElementById("bookSort");
const categoryList = document.getElementById("categoryList");
const deleteConfirmation = document.getElementById("deleteConfirmation");
const toastRegion = document.getElementById("toastRegion");
let editingBookId = null;
let pendingDeleteBookId = null;
let lowStockThreshold = getLowStockThreshold();
let storageReadErrorReported = false;

function getBooks() {
    try {
        const books = JSON.parse(localStorage.getItem(BOOKS_STORAGE_KEY) || "[]");
        return Array.isArray(books) ? books : [];
    } catch (error) {
        if (!storageReadErrorReported) {
            showToast("Saved book data could not be read. Check this browser's local storage.", "error");
            storageReadErrorReported = true;
        }
        return [];
    }
}

function saveBooks(books) {
    try {
        localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books));
        return true;
    } catch (error) {
        showToast("Books could not be saved to this browser's local storage.", "error");
        return false;
    }
}

function getLowStockThreshold() {
    try {
        const savedValue = localStorage.getItem(LOW_STOCK_THRESHOLD_KEY);
        const value = savedValue === null ? 3 : Number(savedValue);
        return Number.isInteger(value) && value >= 0 && value <= 99 ? value : 3;
    } catch (error) {
        showToast("Could not read the stock warning preference. Using the default threshold.", "error");
        return 3;
    }
}

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.textContent = message;
    toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3600);
}

function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value === null || value === undefined || value === "" ? "—" : value;
    return cell;
}

function createBookTitleCell(book) {
    const cell = document.createElement("td");
    const wrapper = document.createElement("div");
    const icon = document.createElement("span");
    const title = document.createElement("strong");
    wrapper.className = "book-title-cell";
    icon.className = `book-icon book-icon-${Math.abs(String(book.bookId).length % 4)}`;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "▤";
    title.className = "book-title";
    title.textContent = book.bookName;
    wrapper.append(icon, title);
    cell.appendChild(wrapper);
    return cell;
}

function renderStats(books) {
    const transactions = readRecords(TRANSACTIONS_STORAGE_KEY);
    const issuedBooks = transactions.filter((transaction) => transaction.status === "issued").length;
    const availableCopies = books.reduce((total, book) => total + Math.max(0, Number(book.quantity) || 0), 0);
    const categories = new Set(books.map((book) => String(book.category || "").trim().toLowerCase()).filter(Boolean));
    document.getElementById("totalBooks").textContent = books.length;
    document.getElementById("availableBooks").textContent = availableCopies;
    document.getElementById("issuedBooks").textContent = issuedBooks;
    document.getElementById("totalCategories").textContent = categories.size;
    document.getElementById("lowStockThresholdLabel").textContent = lowStockThreshold;
}

function readRecords(key) {
    try {
        const records = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(records) ? records : [];
    } catch (error) {
        showToast("Saved library activity could not be read from local storage.", "error");
        return [];
    }
}

function getCategoryRecords(books) {
    const records = new Map();
    books.forEach((book) => {
        const label = String(book.category || "").trim();
        if (!label) return;
        const key = label.toLocaleLowerCase();
        const record = records.get(key) || { label, count: 0 };
        record.count += 1;
        records.set(key, record);
    });
    return [...records.values()].sort((first, second) => first.label.localeCompare(second.label));
}

function renderCategories(books) {
    const categories = getCategoryRecords(books);
    const previousValue = categoryFilter.value;
    categoryFilter.replaceChildren(new Option("All categories", ""));
    categories.forEach((category) => categoryFilter.add(new Option(category.label, category.label)));
    categoryFilter.value = categories.some((category) => category.label === previousValue) ? previousValue : "";
    categoryList.replaceChildren();

    if (!categories.length) {
        const empty = document.createElement("span");
        empty.className = "category-empty";
        empty.textContent = "Add books to start organizing your collection by category.";
        categoryList.appendChild(empty);
        return;
    }

    categories.forEach((category) => {
        const button = document.createElement("button");
        const count = document.createElement("span");
        button.className = "category-chip";
        button.type = "button";
        button.dataset.category = category.label;
        button.classList.toggle("selected", category.label.toLocaleLowerCase() === categoryFilter.value.toLocaleLowerCase());
        button.setAttribute("aria-pressed", String(category.label.toLocaleLowerCase() === categoryFilter.value.toLocaleLowerCase()));
        button.textContent = category.label;
        count.textContent = category.count;
        button.appendChild(count);
        categoryList.appendChild(button);
    });
}

function sortBooks(books) {
    const [field, direction] = bookSort.value.split("-");
    const multiplier = direction === "desc" ? -1 : 1;
    return [...books].sort((first, second) => {
        if (field === "quantity") return ((Number(first.quantity) || 0) - (Number(second.quantity) || 0)) * multiplier;
        const firstValue = String(field === "id" ? first.bookId || "" : first.bookName || "");
        const secondValue = String(field === "id" ? second.bookId || "" : second.bookName || "");
        return firstValue.localeCompare(secondValue, undefined, { numeric: true, sensitivity: "base" }) * multiplier;
    });
}

function renderBooks() {
    const books = getBooks();
    renderStats(books);
    renderCategories(books);
    renderReports(books);
    const query = bookSearch.value.trim().toLocaleLowerCase();
    const selectedCategory = categoryFilter.value.toLocaleLowerCase();
    const matchingBooks = books.filter((book) => {
        const matchesQuery = Object.values(book).some((value) => String(value).toLocaleLowerCase().includes(query));
        const matchesCategory = !selectedCategory || String(book.category || "").toLocaleLowerCase() === selectedCategory;
        return matchesQuery && matchesCategory;
    });
    const visibleBooks = sortBooks(matchingBooks);
    bookTableBody.replaceChildren();
    bookCount.textContent = `${visibleBooks.length} ${visibleBooks.length === 1 ? "book" : "books"}`;

    if (visibleBooks.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.className = "empty-state";
        cell.colSpan = 7;
        cell.textContent = books.length ? "No books match your search or selected category." : "No books saved yet. Add your first book to begin.";
        row.appendChild(cell);
        bookTableBody.appendChild(row);
        return;
    }

    visibleBooks.forEach((book) => {
        const row = document.createElement("tr");
        const idCell = createCell(book.bookId);
        idCell.className = "book-id-cell";
        row.appendChild(idCell);
        row.appendChild(createBookTitleCell(book));
        row.appendChild(createCell(book.author));
        const categoryCell = createCell(book.category);
        categoryCell.replaceChildren();
        const categoryBadge = document.createElement("span");
        categoryBadge.className = "book-category";
        categoryBadge.textContent = book.category || "Uncategorized";
        categoryCell.appendChild(categoryBadge);
        row.appendChild(categoryCell);
        const quantityCell = document.createElement("td");
        const quantityBadge = document.createElement("span");
        const quantity = Number(book.quantity) || 0;
        quantityBadge.className = `quantity-badge${quantity <= lowStockThreshold ? " low" : ""}`;
        quantityBadge.textContent = quantity;
        quantityCell.appendChild(quantityBadge);
        row.appendChild(quantityCell);
        row.appendChild(createCell(book.publisher));

        const actionCell = document.createElement("td");
        const actionGroup = document.createElement("div");
        actionGroup.className = "action-group";
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
        deleteButton.dataset.action = "delete";
        actionGroup.append(editButton, deleteButton);
        actionCell.appendChild(actionGroup);
        row.appendChild(actionCell);
        bookTableBody.appendChild(row);
    });
}

function getReportData(books) {
    const reportType = document.getElementById("reportType").value;
    const fromDate = document.getElementById("reportDateFrom").value;
    const toDate = document.getElementById("reportDateTo").value;
    const issuedCopiesByBook = new Map();
    let reportBooks = books;
    let error = "";

    if (reportType === "added") {
        if (fromDate && toDate && fromDate > toDate) {
            error = "The start date must be on or before the end date.";
            reportBooks = [];
        } else if (fromDate || toDate) {
            reportBooks = books.filter((book) => {
                const timestamp = Date.parse(book.dateAdded || "");
                if (Number.isNaN(timestamp)) return false;
                const addedDate = new Date(timestamp).toISOString().slice(0, 10);
                return (!fromDate || addedDate >= fromDate) && (!toDate || addedDate <= toDate);
            });
        }
    }

    readRecords(TRANSACTIONS_STORAGE_KEY)
        .filter((transaction) => transaction.status === "issued")
        .forEach((transaction) => {
            const bookId = String(transaction.bookId || "");
            issuedCopiesByBook.set(bookId, (issuedCopiesByBook.get(bookId) || 0) + 1);
        });

    const categories = new Map();
    reportBooks.forEach((book) => {
        const label = String(book.category || "").trim() || "Uncategorized";
        const key = label.toLocaleLowerCase();
        const available = Math.max(0, Number(book.quantity) || 0);
        const totalCopies = available + (issuedCopiesByBook.get(String(book.bookId || "")) || 0);
        const category = categories.get(key) || { label, titles: 0, copies: 0, lowStock: 0 };
        category.titles += 1;
        category.copies += totalCopies;
        if (available <= lowStockThreshold) category.lowStock += 1;
        categories.set(key, category);
    });

    const categoryRows = [...categories.values()].sort((first, second) =>
        second.titles - first.titles || first.label.localeCompare(second.label)
    );
    const availableCopies = reportBooks.reduce((total, book) => total + Math.max(0, Number(book.quantity) || 0), 0);
    const issuedCopies = reportBooks.reduce((total, book) => total + (issuedCopiesByBook.get(String(book.bookId || "")) || 0), 0);
    const totalCopies = availableCopies + issuedCopies;
    const lowStockBooks = reportBooks.filter((book) => Math.max(0, Number(book.quantity) || 0) <= lowStockThreshold).length;
    const totalCategories = new Set(
        reportBooks.map((book) => String(book.category || "").trim().toLocaleLowerCase()).filter(Boolean)
    ).size;
    return { books: reportBooks, categories: categoryRows, totalCopies, availableCopies, lowStockBooks, totalCategories, error, reportType, fromDate, toDate };
}

function renderReports(books = getBooks()) {
    const data = getReportData(books);
    const filterMessage = document.getElementById("reportFilterMessage");
    const dateFilter = document.getElementById("reportDateFilter");
    dateFilter.hidden = data.reportType !== "added";
    filterMessage.textContent = data.error;
    document.getElementById("reportScopeDescription").textContent = data.reportType === "added"
        ? `Books added${data.fromDate || data.toDate ? ` from ${data.fromDate || "any date"} to ${data.toDate || "any date"}` : " across all dates"}.`
        : "A live view of your catalogue inventory and category distribution.";

    document.getElementById("reportTotalTitles").textContent = data.books.length;
    document.getElementById("reportTotalCopies").textContent = data.totalCopies;
    document.getElementById("reportAvailableCopies").textContent = data.availableCopies;
    document.getElementById("reportLowStock").textContent = data.lowStockBooks;
    document.getElementById("reportTotalCategories").textContent = data.totalCategories;
    document.getElementById("inventoryReportCount").textContent = `${data.categories.length} ${data.categories.length === 1 ? "category" : "categories"}`;
    document.getElementById("reportDataNote").textContent = data.reportType === "added"
        ? "Showing books by their dateAdded record. Total copies include currently available copies and active issue records; available copies use the current quantity."
        : "Total copies combine current available quantities with active issue records. Available copies use each book record’s current quantity.";

    const chart = document.getElementById("categoryChart");
    chart.replaceChildren();
    const tableBody = document.getElementById("inventoryTableBody");
    tableBody.replaceChildren();
    if (!data.categories.length) {
        const message = document.createElement("p");
        message.className = "report-empty";
        message.textContent = data.error ? "Correct the date range to view this report." : "No book records are available for this report.";
        chart.appendChild(message);
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 4;
        cell.className = "empty-state";
        cell.textContent = data.error ? "Correct the date range to view this report." : "No inventory to summarize.";
        row.appendChild(cell);
        tableBody.appendChild(row);
        return data;
    }

    const maximumTitles = Math.max(...data.categories.map((category) => category.titles));
    data.categories.forEach((category) => {
        const chartRow = document.createElement("div");
        const label = document.createElement("span");
        const track = document.createElement("span");
        const fill = document.createElement("span");
        const value = document.createElement("strong");
        chartRow.className = "chart-row";
        label.className = "chart-label";
        label.textContent = category.label;
        track.className = "chart-track";
        fill.className = "chart-fill";
        fill.style.width = `${Math.max(5, (category.titles / maximumTitles) * 100)}%`;
        track.appendChild(fill);
        value.className = "chart-value";
        value.textContent = category.titles;
        chartRow.append(label, track, value);
        chart.appendChild(chartRow);

        const row = document.createElement("tr");
        row.append(createCell(category.label), createCell(category.titles), createCell(category.copies), createCell(category.lowStock));
        tableBody.appendChild(row);
    });

    const totalRow = document.createElement("tr");
    totalRow.className = "inventory-total-row";
    totalRow.append(
        createCell("Total"),
        createCell(data.books.length),
        createCell(data.totalCopies),
        createCell(data.lowStockBooks)
    );
    tableBody.appendChild(totalRow);
    return data;
}

function showAddBookForm(book) {
    addBookPanel.hidden = false;
    bookForm.reset();
    editingBookId = book ? book.bookId : null;
    document.getElementById("bookFormHeading").textContent = book ? "Edit Book" : "Add New Book";
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
    document.getElementById("bookId").focus({ preventScroll: true });
}

function showBookList() {
    addBookPanel.hidden = true;
    editingBookId = null;
    bookForm.reset();
    document.getElementById("bookFormHeading").textContent = "Add New Book";
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
    if (!message && id === "bookId" && books.some((book) => String(book.bookId || "").toLowerCase() === value.toLowerCase() && book.bookId !== editingBookId)) message = "Book ID must be unique.";
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
document.getElementById("showAddBookButton").addEventListener("click", () => showAddBookForm());
document.getElementById("sidebarAddBook").addEventListener("click", (event) => {
    event.preventDefault();
    showAddBookForm();
});
document.getElementById("cancelAddBookButton").addEventListener("click", showBookList);
document.getElementById("cancelFormButton").addEventListener("click", showBookList);
bookSearch.addEventListener("input", renderBooks);
categoryFilter.addEventListener("change", renderBooks);
bookSort.addEventListener("change", renderBooks);
document.getElementById("clearCategoryFilter").addEventListener("click", () => {
    categoryFilter.value = "";
    renderBooks();
});
categoryList.addEventListener("click", (event) => {
    const categoryButton = event.target.closest("button[data-category]");
    if (!categoryButton) return;
    categoryFilter.value = categoryButton.dataset.category;
    renderBooks();
    document.getElementById("all-books").scrollIntoView({ behavior: "smooth", block: "start" });
});

bookForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateBookForm()) {
        showMessage("Please correct the highlighted fields.", "error");
        showToast("Please correct the highlighted book details.", "error");
        return;
    }
    const formData = new FormData(bookForm);
    const bookId = String(formData.get("bookId")).trim();
    const bookName = String(formData.get("bookName")).trim();
    const quantity = Number(formData.get("quantity"));
    const books = getBooks();
    const existingBook = editingBookId ? books.find((book) => book.bookId === editingBookId) : null;
    const bookRecord = {
        ...(existingBook || {}),
        bookId,
        bookName,
        author: String(formData.get("author")).trim(),
        category: String(formData.get("category")).trim(),
        publisher: String(formData.get("publisher")).trim(),
        year: formData.get("year"),
        quantity,
        dateAdded: existingBook ? existingBook.dateAdded : new Date().toISOString()
    };
    const nextBooks = editingBookId ? books.map((book) => book.bookId === editingBookId ? bookRecord : book) : [...books, bookRecord];
    if (!saveBooks(nextBooks)) return;
    bookForm.reset();
    showMessage(editingBookId ? "Book updated successfully." : "Book added successfully.", "success");
    showToast(editingBookId ? "Book updated successfully." : "Book added successfully.");
    renderBooks();
    window.setTimeout(showBookList, 700);
});

bookTableBody.addEventListener("click", (event) => {
    const actionButton = event.target.closest("button[data-action]");
    if (!actionButton) return;
    if (actionButton.dataset.action === "edit") {
        const book = getBooks().find((item) => item.bookId === actionButton.dataset.bookId);
        if (book) showAddBookForm(book);
        return;
    }
    pendingDeleteBookId = actionButton.dataset.bookId;
    const book = getBooks().find((item) => item.bookId === pendingDeleteBookId);
    document.getElementById("deleteConfirmationMessage").textContent = book
        ? `“${book.bookName}” will be permanently removed from your catalogue. This action cannot be undone.`
        : "This book will be permanently removed from your catalogue. This action cannot be undone.";
    deleteConfirmation.showModal();
});

deleteConfirmation.addEventListener("close", () => {
    if (deleteConfirmation.returnValue === "delete" && pendingDeleteBookId !== null) {
        const nextBooks = getBooks().filter((book) => book.bookId !== pendingDeleteBookId);
        if (saveBooks(nextBooks)) {
            renderBooks();
            showToast("Book deleted successfully.");
        }
    }
    pendingDeleteBookId = null;
});

document.getElementById("settingsButton").addEventListener("click", () => {
    document.getElementById("lowStockThreshold").value = lowStockThreshold;
    document.getElementById("settingsDialog").showModal();
});

function closeSettings() {
    document.getElementById("settingsDialog").close();
}

document.getElementById("closeSettingsButton").addEventListener("click", closeSettings);
document.getElementById("closeSettingsButtonBottom").addEventListener("click", closeSettings);
document.getElementById("settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const threshold = Number(document.getElementById("lowStockThreshold").value);
    if (!Number.isInteger(threshold) || threshold < 0 || threshold > 99) {
        showToast("Enter a whole-number threshold between 0 and 99.", "error");
        return;
    }
    try {
        localStorage.setItem(LOW_STOCK_THRESHOLD_KEY, String(threshold));
        lowStockThreshold = threshold;
        renderBooks();
        closeSettings();
        showToast("Catalogue settings saved.");
    } catch (error) {
        showToast("Settings could not be saved to this browser's local storage.", "error");
    }
});

addBookPanel.addEventListener("click", (event) => {
    if (event.target === addBookPanel) showBookList();
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !addBookPanel.hidden) showBookList();
});

renderBooks();
window.addEventListener("storage", renderBooks);

document.querySelectorAll(".side-nav a[href^='#']").forEach((link) => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".side-nav a[href^='#']").forEach((item) => {
            item.classList.toggle("active", item === link);
            if (item === link) item.setAttribute("aria-current", "location");
            else item.removeAttribute("aria-current");
        });
    });
});

["reportType", "reportDateFrom", "reportDateTo"].forEach((id) => {
    document.getElementById(id).addEventListener(id === "reportType" ? "change" : "input", () => renderReports());
});

function csvValue(value) {
    const text = String(value ?? "");
    const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
}

document.getElementById("exportReportButton").addEventListener("click", () => {
    try {
        const data = getReportData(getBooks());
        if (data.error) {
            showToast(data.error, "error");
            return;
        }
        const period = data.reportType === "added"
            ? `${data.fromDate || "Any date"} to ${data.toDate || "Any date"}`
            : "Current inventory";
        const rows = [
            ["Section", "Metric", "Value", "Category", "Book Titles", "Copies", "Low-stock Books"],
            ["Report", "Type", data.reportType === "added" ? "Books added in date range" : "Inventory overview", "", "", "", "", ""],
            ["Report", "Period", period, "", "", "", ""],
            ["Report", "Generated", new Date().toISOString(), "", "", "", ""],
            ["Summary", "Total Book Titles", data.books.length, "", "", "", ""],
            ["Summary", "Total Copies", data.totalCopies, "", "", "", ""],
            ["Summary", "Available Copies", data.availableCopies, "", "", "", ""],
            ["Summary", "Low-Stock Books", data.lowStockBooks, "", "", "", ""],
            ["Summary", "Total Categories", data.totalCategories, "", "", "", ""],
            ...data.categories.map((category) => ["Category", "", "", category.label, category.titles, category.copies, category.lowStock]),
            ["Category", "", "", "Total", data.books.length, data.totalCopies, data.lowStockBooks]
        ];
        const csv = `\uFEFF${rows.map((row) => row.map(csvValue).join(",")).join("\r\n")}`;
        const file = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(file);
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = `library-report-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast("Report exported as CSV.");
    } catch (error) {
        showToast("The report could not be exported. Please try again.", "error");
    }
});

document.getElementById("printReportButton").addEventListener("click", () => {
    document.body.classList.add("printing-report");
    window.print();
});

window.addEventListener("afterprint", () => document.body.classList.remove("printing-report"));
