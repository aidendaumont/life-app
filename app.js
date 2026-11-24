let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
tasks = tasks.map(t => typeof t === "string" ? {
    text: t,
    done: false,
} : t);

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
            save();
            show();
        };

        const text = document.createElement("span");
        text.textContent = task.text;
        if (task.done) li.classList.add("done");

        const del = document.createElement("button");
        del.textContent = "✕";
        del.onclick = () => {
            tasks.splice(i, 1);
            save();
            show();
        };

        li.append(box, text, del);
        list.appendChild(li);
    });
}

function addTask() {
    const input = document.getElementById("taskInput");
    if (input.value === "") return;
    tasks.push({
        text: input.value,
        done: false,
    });
    input.value = "";
    save();
    show();
}

show();
