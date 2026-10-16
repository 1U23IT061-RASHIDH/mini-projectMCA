const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const loginEmail = document.getElementById("loginEmail");
const loginFields = {
    loginEmail: { error: "loginEmailError", validate: (value) => !value ? "Email is required." : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Please enter a valid email address." : "" },
    loginPassword: { error: "loginPasswordError", validate: (value) => value ? "" : "Password is required." },
    loginRole: { error: "loginRoleError", validate: (value) => value ? "" : "Role is required." }
};

function showLoginMessage(message, type) {
    loginMessage.className = `form-message ${type}`;
    loginMessage.textContent = message;
}

function validateLoginField(id) {
    const input = document.getElementById(id);
    const config = loginFields[id];
    const message = id === "loginEmail" && input.value.length > 50 ? "Maximum 50 characters allowed." : config.validate(input.value.trim());
    document.getElementById(config.error).textContent = message;
    input.classList.toggle("field-invalid", Boolean(message));
    return !message;
}

function updateLoginEmailCount() {
    document.getElementById("loginEmailCharacterCount").textContent = `${loginEmail.value.length}/50`;
}

function validateLoginForm() {
    const valid = Object.keys(loginFields).map(validateLoginField).every(Boolean);
    if (!valid) document.getElementById(Object.keys(loginFields).find((id) => !validateLoginField(id))).focus();
    return valid;
}

Object.keys(loginFields).forEach((id) => {
    document.getElementById(id).addEventListener("input", () => validateLoginField(id));
    document.getElementById(id).addEventListener("blur", () => validateLoginField(id));
});

if (getSession()) window.location.replace("../dashboard/dashboard.html");

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateLoginForm()) {
        showLoginMessage("Please correct the highlighted fields.", "error");
        return;
    }
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const role = document.getElementById("loginRole").value;

    const user = readUsers().find((item) => item.email === email && item.password === password && item.role === role);
    if (!user) {
        showLoginMessage("Invalid email, password, or role. Please try again.", "error");
        return;
    }

    setSession(user);
    showLoginMessage("Login Successful! Redirecting to your dashboard...", "success");
    window.setTimeout(() => { window.location.href = "../dashboard/dashboard.html"; }, 700);
});
loginEmail.addEventListener("input", updateLoginEmailCount);
loginEmail.addEventListener("beforeinput", (event) => {
    if (event.data && loginEmail.value.length + event.data.length > 50) {
        event.preventDefault();
        document.getElementById("loginEmailError").textContent = "Maximum 50 characters allowed.";
    }
});
updateLoginEmailCount();