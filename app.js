let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
tasks = tasks.map(t => typeof t === "string" ? {
    text: t,
    done: false,
} : t);
tasks.forEach(t => {
    if (!t.mode) t.mode = "untilDeleted";
    if (!t.date) t.date = today();
});
let goals = JSON.parse(localStorage.getItem("goals")) || [];

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
        const tag = document.createElement("small");
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
showGoals();

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

function saveGoals() {
    localStorage.setItem("goals", JSON.stringify(goals));
}

function addGoal() {
    const name = document.getElementById("goalName");
    const target = document.getElementById("goalTarget");
    const deadline = document.getElementById("goalDeadline");
    if (name.value === "" || target.value === "") return;
    goals.push({
        name: name.value,
        target: Number(target.value),
        count: 0,
        deadline: deadline.value,
    });
    name.value = "";
    target.value = "";
    deadline.value = "";
    saveGoals();
    showGoals();
}
function daysLeft(deadline) {
    const diff = new Date(deadline) - new Date(today());
    return Math.round(diff / 86400000);
}

function showGoals() {
    const list = document.getElementById("goalList");
    list.innerHTML = "";
    goals.forEach((goal, i) => {
        const card = document.createElement("div");
        card.className = "goal";

        const percent = Math.min(100, Math.round(goal.count / goal.target * 100));

        let deadlineText = "";
        if (goal.deadline) {
            const d = daysLeft(goal.deadline);
            deadlineText = d >= 0 ? d + " days left" : "past deadline";
        }

        card.innerHTML = `
          <div class="goal-top">
            <strong>${goal.name}</strong>
            <small>${deadlineText}</small>
          </div>
          <div class="bar"><div class="fill" style="width: ${percent}%"></div></div>
          <div class="goal-bottom">
            <button class="minus">-</button>
            <span>${goal.count} / ${goal.target} (${percent}%)</span>
            <button class="plus">+</button>
            <button class="delete">✕</button>
          </div>
        `;

        card.querySelector(".plus").onclick = () => {
            goal.count++;
            saveGoals();
            showGoals();
        };
        card.querySelector(".minus").onclick = () => {
            if (goal.count > 0) goal.count--;
            saveGoals();
            showGoals();
        };
        card.querySelector(".delete").onclick = () => {
            goals.splice(i, 1);
            saveGoals();
            showGoals();
        };

        list.appendChild(card);
    });
}
