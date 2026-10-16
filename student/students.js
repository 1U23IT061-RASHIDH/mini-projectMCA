const STUDENTS_STORAGE_KEY = "digitalLibraryStudents";

const studentForm = document.getElementById("studentForm");
const studentTableBody = document.getElementById("studentTableBody");
const studentFormPanel = document.getElementById("studentFormPanel");
const studentMessage = document.getElementById("studentMessage");
const studentSearch = document.getElementById("studentSearch");
let editingStudentId = null;

function getStudents() {
    try {
        const students = JSON.parse(localStorage.getItem(STUDENTS_STORAGE_KEY) || "[]");
        return Array.isArray(students) ? students : [];
    } catch (error) {
        return [];
    }
}

function saveStudents(students) {
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
}

function cell(value) {
    const element = document.createElement("td");
    element.textContent = value;
    return element;
}

function showMessage(message, type) {
    studentMessage.className = `form-message ${type}`;
    studentMessage.textContent = message;
}

const studentFields = ["studentId", "studentName", "department", "email", "phone"];
const textFieldIds = ["studentName", "department"];
const characterCountFieldIds = ["studentName", "department", "email"];

function updateCharacterCounts() {
    characterCountFieldIds.forEach((id) => {
        document.getElementById(`${id}CharacterCount`).textContent = `${document.getElementById(id).value.length}/50`;
    });
}

function setStudentFieldError(id, message) {
    const input = document.getElementById(id);
    document.getElementById(`${id}Error`).textContent = message;
    input.classList.toggle("field-invalid", Boolean(message));
    return !message;
}

function validateStudentField(id, students = getStudents()) {
    const value = document.getElementById(id).value.trim();
    let message = value ? "" : `${id === "studentId" ? "Student ID" : id === "studentName" ? "Student Name" : id[0].toUpperCase() + id.slice(1)} is required.`;
    if (!message && id === "studentId" && value.length > 15) message = "Maximum 15 characters allowed.";
    if (!message && textFieldIds.includes(id) && value.length > 50) message = "Maximum 50 characters allowed.";
    if (!message && id === "email" && value.length > 50) message = "Maximum 50 characters allowed.";
    if (!message && id === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = "Please enter a valid email address.";
    if (!message && id === "phone" && !/^\d{10}$/.test(value)) message = "Phone number must be exactly 10 digits.";
    if (!message && id === "studentId" && students.some((student) => student.studentId.toLowerCase() === value.toLowerCase() && student.studentId !== editingStudentId)) message = "Student ID must be unique.";
    return setStudentFieldError(id, message);
}

function validateStudentForm() {
    const students = getStudents();
    const valid = studentFields.map((id) => validateStudentField(id, students)).every(Boolean);
    if (!valid) document.getElementById(studentFields.find((id) => !validateStudentField(id, students))).focus();
    return valid;
}

studentFields.forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
        updateCharacterCounts();
        validateStudentField(id);
    });
    document.getElementById(id).addEventListener("blur", () => validateStudentField(id));
});
document.getElementById("studentId").addEventListener("beforeinput", (event) => {
    if (event.data && document.getElementById("studentId").value.length + event.data.length > 15) {
        event.preventDefault();
        setStudentFieldError("studentId", "Maximum 15 characters allowed.");
    }
});
textFieldIds.forEach((id) => document.getElementById(id).addEventListener("beforeinput", (event) => {
    if (event.data && document.getElementById(id).value.length + event.data.length > 50) {
        event.preventDefault();
        setStudentFieldError(id, "Maximum 50 characters allowed.");
    }
}));
document.getElementById("phone").addEventListener("beforeinput", (event) => {
    if (event.data && (!/^\d+$/.test(event.data) || document.getElementById("phone").value.length + event.data.length > 10)) {
        event.preventDefault();
        setStudentFieldError("phone", "Phone number must be exactly 10 digits.");
    }
});

function resetForm() {
    studentForm.reset();
    editingStudentId = null;
    document.getElementById("studentFormTitle").textContent = "Add Student";
    showMessage("", "");
    studentFields.forEach((id) => {
        document.getElementById(`${id}Error`).textContent = "";
        document.getElementById(id).classList.remove("field-invalid");
    });
    updateCharacterCounts();
}

