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
let pressTimer = null;
let mapNodes = [];
let attachTimer = null;
let hoverKey = null;
let menuItem = null;

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
    if (name === "brain") {
        resetCamera();
        showBrain();
    }
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
      total += score(k);
  });
  return total / kids.length;
}

function score(b) {
  const p = progress(b.id);
  if (b.type === "step" && p === null) return b.done ? 1 : 0;
  return p || 0;
}

function isFinished(bubble) {
  return score(bubble) === 1;
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
  input.value = "";
  saveBrain();
  showBrain();
}

function renameBubble(item) {
      pointers.clear();
      pan = null;
      const name = prompt("Rename bubble:", item.text);
      if (name === null || name.trim() === "") return;
      item.text = name.trim();
      saveBrain();
      showBrain(false);
  }

    function renameCenter() {
        if (brainView === null) return;
        renameBubble(findBubble(brainView));
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
  setFirst(findBubble(brainView), document.getElementById("afterSelect").value);
}

function fillOrderSelects(item, firstId, afterId) {
  const siblings = childrenOf(item.parent).filter(s => s.id !== item.id);
  const first = document.getElementById(firstId);
  const after = document.getElementById(afterId);
  first.innerHTML = '<option value="">Nothing</option>';
  after.innerHTML = '<option value="">Nothing</option>';
  siblings.forEach(s => {
    first.add(new Option(s.text, s.id, false, item.after === s.id));
    after.add(new Option(s.text, s.id, false, s.after === item.id));
  });
}

function setFirst(item, value) {
  item.after = value === "" ? null : Number(value);
  const other = findBubble(item.after);
  if (other && other.after === item.id) other.after = null;
  if (menuItem) refreshMenu();
  saveBrain();
  showBrain(false);
}

function setAfterOf(item, value) {
  childrenOf(item.parent).forEach(s => {
    if (s.after === item.id) s.after = null;
  });
  if (value !== "") {
    const other = findBubble(Number(value));
    other.after = item.id;
    if (item.after === other.id) item.after = null;
  }
  if (menuItem) refreshMenu();
  saveBrain();
  showBrain(false);
}

function removeBubble(id) {
  const target = findBubble(id);
  if (!target) return;
  if (!confirm(`Delete "${target.text}" and everything inside it?`)) return;
  const doomed = [id];
  for (let i = 0; i < doomed.length; i++) {
    childrenOf(doomed[i]).forEach(k => doomed.push(k.id));
  }
  brain = brain.filter(b => !doomed.includes(b.id));
  brain.forEach(b => {
    if (doomed.includes(b.after)) b.after = null;
    if (doomed.includes(b.attach)) b.attach = null;
  });
  if (doomed.includes(brainView)) brainView = target.parent;
  saveBrain();
  showBrain();
}

function deleteBubble() {
  if (brainView !== null) removeBubble(brainView);
}



// brain: bubble menu

function openMenu(item) {
  pointers.clear();
  pan = null;
  dragging = null;
  menuItem = item;
  document.getElementById("menuTitle").textContent = item.text;
  refreshMenu();
  document.getElementById("bubbleMenu").classList.add("open");
}

function refreshMenu() {
  fillOrderSelects(menuItem, "menuFirst", "menuAfter");
  document.getElementById("menuMainRow").style.display = menuItem.after != null ? "" : "none";
  document.getElementById("menuMainToggle").checked = !!menuItem.hideMain;
}

function setHideMain(item, value) {
  item.hideMain = value;
  saveBrain();
  showBrain(false);
}

function closeMenu() {
  menuItem = null;
  document.getElementById("bubbleMenu").classList.remove("open");
}

function menuRename() {
  const item = menuItem;
  closeMenu();
  renameBubble(item);
}

function menuDelete() {
  const item = menuItem;
  closeMenu();
  removeBubble(item.id);
}

