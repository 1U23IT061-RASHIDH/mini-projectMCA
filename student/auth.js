const USERS_STORAGE_KEY = "digitalLibraryUsers";
const SESSION_STORAGE_KEY = "digitalLibrarySession";
const LEGACY_SESSION_STORAGE_KEY = "digitalLibrarySession";
const USER_DASHBOARD_PATH = "dashboard/user-dashboard.html";
const ADMIN_DASHBOARD_PATH = "dashboard/dashboard.html";
const LOGIN_PATH = "login/login.html";

function getAppUrl(path) {
    const authScript = Array.from(document.scripts).find((script) => script.src.endsWith("/student/auth.js"));
    const appRoot = authScript ? new URL("../", authScript.src) : new URL("../", window.location.href);
    return new URL(path, appRoot).href;
}

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
        const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
        if (storedSession) return JSON.parse(storedSession);

        const legacySession = sessionStorage.getItem(LEGACY_SESSION_STORAGE_KEY);
        if (!legacySession) return null;
        const session = JSON.parse(legacySession);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        sessionStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
        return session;
    } catch (error) {
        return null;
    }
}

function setSession(user) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        userId: user.userId || "",
        name: user.name,
        email: user.email,
        role: user.role,
        loggedInAt: new Date().toISOString()
    }));
}

function clearSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

function getDashboardPath(user = getSession()) {
    return getAppUrl(user && user.role === "Admin" ? ADMIN_DASHBOARD_PATH : USER_DASHBOARD_PATH);
}

function redirectToDashboard(user = getSession()) {
    if (user) window.location.replace(getDashboardPath(user));
}

function requireAuth() {
    const session = getSession();
    if (!session) {
        document.documentElement.style.visibility = "hidden";
        window.location.replace(getAppUrl(LOGIN_PATH));
        return false;
    }
    return true;
}

function requireAdmin() {
    const session = getSession();
    if (!session) {
        document.documentElement.style.visibility = "hidden";
        window.location.replace(getAppUrl(LOGIN_PATH));
        return false;
    }
    const registeredUser = readUsers().find((user) => user.email === session.email);
    if (!registeredUser || registeredUser.status === "Inactive") {
        clearSession();
        document.documentElement.style.visibility = "hidden";
        window.location.replace(getAppUrl(LOGIN_PATH));
        return false;
    }
    if (session.role !== "Admin" || registeredUser.role !== "Admin") {
        document.documentElement.style.visibility = "hidden";
        window.location.replace(getDashboardPath(registeredUser));
        return false;
    }
    return true;
}

function requireUser() {
    const session = getSession();
    if (!session) {
        document.documentElement.style.visibility = "hidden";
        window.location.replace("../login/login.html");
        return false;
    }
    const registeredUser = readUsers().find((user) => user.email === session.email);
    if (!registeredUser || registeredUser.status === "Inactive") {
        clearSession();
        document.documentElement.style.visibility = "hidden";
        window.location.replace(getAppUrl(LOGIN_PATH));
        return false;
    }
    if (registeredUser.role === "Admin" && session.role === "Admin") {
        document.documentElement.style.visibility = "hidden";
        window.location.replace(getAppUrl(ADMIN_DASHBOARD_PATH));
        return false;
    }
    if (registeredUser.role !== "User" || session.role !== "User") {
        clearSession();
        document.documentElement.style.visibility = "hidden";
        window.location.replace(getAppUrl(LOGIN_PATH));
        return false;
    }
    return true;
}

function attachLogoutHandlers() {
    document.querySelectorAll(".logout").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            clearSession();
            window.location.replace(link.href);
        });
    });
}

function attachPasswordToggles() {
    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
        const input = document.getElementById(button.dataset.passwordToggle);
        if (!input) return;
        button.addEventListener("click", () => {
            const isVisible = input.type === "text";
            input.type = isVisible ? "password" : "text";
            button.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
            button.setAttribute("aria-pressed", String(!isVisible));
        });
    });
}