function openForm(student) {
    studentFormPanel.hidden = false;
    document.querySelector("main > section:last-of-type").hidden = true;
    resetForm();
    if (student) {
        editingStudentId = student.studentId;
        document.getElementById("studentFormTitle").textContent = "Edit Student";
        Object.entries(student).forEach(([key, value]) => {
            const input = document.getElementById(key);
            if (input) input.value = value;
        });
    }
    document.getElementById("studentId").focus();
}

function closeForm() {
    studentFormPanel.hidden = true;
    document.querySelector("main > section:last-of-type").hidden = false;
    resetForm();
}

function renderStudents() {
    const query = studentSearch.value.trim().toLowerCase();
    const students = getStudents();
    const filteredStudents = students.filter((student) => Object.values(student).some((value) => String(value).toLowerCase().includes(query)));
    studentTableBody.replaceChildren();
    document.getElementById("studentCount").textContent = `${filteredStudents.length} ${filteredStudents.length === 1 ? "student" : "students"}`;
    if (!filteredStudents.length) {
        const row = document.createElement("tr");
        const emptyCell = document.createElement("td");
        emptyCell.className = "empty-state";
        emptyCell.colSpan = 6;
        emptyCell.textContent = query ? "No students match your search." : "No students saved yet. Add your first student to begin.";
        row.appendChild(emptyCell);
        studentTableBody.appendChild(row);
        return;
    }
    filteredStudents.forEach((student) => {
        const row = document.createElement("tr");
        row.append(cell(student.studentId), cell(student.studentName), cell(student.department), cell(student.email), cell(student.phone));
        const actions = document.createElement("td");
        actions.className = "action-group";
        ["View", "Edit", "Delete"].forEach((label) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = label === "Delete" ? "danger-button" : "action-button";
            button.dataset.action = label.toLowerCase();
            button.dataset.studentId = student.studentId;
            button.textContent = label;
            actions.appendChild(button);
        });
        row.appendChild(actions);
        studentTableBody.appendChild(row);
    });
}

function showStudentDetails(student) {
    document.getElementById("dialogStudentName").textContent = student.studentName;
    const details = document.getElementById("studentDetails");
    details.replaceChildren();
    [["Student ID", student.studentId], ["Department", student.department], ["Email", student.email], ["Phone", student.phone]].forEach(([label, value]) => {
        const wrapper = document.createElement("div");
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = value;
        wrapper.append(term, description);
        details.appendChild(wrapper);
    });
    document.getElementById("studentDialog").showModal();
}

document.getElementById("showStudentFormButton").addEventListener("click", () => openForm());
document.getElementById("cancelStudentButton").addEventListener("click", closeForm);
document.getElementById("resetStudentButton").addEventListener("click", resetForm);
studentSearch.addEventListener("input", renderStudents);
document.getElementById("closeStudentDialog").addEventListener("click", () => document.getElementById("studentDialog").close());

studentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateStudentForm()) {
        showMessage("Please correct the highlighted fields.", "error");
        return;
    }
    const values = Object.fromEntries(new FormData(studentForm).entries());
    Object.keys(values).forEach((key) => { values[key] = values[key].trim(); });
    const students = getStudents();
    if (!editingStudentId) values.createdAt = new Date().toISOString();
    const nextStudents = editingStudentId ? students.map((student) => student.studentId === editingStudentId ? { ...values, createdAt: student.createdAt } : student) : [...students, values];
    saveStudents(nextStudents);
    renderStudents();
    showMessage(editingStudentId ? "Student updated successfully." : "Student saved successfully.", "success");
    window.setTimeout(closeForm, 600);
});

studentTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const student = getStudents().find((item) => item.studentId === button.dataset.studentId);
    if (!student) return;
    if (button.dataset.action === "view") showStudentDetails(student);
    if (button.dataset.action === "edit") openForm(student);
    if (button.dataset.action === "delete" && window.confirm(`Delete ${student.studentName}?`)) {
        saveStudents(getStudents().filter((item) => item.studentId !== student.studentId));
        renderStudents();
    }
});

renderStudents();
updateCharacterCounts();