function menuAddStep() {
  const item = menuItem;
  closeMenu();
  const name = prompt(`New step for "${item.text}":`);
  if (name === null || name.trim() === "") return;
  brain.push({
    id: Date.now(),
    text: name.trim(),
    type: "step",
    parent: item.id,
    done: false,
    after: null,
    outside: true
  });
  saveBrain();
  showBrain(false);
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
  if (lines.length > 3) {
      const kept = lines.slice(0, 3);
      kept[2] = kept[2] + "...";
      return kept;
  }
  return lines;
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

// brain: line routing

function hitsBubble(p, obstacles) {
  return obstacles.some(o => Math.hypot(p.x - o.x, p.y - o.y) < o.r);
}

function arcPoints(a, b, bow, n) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const bend = Math.sin(Math.PI * t) * bow * len;
    pts.push({
        x: a.x + dx * t + nx * bend,
        y: a.y + dy * t + ny * bend,
    });
  }
  return pts;
}

function routeLine(a, b, obstacles, bow) {
  if (Math.hypot(b.x - a.x, b.y - a.y) < 1) return "";
  const arc = arcPoints(a, b, bow, 24);
  if (!arc.some(p => hitsBubble(p, obstacles))) return smoothPath(arc);
  return smoothPath(findPath(a, b, obstacles));
}

class MinHeap {
  constructor() {
      this.items = [];
  }
  get size() {
      return this.items.length;
  }
  push(item) {
    const h = this.items;
    h.push(item);
    let i = h.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (h[parent].f <= h[i].f) break;
      [h[parent], h[i]] = [h[i], h[parent]];
      i = parent;
    }
  }
  pop() {
    const h = this.items;
    const top = h[0];
    const last = h.pop();
    if (h.length > 0) {
      h[0] = last;
      let i = 0;
      while (true) {
        const l = i * 2 + 1, r = l + 1;
        let small = i;
        if (l < h.length && h[l].f < h[small].f) small = l;
        if (r < h.length && h[r].f < h[small].f) small = r;
        if (small === i) break;
        [h[small], h[i]] = [h[i], h[small]];
        i = small;
      }
    }
    return top;
  }
}

function findPath(a, b, obstacles) {
  const cell = 8, pad = 140;
  const minX = Math.min(a.x, b.x) - pad, minY = Math.min(a.y, b.y) - pad;
  const cols = Math.ceil((Math.max(a.x, b.x) + pad - minX) / cell);
  const rows = Math.ceil((Math.max(a.y, b.y) + pad - minY) / cell);
  const total = cols * rows;

  // 1. give every square a price
  const cost = new Float32Array(total);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = minX + (c + 0.5) * cell, y = minY + (r + 0.5) * cell;
      let price = 1;
      obstacles.forEach(o => {
        const d = Math.hypot(x - o.x, y - o.y);
        if (d < o.r) price += 80;
        else if (d < o.r + 28) price += (o.r + 28 - d) / 28 * 4;
      });
      cost[r * cols + c] = price;
    }
  }

  function toIndex(p) {
    const c = Math.min(cols - 1, Math.max(0, Math.floor((p.x - minX) / cell)));
    const r = Math.min(rows - 1, Math.max(0, Math.floor((p.y - minY) / cell)));
    return r * cols + c;
  }
  const startI = toIndex(a), goalI = toIndex(b);
  const goalC = goalI % cols, goalR = Math.floor(goalI / cols);

  // 2. A*: find the cheapest route
  const best = new Float32Array(total).fill(Infinity);
  const from = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const open = new MinHeap();
  const moves = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]
  ];
  best[startI] = 0;
  open.push({
      i: startI,
      f: 0,
  });

  while (open.size > 0) {
    const { i } = open.pop();
    if (i === goalI) break;
    if (closed[i]) continue;
    closed[i] = 1;
    const c = i % cols, r = Math.floor(i / cols);
    for (const [mc, mr, step] of moves) {
      const nc = c + mc, nr = r + mr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const ni = nr * cols + nc;
      const g = best[i] + step * cost[ni];
      if (g < best[ni]) {
        best[ni] = g;
        from[ni] = i;
        open.push({
            i: ni,
            f: g + Math.hypot(goalC - nc, goalR - nr),
        });
      }
    }
  }

  // 3. walk backwards from the goal to build the route
  let path = [];
  let i = goalI;
  while (i !== -1) {
    const c = i % cols, r = Math.floor(i / cols);
    path.unshift({
        x: minX + (c + 0.5) * cell,
        y: minY + (r + 0.5) * cell,
    });
    if (i === startI) break;
    i = from[i];
  }
  if (path.length < 2) return [a, b];
  path[0] = {
      x: a.x,
      y: a.y,
  };
  path[path.length - 1] = {
      x: b.x,
      y: b.y,
  };

  // 4. smooth out the "staircase" into one soft curve
  for (let pass = 0; pass < 20; pass++) {
    path = path.map((p, k) => {
      if (k === 0 || k === path.length - 1) return p;
      return {
        x: (path[k - 1].x + p.x * 2 + path[k + 1].x) / 4,
        y: (path[k - 1].y + p.y * 2 + path[k + 1].y) / 4
      };
    });
  }

  // keep every 2nd point so it draws faster
  return path.filter((p, k) => k % 2 === 0 || k === path.length - 1);
}

