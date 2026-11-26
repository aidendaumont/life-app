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
let settings = JSON.parse(localStorage.getItem("settings")) || {
    brain: false,
};
let brain = JSON.parse(localStorage.getItem("brain")) || [];
let brainView = null;
let dragging = null;
let camera = {
    x: 0,
    y:0,
    scale: 1,
};
let pointers = new Map();
let pan = null;
let pinch = null;

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
showSettings();
showBrain();

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

function saveSettings() {
    localStorage.setItem("settings", JSON.stringify(settings));
}

function toggleBrain() {
    settings.brain = document.getElementById("brainToggle").checked;
    saveSettings();
    showSettings();
}

function showSettings() {
    document.getElementById("brainToggle").checked = settings.brain;
    document.getElementById("brainTab").style.display = settings.brain ? "" : "none";
}

// brain: saving and finding

function saveBrain() {
  localStorage.setItem("brain", JSON.stringify(brain));
}

function findBubble(id) {
  return brain.find(b => b.id === id);
}

function childrenOf(id) {
  return brain.filter(b => b.parent === id);
}

function progress(id) {
  const kids = childrenOf(id).filter(k => k.type !== "note");
  if (kids.length === 0) return null;
  let total = 0;
  kids.forEach(k => {
    if (k.type === "step") total += k.done ? 1 : 0;
    else total += progress(k.id) || 0;
  });
  return total / kids.length;
}

function isFinished(bubble) {
  if (bubble.type === "step") return bubble.done;
  return progress(bubble.id) === 1;
}

// brain: smart helper

const knownOrders = [
  ["spanish", "portuguese"],
  ["spanish", "italian"],
  ["html", "css"],
  ["css", "javascript"],
  ["javascript", "react"],
  ["scratch", "python"]
];

function autoLink(bubble) {
  const siblings = childrenOf(bubble.parent).filter(s => s.id !== bubble.id);
  const name = bubble.text.toLowerCase();
  knownOrders.forEach(([first, then]) => {
    if (name.includes(then)) {
      const match = siblings.find(s => s.text.toLowerCase().includes(first));
      if (match) bubble.after = match.id;
    }
    if (name.includes(first)) {
      siblings.forEach(s => {
        if (s.text.toLowerCase().includes(then) && !s.after) s.after = bubble.id;
      });
    }
  });
}

// brain: actions

function addBubble() {
  const input = document.getElementById("bubbleText");
  if (input.value === "") return;
  const bubble = {
    id: Date.now(),
    text: input.value,
    type: document.getElementById("bubbleType").value,
    parent: brainView,
    done: false,
    after: null
  };
  brain.push(bubble);
  autoLink(bubble);
  input.value = "";
  saveBrain();
  showBrain();
}

function zoomIn(id) {
    brainView = id;
    resetCamera();
    showBrain();
}

function zoomOut() {
  if (brainView === null) return;
  brainView = findBubble(brainView).parent;
  resetCamera();
  showBrain();
}

function setAfter() {
  const value = document.getElementById("afterSelect").value;
  findBubble(brainView).after = value === "" ? null : Number(value);
  saveBrain();
  showBrain();
}

function deleteBubble() {
  if (brainView === null) return;
  if (!confirm("Delete this bubble and everything inside it?")) return;
  const doomed = [brainView];
  for (let i = 0; i < doomed.length; i++) {
    childrenOf(doomed[i]).forEach(k => doomed.push(k.id));
  }
  const parent = findBubble(brainView).parent;
  brain = brain.filter(b => !doomed.includes(b.id));
  brain.forEach(b => { if (doomed.includes(b.after)) b.after = null; });
  brainView = parent;
  saveBrain();
  showBrain();
}

// brain: drawing

function svgEl(tag, attrs, parent) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const name in attrs) el.setAttribute(name, attrs[name]);
  parent.appendChild(el);
  return el;
}

function wrapText(text, max) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  words.forEach(w => {
    if ((line + " " + w).trim().length > max && line !== "") {
      lines.push(line);
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  });
  lines.push(line);
  return lines.slice(0, 3);
}

function smoothPath(points) {
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

function routeLine(a, b, obstacles, bow) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return "";
  const len = Math.sqrt(len2);
  const nx = -dy / len, ny = dx / len;
  const waypoints = [];

  obstacles.forEach(o => {
    const t = ((o.x - a.x) * dx + (o.y - a.y) * dy) / len2;
    if (t <= 0 || t >= 1) return;
    const px = a.x + dx * t, py = a.y + dy * t;
    const dist = Math.hypot(px - o.x, py - o.y);
    if (dist >= o.r) return;
    let ux = nx, uy = ny;
    if (dist > 1) {
        ux = (px - o.x) / dist;
        uy = (py - o.y) / dist;
    }
    waypoints.push({
        t,
        x: o.x + ux * o.r,
        y: o.y + uy * o.r,
    });
  });

  if (waypoints.length === 0) {
    waypoints.push({
        t: 0.5,
        x: a.x + dx / 2 + nx * bow * len,
        y: a.y + dy / 2 + ny * bow * len,
    });
  }

  waypoints.sort((p, q) => p.t - q.t);
  return smoothPath([a, ...waypoints, b]);
}

