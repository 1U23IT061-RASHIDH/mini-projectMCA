const USERS_STORAGE_KEY = "digitalLibraryUsers";
const SESSION_STORAGE_KEY = "digitalLibrarySession";

function readUsers() {
    try {
        const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
        return Array.isArray(users) ? users : [];
    } catch (error) {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function getSession() {
    try {
        return JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) || "null");
    } catch (error) {
        return null;
    }
}

function setSession(user) {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        name: user.name,
        email: user.email,
        role: user.role,
        loggedInAt: new Date().toISOString()
    }));
}

function clearSession() {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

function requireAuth() {
    if (!getSession()) window.location.replace("../login/login.html");
}

function requireAdmin() {
    const session = getSession();
    const registeredAdmin = readUsers().find((user) => user.role === "Admin");
    if (!session) {
        window.location.replace("../login/login.html");
        return false;
    }
    if (!registeredAdmin || session.role !== "Admin" || session.email !== registeredAdmin.email) {
        window.location.replace("../dashboard/dashboard.html");
        return false;
    }
    return true;
}

function attachLogoutHandlers() {
    document.querySelectorAll(".logout").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            clearSession();
            window.location.href = "../login/login.html";
        });
    });
}