function drawBubble(group, node) {
  const {
      item,
      x,
      y,
      r,
      isCenter,
  } = node;
  const p = item ? progress(item.id) : null;
  const type = item ? item.type : "goal";
  const finished = item && item.type === "step" && isFinished(item);

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

  let cls = "bubble " + type;
  if (finished) cls += " done";
  if (hoverKey !== null && hoverKey === keyOf(node)) cls += " target";
  const g = svgEl("g", {
      class: cls,
  }, group);
  svgEl("circle", {
      cx: x,
      cy: y,
      r: r,
  }, g);

  const label = item ? (finished ? "✓ " : "") + item.text : "My brain";
  const lines = wrapText(label, isCenter ? 12 : r < 35 ? 8 : 10);
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

  g.onpointerdown = e => startDrag(e, node);
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

  // 1. the middle bubble
  mapNodes = [{
      item: center,
      x: cx,
      y: cy,
      r: 48,
      isCenter: true,
  }];

  // 2. bubbles connected straight to the middle
  const loose = kids.filter(k => !kids.some(s => s.id === k.attach));
  loose.forEach((k, i) => {
    const angle = -Math.PI / 2 + i * 2 * Math.PI / loose.length;
    mapNodes.push({
      item: k, r: 38,
      x: k.x != null ? k.x : cx + R * Math.cos(angle),
      y: k.y != null ? k.y : cy + R * Math.sin(angle)
    });
  });

  // 3. bubbles hanging off other bubbles (can chain: Spanish → French → Italian)
  const queue = mapNodes.slice(1);
  while (queue.length > 0) {
    const anchor = queue.shift();
    const hangers = [
      ...kids.filter(k => k.attach === anchor.item.id).map(item => ({
          item,
          satellite: false,
      })),
      ...childrenOf(anchor.item.id).filter(c => c.outside).map(item => ({
          item,
          satellite: true,
      }))
    ];
    queue.push(...placeGroup(anchor, hangers));
  }

  // 4. lines
  const obstacles = mapNodes.map(n => ({
      x: n.x,
      y: n.y,
      r: n.r + 18,
  }));
  const centerNode = mapNodes[0];
  const nodeOf = id => mapNodes.find(n => n.item && n.item.id === id);

  function linkLine(fromNode, toNode, bow, cls) {
    const others = obstacles.filter((o, k) => mapNodes[k] !== fromNode && mapNodes[k] !== toNode);
    return svgEl("path", {
        d: routeLine(fromNode, toNode, others, bow),
        class: cls,
    }, group);
  }

  // regular lines: to whatever each bubble hangs off
  mapNodes.slice(1).forEach(n => {
    const lineFrom = n.anchor || centerNode;
    const first = n.item.after != null ? nodeOf(n.item.after) : null;
    const mustFirst = first === lineFrom;
    const hidden = n.item.hideMain && first;
    if (!mustFirst && !hidden) linkLine(lineFrom, n, 0.1, "branch");
    if (n.anchor && n.item.alsoCenter) linkLine(centerNode, n, 0.1, "branch");
  });

  // blue arrow lines: "must do first"
  mapNodes.slice(1).forEach(n => {
    const first = n.item.after != null ? nodeOf(n.item.after) : null;
    if (!first) return;
    const sameAsLine = first === (n.anchor || centerNode);
    const path = linkLine(first, n, sameAsLine ? 0.1 : 0.2, "need-line");
    drawArrows(group, path);
  });

  // 5. bubbles on top
  mapNodes.forEach(n => drawBubble(group, n));

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
  const full = document.getElementById("bubbleFull");
  if (center && (center.type === "note" || center.text.length > 30)) {
      full.textContent = center.text;
      full.classList.add("open");
  } else {
      full.classList.remove("open");
  }

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
    if (first && !isFinished(first)) tips.push(`💡 ${first.text} before ${k.text}`);
  });
  if (center) {
    const first = findBubble(center.after);
    if (first && !isFinished(first)) tips.push(`⚠️ Do ${first.text} first`);
  }
  tips.forEach(text => {
    const div = document.createElement("div");
    div.className = "tip";
    div.textContent = text;
    box.appendChild(div);
  });
  const btn = document.getElementById("tipsToggle");
  btn.style.display = tips.length ? "" : "none";
  btn.textContent = "💡 " + tips.length;
}

