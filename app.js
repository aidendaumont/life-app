let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
tasks = tasks.map(t => typeof t === "string" ? {
    text: t,
    done: false,
} : t);
tasks.forEach(t => {
    if (!t.mode) t.mode = "untilDeleted";
    if (!t.date) t.date = today();
});

function save() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function show() {
    const list = document.getElementById("taskList");
    list.innerHTML = "";
    tasks.forEach((task, i) => {
        const li = document.createElement("li");

        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = task.done;
        box.onchange = () => {
            task.done = box.checked;
            task.doneDate = today();
            save();
            show();
        };

        const text = document.createElement("span");
        text.textContent = task.text;
        const tag = document.creatElement("small");
        tag.textContent = {
            today: "today",
            untilDone: "until done",
            untilDeleted: "keep",
        }[task.mode];
        if (task.done) li.classList.add("done");

        const del = document.createElement("button");
        del.textContent = "✕";
        del.onclick = () => {
            tasks.splice(i, 1);
            save();
            show();
        };

        li.append(box, text, tag, del);
        list.appendChild(li);
    });
}

function addTask() {
    const input = document.getElementById("taskInput");
    if (input.value === "") return;
    tasks.push({
        text: input.value,
        done: false,
        mode: document.getElementById("taskMode").value,
        date: today(),
    });
    input.value = "";
    save();
    show();
}

cleanup();
show();

function openTab(name) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.getElementById(name).classList.add("active");
}

function today() {
    return new Date().toLocaleDateString("en-CA");
}

function cleanup() {
    tasks = tasks.filter(task => {
        if (task.mode === "today") return task.date === today();
        if (task.mode === "untilDone") return !task.done || task.doneDate === today();
        return true;
    });
        save();
}
