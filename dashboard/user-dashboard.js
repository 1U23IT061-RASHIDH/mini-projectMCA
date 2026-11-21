function renderUserDashboard() {
    const session = getSession();
    if (!session) return;
    const name = session.name || "Library User";
    document.getElementById("profileName").textContent = name;
    document.getElementById("profileEmail").textContent = session.email || "";
    document.getElementById("profileAvatar").textContent = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "DL";
    document.getElementById("dashboardWelcome").textContent = `Welcome, ${name}`;

    const books = readLibraryRecords("digitalLibraryBooks");
    document.getElementById("totalBooks").textContent = books.length;
    document.getElementById("availableBooks").textContent = books.reduce((total, book) => total + Math.max(0, Number(book.quantity) || 0), 0);
}

function readLibraryRecords(key) {
    try {
        const values = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(values) ? values : [];
    } catch (error) {
        return [];
    }
}

renderUserDashboard();
window.addEventListener("storage", (event) => {
    if (!event.key || event.key === "digitalLibraryBooks") renderUserDashboard();
});