function toggleTips() {
    document.getElementById("brainTips").classList.toggle("open");
}

function showTools(center) {
  document.getElementById("toolsToggle").style.display = center ? "" : "none";
  document.getElementById("bubbleTools").style.display = center ? "" : "none";
  if (!center) return;
  const siblings = childrenOf(center.parent).filter(s => s.id !== center.id)

  fillOrderSelects(center, "afterSelect", "beforeSelect");
    
  document.getElementById("centerLineRow").style.display = center.attach != null ? "" : "none";
  document.getElementById("centerLineToggle").checked = !!center.alsoCenter;
}

function toggleTools() {
    document.getElementById("bubbleTools").classList.toggle("open");
}



// brain: dragging
function resetCamera() {
  const rect = document.getElementById("brainMap").getBoundingClientRect();
  const ratio = rect.width ? rect.height / rect.width : 1;
  camera = {
      x: 0,
      y: 180 - 180 * ratio,
      scale: 1,
  };
}

function applyCamera() {
  const map = document.getElementById("brainMap");
  const rect = map.getBoundingClientRect();
  const ratio = rect.width ? rect.height / rect.width : 1;
  const size = 360 / camera.scale;
  map.setAttribute("viewBox", `${camera.x} ${camera.y} ${size} ${size * ratio}`);
}

function svgPoint(e) {
  const rect = document.getElementById("brainMap").getBoundingClientRect();
  const size = 360 / camera.scale;
  return {
    x: camera.x + (e.clientX - rect.left) / rect.width * size,
    y: camera.y + (e.clientY - rect.top) / rect.width * size,
  };
}

function startDrag(e, node) {
  const pt = svgPoint(e);
  dragging = {
    item: node.item,
    isCenter: !!node.isCenter,
    satellite: !!node.satellite,
    startX: pt.x,
    startY: pt.y,
    moved: false
  };
  clearTimeout(pressTimer);
  if (node.item) {
    pressTimer = setTimeout(() => {
      if (dragging && !dragging.moved) {
        dragging = null;
        openMenu(node.item);
      }
    }, 500);
  }
}

function moveDrag(e) {
  if (!dragging || dragging.isCenter) return;
  const pt = svgPoint(e);
  if (Math.hypot(pt.x - dragging.startX, pt.y - dragging.startY) > 10) {
    dragging.moved = true;
    clearTimeout(pressTimer);
  }
  if (!dragging.moved) return;
  if (dragging.satellite) {
    dragging.item.ox = pt.x;
    dragging.item.oy = pt.y;
  } else {
    dragging.item.x = pt.x;
    dragging.item.y = pt.y;
  }
  checkHover(pt);
  showBrain(false);
}

function endDrag() {
  clearTimeout(attachTimer);
  hoverKey = null;
  if (!dragging) return;
  const {
      item,
      isCenter,
      moved,
  } = dragging;
  dragging = null;
  if (moved) {
    saveBrain();
    showBrain(false);
    return;
  }
  if (isCenter) zoomOut();
  else if (item.type === "step" && progress(item.id) === null) {
    item.done = !item.done;
    saveBrain();
    showBrain();
  }
  else zoomIn(item.id);
}

function resetLayout() {
  mapNodes.forEach(n => {
    if (!n.item || n.isCenter) return;
    delete n.item.x;
    delete n.item.y;
    delete n.item.ox;
    delete n.item.oy;
  });
  resetCamera();
  saveBrain();
  showBrain();
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
        clearTimeout(pressTimer);
        saveBrain();
        dragging = null;
        pan = null;
        startPinch();
        clearTimeout(attachTimer);
        hoverKey = null;
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
        camera.y = pinch.world.y - (midY - rect.top) / rect.width * size;
        applyCamera();
    } else if (dragging) {
        moveDrag(e);
    } else if (pan) {
        const size = 360 / camera.scale;
        camera.x = pan.camX - (e.clientX - pan.startX) / rect.width * size;
        camera.y = pan.camY - (e.clientY - pan.startY) / rect.width * size;
        applyCamera();
    }
}