function drawBubble(group, item, x, y, r, isCenter) {
  const p = item ? progress(item.id) : null;
  const type = item ? item.type : "goal";

  if (p !== null) {
    const ringR = r + 5;
    const around = 2 * Math.PI * ringR;
    svgEl("circle", {
        cx: x,
        cy: y,
        r: ringR,
        class: "ring-bg",
    }, group);
    svgEl("circle", {
      cx: x, cy: y, r: ringR, class: "ring",
      "stroke-dasharray": around * p + " " + around,
      transform: `rotate(-90 ${x} ${y})`
    }, group);
  }

  const g = svgEl("g", {
      class: "bubble " + type + (item && item.done ? " done" : ""),
  }, group);
  svgEl("circle", {
      cx: x,
      cy: y,
      r: r,
  }, g);

  const label = item ? (item.done ? "✓ " : "") + item.text : "My brain";
  const lines = wrapText(label, isCenter ? 12 : 10);
  const shift = p !== null ? 6 : 0;
  lines.forEach((line, i) => {
    const t = svgEl("text", {
      x: x, y: y + (i - (lines.length - 1) / 2) * 14 - shift,
      "text-anchor": "middle", "dominant-baseline": "central"
    }, g);
    t.textContent = line;
  });

  if (p !== null) {
    const t = svgEl("text", {
      x: x, y: y + lines.length * 7 + 2, class: "pct",
      "text-anchor": "middle", "dominant-baseline": "central"
    }, g);
    t.textContent = Math.round(p * 100) + "%";
  }

  g.onpointerdown = e => startDrag(e, item, isCenter);
}

