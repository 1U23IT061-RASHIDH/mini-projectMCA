const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const registerName = document.getElementById("registerName");
const registerEmail = document.getElementById("registerEmail");
const registerPhone = document.getElementById("registerPhone");
const registerFields = {
    registerName: { error: "registerNameError", validate: (value) => value ? "" : "Name is required." },
    registerEmail: { error: "registerEmailError", validate: (value) => !value ? "Email is required." : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Invalid email format." : "" },
    registerPhone: { error: "registerPhoneError", validate: (value) => !value ? "Phone number is required." : !/^[0-9+()\-\s]{7,}$/.test(value) ? "Invalid phone number." : "" },
    registerPassword: { error: "registerPasswordError", validate: (value) => !value ? "Password is required." : value.length < 6 ? "Password must be at least 6 characters." : "" },
    registerRole: { error: "registerRoleError", validate: (value) => value ? "" : "Role is required." }
};

function showRegisterMessage(message, type) {
    registerMessage.className = `form-message ${type}`;
    registerMessage.textContent = message;
}

function validateRegisterField(id) {
    const input = document.getElementById(id);
    const config = registerFields[id];
    const message = id === "registerName" && input.value.length > 50 ? "Maximum 50 characters allowed." : id === "registerEmail" && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()) ? "Please enter a valid email address." : id === "registerEmail" && input.value.length > 50 ? "Maximum 50 characters allowed." : id === "registerPhone" && !/^\d{10}$/.test(input.value) ? "Phone number must be exactly 10 digits." : id === "registerRole" && input.value === "Admin" && readUsers().some((user) => user.role === "Admin") ? "Only one Admin account is allowed." : config.validate(input.value.trim());
    document.getElementById(config.error).textContent = message;
    input.classList.toggle("field-invalid", Boolean(message));
    return !message;
}

function updateRegisterNameCount() {
    document.getElementById("registerNameCharacterCount").textContent = `${registerName.value.length}/50`;
    document.getElementById("registerEmailCharacterCount").textContent = `${registerEmail.value.length}/50`;
}

function validateRegisterForm() {
    const valid = Object.keys(registerFields).map(validateRegisterField).every(Boolean);
    if (!valid) document.getElementById(Object.keys(registerFields).find((id) => !validateRegisterField(id))).focus();
    return valid;
}

Object.keys(registerFields).forEach((id) => {
    document.getElementById(id).addEventListener("input", () => validateRegisterField(id));
    document.getElementById(id).addEventListener("blur", () => validateRegisterField(id));
});

if (getSession()) window.location.replace("../dashboard/dashboard.html");

registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateRegisterForm()) {
        showRegisterMessage("Please correct the highlighted fields.", "error");
        return;
    }
    const user = {
        name: document.getElementById("registerName").value.trim(),
        email: document.getElementById("registerEmail").value.trim().toLowerCase(),
        phone: document.getElementById("registerPhone").value.trim(),
        password: document.getElementById("registerPassword").value,
        role: document.getElementById("registerRole").value
    };

    if (readUsers().some((item) => item.email === user.email)) return showRegisterMessage("An account with this email already exists.", "error");

    saveUsers([...readUsers(), { ...user, createdAt: new Date().toISOString() }]);
    showRegisterMessage("Registration successful. Redirecting to login...", "success");
    window.setTimeout(() => { window.location.href = "../login/login.html"; }, 800);
});
registerName.addEventListener("input", updateRegisterNameCount);
registerEmail.addEventListener("input", updateRegisterNameCount);
registerName.addEventListener("beforeinput", (event) => {
    if (event.data && registerName.value.length + event.data.length > 50) {
        event.preventDefault();
        document.getElementById("registerNameError").textContent = "Maximum 50 characters allowed.";
    }
});
registerEmail.addEventListener("beforeinput", (event) => {
    if (event.data && registerEmail.value.length + event.data.length > 50) {
        event.preventDefault();
        document.getElementById("registerEmailError").textContent = "Maximum 50 characters allowed.";
    }
});
registerPhone.addEventListener("beforeinput", (event) => {
    if (event.data && (!/^\d+$/.test(event.data) || registerPhone.value.length + event.data.length > 10)) {
        event.preventDefault();
        document.getElementById("registerPhoneError").textContent = "Phone number must be exactly 10 digits.";
    }
});
updateRegisterNameCount();