function onPointerUp(e) {
    clearTimeout(attachTimer);
    clearTimeout(pressTimer);
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



// brain: attaching

function keyOf(node) {
  return node.isCenter ? "center" : node.item.id;
}

function placeGroup(anchor, hangers) {
  const added = [];
  const base = Math.atan2(anchor.y - 180, anchor.x - 180);
  hangers.forEach((h, i) => {
    const r = h.satellite ? 30 : 38;
    const angle = base + (i - (hangers.length - 1) / 2) * 0.8;
    const dist = anchor.r + r + 30;
    const sx = h.satellite ? h.item.ox : h.item.x;
    const sy = h.satellite ? h.item.oy : h.item.y;
    const node = {
      item: h.item, r, satellite: h.satellite, anchor,
      x: sx != null ? sx : anchor.x + dist * Math.cos(angle),
      y: sy != null ? sy : anchor.y + dist * Math.sin(angle)
    };
    mapNodes.push(node);
    added.push(node);
  });
  return added;
}

function drawArrows(group, path) {
  const total = path.getTotalLength();
  for (let d = 42; d < total - 42; d += 22) {
    const p = path.getPointAtLength(d);
    const q = path.getPointAtLength(d + 1);
    const angle = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
    svgEl("path", {
      d: "M-4 -4 L2 0 L-4 4",
      class: "chevron",
      transform: `translate(${p.x} ${p.y}) rotate(${angle})`
    }, group);
  }
}

function checkHover(pt) {
  const under = mapNodes.find(n => n.item !== dragging.item && Math.hypot(pt.x - n.x, pt.y - n.y) < n.r);
  const key = under ? keyOf(under) : null;
  if (key === hoverKey) return;
  hoverKey = key;
  clearTimeout(attachTimer);
  if (under) {
    const item = dragging.item, satellite = dragging.satellite;
    attachTimer = setTimeout(() => attachTo(item, satellite, under), 700);
  }
}

function makesLoop(item, target) {
  let b = target;
  for (let i = 0; i < 50 && b; i++) {
    if (b.id === item.id) return true;
    b = b.attach != null ? findBubble(b.attach) : null;
  }
  return false;
}
function isInside(target, item) {
    let b = target;
    for (let i = 0; i < 100 && b; i++) {
        if (b.id === item.id) return true;
        b = findBubble(b.parent);
    }
    return false;
}

function attachTo(item, wasSatellite, target) {
  hoverKey = null;
  dragging = null;
  if (target.isCenter) {
    item.attach = null;
    if (wasSatellite) {
      item.parent = brainView;
      item.outside = false;
    }
  } else if (item.type === "goal") {
    if (target.satellite || target.item.type === "step" || makesLoop(item, target.item)) {
      showBrain(false);
      return;
    }
    item.attach = target.item.id;
  } else {
    if (isInside(target.item, item)) {
      showBrain(false);
      return;
    }
    item.parent = target.item.id;
    item.outside = true;
    item.attach = null;
  }
  delete item.x;
  delete item.y;
  delete item.ox;
  delete item.oy;
  saveBrain();
  showBrain(false);
}

function setBefore() {
  setAfterOf(findBubble(brainView), document.getElementById("beforeSelect").value);
}

function toggleCenterLine() {
  findBubble(brainView).alsoCenter = document.getElementById("centerLineToggle").checked;
  saveBrain();
  showBrain();
}

brainMap.addEventListener("touchstart", e => e.preventDefault(), {
    passive: false,
});
brainMap.addEventListener("touchmove", e => e.preventDefault(), {
    passive: false,
});

let lastRatio = null;

function fitMap() {
    const rect = brainMap.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = rect.height / rect.width;
    if (lastRatio !== null && ratio !== lastRatio) {
        const size = 360 / camera.scale;
        camera.y -= (ratio - lastRatio) * size / 2;
    }
    lastRatio = ratio;
    showBrain(false);
}

new ResizeObserver(fitMap).observe(brainMap);