function showBrain(animate = true) {
  const map = document.getElementById("brainMap");
  map.innerHTML = "";
  const group = svgEl("g", {
      class: animate ? "zoom" : "",
  }, map);

  const center = brainView === null ? null : findBubble(brainView);
  const kids = childrenOf(brainView);
  const cx = 180, cy = 180, R = 120;

  const spots = kids.map((k, i) => {
      if (k.x != null) return {
          x: k.x,
          y: k.y,
      };
      const angle = -Math.PI / 2 + i * 2 * Math.PI / kids.length;
      return {
          x: cx + R * Math.cos(angle),
          y: cy + R * Math.sin(angle),
      };
  });

  // bubbles the lines avoid (center 1st, then each child)
  const obstacles = [{
        x: cx,
        y: cy,
        r: 60,
    },
    ...spots.map(s => ({
        x: s.x,
        y: s.y,
        r: 50,
    }))
  ];

  // branches from center
  spots.forEach((s, i) => {
    const others = obstacles.filter((o, n) => n !== 0 && n !== i + 1);
    const d = routeLine({
        x: cx,
        y: cy,
    }, s, others, 0.1);
    svgEl("path", {
        d,
        class: "branch",
    }, group);
  });

  // dashed "do first" links
  kids.forEach((k, i) => {
    const j = kids.findIndex(s => s.id === k.after);
    if (j === -1) return;
    const a = spots[j], b = spots[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
    const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
    const side = Math.sign((midX - cx) * nx + (midY - cy) * ny) || 1;
    const others = obstacles.filter((o, n) => n !== i + 1 && n !== j + 1);
    const d = routeLine(a, b, others, 0.25 * side);
    svgEl("path", {
        d,
        class: "first-link",
    }, group);
  });

  // bubbles on top
  drawBubble(group, center, cx, cy, 48, true);
  kids.forEach((k, i) => drawBubble(group, k, spots[i].x, spots[i].y, 38, false));

  // path at the top: My brain / Learn languages / Spanish
  const names = [];
  let node = center;
  while (node) {
      names.unshift(node.text);
      node = findBubble(node.parent);
  }
  names.unshift("My brain");
  document.getElementById("brainPath").textContent = names.join(" / ");
  document.getElementById("brainBack").style.visibility = center ? "visible" : "hidden";

  showTips(center, kids);
  showTools(center);
  applyCamera();
}

function showTips(center, kids) {
  const box = document.getElementById("brainTips");
  box.innerHTML = "";
  const tips = [];
  kids.forEach(k => {
    const first = findBubble(k.after);
    if (first && !isFinished(first)) tips.push(`💡 Finish ${first.text} first. It'll make ${k.text} easier.`);
  });
  if (center) {
    const first = findBubble(center.after);
    if (first && !isFinished(first)) tips.push(`⚠️ ${first.text} should come before this.`);
  }
  tips.forEach(text => {
    const div = document.createElement("div");
    div.className = "tip";
    div.textContent = text;
    box.appendChild(div);
  });
}

function showTools(center) {
  document.getElementById("bubbleTools").style.display = center ? "" : "none";
  if (!center) return;
  const select = document.getElementById("afterSelect");
  select.innerHTML = '<option value="">Nothing</option>';
  childrenOf(center.parent).forEach(s => {
    if (s.id === center.id) return;
    const option = document.createElement("option");
    option.value = s.id;
    option.textContent = s.text;
    if (center.after === s.id) option.selected = true;
    select.appendChild(option);
  });
}

// brain: dragging
function resetCamera() {
    camera = {
        x: 0,
        y: 0,
        scale: 1,
    };
}

function applyCamera() {
    const size = 360 / camera.scale;
    document.getElementById("brainMap").setAttribute("viewBox", `${camera.x} ${camera.y} ${size} ${size}`);
}

function svgPoint(e) {
  const rect = document.getElementById("brainMap").getBoundingClientRect();
  const size = 360 / camera.scale;
  return {
    x: camera.x + (e.clientX - rect.left) / rect.width * size,
    y: camera.y + (e.clientY - rect.top) / rect.height * size,
  };
}

function startDrag(e, item, isCenter) {
  const pt = svgPoint(e);
  dragging = {
      item,
      isCenter,
      startX: pt.x,
      startY: pt.y,
      moved: false,
  };
}

function moveDrag(e) {
  if (!dragging || dragging.isCenter) return;
  const pt = svgPoint(e);
  if (Math.hypot(pt.x - dragging.startX, pt.y - dragging.startY) > 6) dragging.moved = true;
  if (!dragging.moved) return;
  dragging.item.x = pt.x;
  dragging.item.y = pt.y;
  showBrain(false);
}

function endDrag() {
  if (!dragging) return;
  const {
      item,
      isCenter,
      moved,
  } = dragging;
  dragging = null;
  if (moved) {
      saveBrain();
      return;
  }
  if (isCenter) zoomOut();
  else if (item.type === "step") {
      item.done = !item.done;
      saveBrain();
      showBrain();
  }
  else zoomIn(item.id);
}

function startPinch() {
    const [p1, p2] = [...pointers.values()];
    const mid = {
        clientX: (p1.x + p2.x) / 2,
        clientY: (p1.y + p2.y) / 2,
    };
    pinch = {
        startDist: Math.hypot(p2.x - p1.x, p2.y - p1.y),
        startScale: camera.scale,
        world: svgPoint(mid),
    };
}

function onPointerDown(e) {
    document.getElementById("brainMap").setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
    });

    if (pointers.size === 2) {
        saveBrain();
        dragging = null;
        pan = null;
        startPinch();
    } else if (pointers.size === 1 && !dragging) {
        pan = {
            startX: e.clientX,
            startY: e.clientY,
            camX: camera.x,
            camY: camera.y,
        };
    }
}

function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
    });
    const rect = document.getElementById("brainMap").getBoundingClientRect();

    if (pinch && pointers.size >= 2) {
        const [p1, p2] = [...pointers.values()];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        camera.scale = Math.max(0.3, Math.min(3, pinch.startScale * dist / pinch.startDist));
        const size = 360 / camera.scale;
        const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
        camera.x = pinch.world.x - (midX - rect.left) / rect.width * size;
        camera.y = pinch.world.y - (midY - rect.top) / rect.height * size;
        applyCamera();
    } else if (dragging) {
        moveDrag(e);
    } else if (pan) {
        const size = 360 / camera.scale;
        camera.x = pan.camX - (e.clientX - pan.startX) / rect.width * size;
        camera.y = pan.camY - (e.clientY - pan.startY) / rect.height * size;
        applyCamera();
    }
}

function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pinch) {
        if (pointers.size < 2) pinch = null;
        if (pointers.size === 1) {
            const [p] = [...pointers.values()];
            pan = {
                startX: p.x,
                startY: p.y,
                camX: camera.x,
                camY: camera.y,
            };
        }
        return;
    }
    if (dragging) endDrag();
    if (pointers.size === 0) pan = null;
}

function resetLayout() {
  childrenOf(brainView).forEach(k => {
      delete k.x;
      delete k.y;
  });
  resetCamera();
  saveBrain();
  showBrain();
}

const brainMap = document.getElementById("brainMap");
brainMap.onpointerdown = onPointerDown;
brainMap.onpointermove = onPointerMove;
brainMap.onpointerup = onPointerUp;
brainMap.onpointercancel = e => {
  if (dragging && dragging.moved) saveBrain();
  dragging = null;
  onPointerUp(e);
};

document.addEventListener("gesturestart", e => e.preventDefault());
