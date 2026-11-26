/* ==============================================================
   BRAIN CONSOLE  —  console.js
   A Linux-style terminal for your Second Brain.

   HOW THIS FILE IS SET UP
     PART 1  Settings you can change
     PART 2  Color themes
     PART 3  COMMANDS   <-- every command lives here
     PART 4  Help pages
     PART 5  Tutorials
     PART 6  What the commands do (adding, deleting, copying...)
     PART 7  Finding bubbles and reading names (ranges, paths...)
     PART 8  The screen (printing, typing, buttons, colors)
     PART 9  Start up

   TO ADD A NEW COMMAND
     Copy one { ... } block in PART 3 and change it.
     "help" and "help advanced" update by themselves.

   This file borrows these from app.js:
     brain, brainView, saveBrain(), showBrain(), findBubble(),
     childrenOf(), progress(), isFinished(), openTab(), closeMenu()
   So in index.html it has to load AFTER app.js.
   ============================================================== */

(function () {
"use strict";

// ==============================================================
// PART 1: SETTINGS YOU CAN CHANGE
// ==============================================================
const MAX_AT_ONCE = 300;     // the most bubbles one "add" can make
const MAX_COPY = 3000;       // the most bubbles one "copy" can make
const UNDO_LIMIT = 30;       // how many changes "undo" remembers
const HISTORY_LIMIT = 100;   // how many old commands are remembered
const DEFAULT_SIZE = 14;     // text size
const QUICK_BUTTONS = ["help", "look", "back", "undo", "clear"]; // tap buttons above the typing box
const PRAISE = [
   "✓ Nice!",
   "✓ Awesome!",
   "✓ You got it!",
   "✓ Great job!",
   "✓ Perfect!",
];
const SAVE_KEY = "brainConsole"; // where colors + old commands are saved

// The order the groups show up in "help"
const GROUP_ORDER = [
   "Moving around",
   "Adding",
   "Changing",
   "Organizing",
   "Finding",
   "Look and feel",
   "Other",
];

// ==============================================================
// PART 2: COLOR THEMES
// Every theme needs every part. To add one, copy a line and rename it.
// ==============================================================
const THEMES = {
  classic: {
     label: "black + white",
     bg: "#000000",
     text: "#e5e7eb",
     prompt: "#4ade80",
     command: "#22d3ee",
     name: "#fde68a",
     place: "#60a5fa",
     number: "#f472b6",
     keyword: "#c084fc",
     good: "#4ade80",
     warning: "#fbbf24",
     error: "#f87171",
     dim: "#8b919c",
  },
  green:   {
     label: "black + green",
     bg: "#000000",
     text: "#4ade80",
     prompt: "#bbf7d0",
     command: "#ecfccb",
     name: "#fef08a",
     place: "#5eead4",
     number: "#a3e635",
     keyword: "#34d399",
     good: "#86efac",
     warning: "#facc15",
     error: "#fb7185",
     dim: "#3f9a62",
  },
  red:     {
     label: "black + red",
     bg: "#000000",
     text: "#fca5a5",
     prompt: "#ef4444",
     command: "#fee2e2",
     name: "#fde68a",
     place: "#fdba74",
     number: "#f9a8d4",
     keyword: "#fb7185",
     good: "#86efac",
     warning: "#fcd34d",
     error: "#ff2d2d",
     dim: "#a86464",
  },
  blue:    {
     label: "black + blue",
     bg: "#000000",
     text: "#93c5fd",
     prompt: "#3b82f6",
     command: "#cffafe",
     name: "#fde68a",
     place: "#7dd3fc",
     number: "#c4b5fd",
     keyword: "#818cf8",
     good: "#6ee7b7",
     warning: "#fcd34d",
     error: "#fca5a5",
     dim: "#5b7bab",
  },
  purple:  {
     label: "Ubuntu purple",
     bg: "#300a24",
     text: "#ffffff",
     prompt: "#8ae234",
     command: "#34e2e2",
     name: "#fce94f",
     place: "#729fcf",
     number: "#ad7fa8",
     keyword: "#d3a6ff",
     good: "#8ae234",
     warning: "#fcaf3e",
     error: "#ef2929",
     dim: "#a88aa0",
  },
  navy:    {
     label: "matches your app",
     bg: "#0f172a",
     text: "#f1f5f9",
     prompt: "#22c55e",
     command: "#38bdf8",
     name: "#fde68a",
     place: "#a5b4fc",
     number: "#f472b6",
     keyword: "#c4b5fd",
     good: "#22c55e",
     warning: "#fbbf24",
     error: "#f87171",
     dim: "#64748b",
  },
};
const PARTS = [
   "bg",
   "text",
   "prompt",
   "command",
   "name",
   "place",
   "number",
   "keyword",
   "good",
   "warning",
   "error",
   "dim",
];
const PART_LABEL = {
   bg: "background",
   text: "text",
   prompt: "prompt",
   command: "commands",
   name: "names",
   place: "places",
   number: "numbers",
   keyword: "keywords",
   good: "good news",
   warning: "warnings",
   error: "errors",
   dim: "hints",
};
const PART_WORDS = {
   background: "bg",
   bg: "bg",
   text: "text",
   writing: "text",
   prompt: "prompt",
   command: "command",
   commands: "command",
   name: "name",
   names: "name",
   place: "place",
   places: "place",
   path: "place",
   number: "number",
   numbers: "number",
   keyword: "keyword",
   keywords: "keyword",
   good: "good",
   success: "good",
   warning: "warning",
   warnings: "warning",
   error: "error",
   errors: "error",
   dim: "dim",
   hint: "dim",
   hints: "dim",
};

// ==============================================================
// CONSOLE MEMORY (things that change while you use it)
// ==============================================================
let cwd = null;            // the bubble you're "in" (null = the very top)
let prevCwd = null;        // where you were before ("cd -")
let pending = null;        // a question waiting for answer
let tut = null;            // the tutorial that's running (or null)
let suggestion = null;     // "did you mean" command to show as a button
let lastCmd = null;        // the main name of the last command that ran
let lineCount = 0;         // how many lines you've typed (tutorial uses this)
let changedThisLine = false; // did the last line change the brain?
let changedSinceMap = false; // changes you havent looked at yet on the map
let toldAboutMap = false;  // explained that changes are real
let backBtn;               // the ">_ Back to console" button on map
let welcomed = false;
let lastId = 0;
let pastCommands = [];     // everything you typed
let histPos = 0;           // where the ↑ ↓ keys are in that list
const undoList = [];
const redoList = [];
const LOOKUP = {};         // command word -> command (filled in at start)
let appearance = { theme: "classic", custom: {}, size: DEFAULT_SIZE };
let box, out, input, promptEl, chipsEl, openBtn;

// ==============================================================
// PART 3: COMMANDS
//   names    -> words that run it (the first one is the main name)
//   level    -> "basic" shows in help, "advanced" only in help advanced
//   group    -> which list it's under in help
//   about    -> short "what it does"
//   examples -> [what you type, what it does]
//   basicShow-> how many examples "help" shows (normally 1)
//   notes    -> extra tips for "help <command>"
//   run(text)-> what happens. text = what you typed after the command
// ==============================================================
const COMMANDS = [

  // ---------------- MOVING AROUND ----------------
  {
    names: ["look", "ls", "list", "dir", "ll"],
    level: "basic", group: "Moving around",
    about: "see what's inside the place you're in",
    examples: [["look", "see what's inside here"], ["look Spanish", "see what's inside Spanish"]],
    run(text) {
      const where = text.replace(/(^|\s)-[a-z]+(?=\s|$)/gi, " ").trim().replace(/^(at|in|inside|into)\s+/i, "");
      const place = where ? findPlace(where) : { id: cwd };
      if (place.error) return showError(place);
      listInside(place.id);
    },
  },
  {
    names: ["go", "cd", "goto", "enter"],
    level: "basic", group: "Moving around",
    about: "go inside a bubble",
    examples: [
      ["go Spanish", "go inside Spanish"],
      ["go My 6 Languages/Spanish", "go straight there ( / means inside )"],
      ["go back", "go out one level"],
      ["go home", "go to the very top"],
    ],
    notes: ["BIG or small letters don't matter: go spanish works too.", "If two bubbles have the same name, I'll show you both so you can pick."],
    run(text) {
      const where = text.trim().replace(/^(to|into|inside|in)\s+/i, "");
      if (!where) return goTo(null);
      if (where === "-") return goTo(prevCwd);
      const place = findPlace(where);
      if (place.error) return showError(place);
      goTo(place.id);
    },
  },
  {
    names: ["back", "up", "..", "b"],
    level: "basic", group: "Moving around",
    about: "go back out one level",
    examples: [["back", "go back out one level"]],
    run() {
      if (cwd === null) return say(dim("You're already at the very top."));
      goTo(parentOf(cwd));
    },
  },
  {
    names: ["home", "top", "~"],
    level: "basic", group: "Moving around",
    about: "go to the very top of your brain",
    examples: [["home", "go to the very top"]],
    run() { goTo(null); },
  },
  {
    names: ["where", "pwd", "whereami"],
    level: "basic", group: "Moving around",
    about: "show where you are",
    examples: [["where", "show where you are"]],
    run() {
      say(pl(pathText(cwd)));
      say(dim(`(${childrenOf(cwd).length} things inside)`));
    },
  },
  {
    names: ["map", "show", "view", "see"],
    level: "basic", group: "Moving around",
    about: "close the console and show this spot on your brain map",
    examples: [["map", "see where you are on your brain map"], ["map Spanish", "see Spanish on your map"]],
    run(text) {
      const place = text.trim() ? findPlace(text) : { id: cwd };
      if (place.error) return showError(place);
      brainView = place.id;
      changedSinceMap = false;
      closeConsole();
      if (typeof openTab === "function") openTab("brain");
      backBtn.classList.add("show"); // return to the console
    },
  },

  // ---------------- ADDING ----------------
  {
    names: ["add", "make", "new", "create", "mkdir", "touch"],
    level: "basic", group: "Adding", basicShow: 4,
    about: "make new bubbles (steps, goals or notes)",
    examples: [
      ["add Section 1-8", "makes Section 1, Section 2 ... Section 8"],
      ["add Unit 1-10 to Section 1-8", "puts Unit 1-10 inside each section"],
      ["add Section 1-8 with Unit 1-10", "makes the sections AND the units"],
      ["add goal Learn French", "makes a goal (or a note). Steps are normal"],
      ["add Reading, Writing, Speaking", "commas make a list"],
      ["add Unit 1-10 to Section 1 outside", "outside = show them on the map"],
      ["add Section 1-8 in order", "in order = blue arrows 1 → 2 → 3"],
    ],
    notes: [
      "New sub-steps stay inside their bubble unless you type outside at the end.",
      "If something is already there, I'll show you what's in it and ask what to do.",
      "If a name has the words to, in or with in it, use quotes: add \"Talk to mom\"",
    ],
    run(text) { addCommand(text); },
  },

  // ---------------- CHANGING ----------------
  {
    names: ["done", "check", "tick", "finish", "complete"],
    level: "basic", group: "Changing",
    about: "check off steps",
    examples: [
      ["done Unit 1-3 in Section 1", "checks off 3 units in Section 1"],
      ["done Section 1", "checks off everything inside Section 1"],
      ["done all", "checks off everything here"],
    ],
    run(text) { setDone(text, true); },
  },
  {
    names: ["undone", "uncheck", "untick", "notdone"],
    level: "basic", group: "Changing",
    about: "take the checkmark off steps",
    examples: [["undone Unit 3 in Section 1", "takes the checkmark off"]],
    run(text) { setDone(text, false); },
  },
  {
    names: ["rename", "rn"],
    level: "basic", group: "Changing",
    about: "change a bubble's name",
    examples: [["rename Section 1 to Basics", "Section 1 is now called Basics"], ["rename Unit 1-3 to Lesson 1-3", "renames 3 at once"]],
    run(text) { renameCommand(text); },
  },
  {
    names: ["copy", "cp", "duplicate", "clone"],
    level: "basic", group: "Changing",
    about: "copy bubbles (with everything inside them)",
    examples: [
      ["copy Section 1-8 to French", "French gets Section 1-8 (with their units)"],
      ["copy everything in Spanish to French, Italian", "copies all of Spanish's stuff into both"],
      ["cp Spanish/* to French", "the nerd way to copy what's inside"],
    ],
    notes: [
      "Copies start un-checked, so your progress isn't copied.",
      "If you copy ONE bubble that has things inside, I'll ask if you want the bubble itself or just what's inside it.",
    ],
    run(text) { copyCommand(text); },
  },
  {
    names: ["delete", "rm", "remove", "del", "rmdir", "erase", "trash"],
    level: "basic", group: "Changing",
    about: "delete bubbles (and everything inside them)",
    examples: [
      ["delete Unit 9-10 in Section 3", "deletes 2 units in Section 3"],
      ["delete Section 3", "deletes Section 3 and everything in it"],
      ["delete all in Section 3", "empties Section 3"],
      ["rm -f Section 3", "deletes without asking (careful!)"],
    ],
    notes: ["I always show you what will be deleted and ask first. Type yes to go ahead.", "Deleted something by mistake? Type undo."],
    run(text) { deleteCommand(text); },
  },
  {
    names: ["undo", "oops", "u"],
    level: "basic", group: "Changing",
    about: "take back the last change",
    examples: [["undo", "take back the last change"]],
    notes: ["I remember your last " + UNDO_LIMIT + " changes.", "redo puts back what undo took away."],
    run() { doUndo(); },
  },
  {
    names: ["redo"],
    level: "advanced", group: "Changing",
    about: "put back what undo took away",
    examples: [["redo", "does the change again"]],
    run() { doRedo(); },
  },

  // ---------------- ORGANIZING (advanced) ----------------
  {
    names: ["move"],
    level: "advanced", group: "Organizing",
    about: "move bubbles into another bubble",
    examples: [["move Unit 9-10 to Section 2", "moves them inside Section 2"], ["move Grammar to ~", "moves it to the very top (~ = home)"]],
    run(text) { moveCommand(text, false); },
  },
  {
    names: ["mv"],
    level: "advanced", group: "Organizing",
    about: "Linux mv: moves into a bubble if it exists, otherwise renames",
    examples: [["mv Unit 1 to Section 2", "moves Unit 1 into Section 2"], ["mv Unit 1 to Lesson 1", "renames it (no Lesson 1 exists)"], ["mv \"Unit 1\" \"Section 2\"", "quotes work too"]],
    run(text) { moveCommand(text, true); },
  },
  {
    names: ["order", "chain"],
    level: "advanced", group: "Organizing",
    about: "connect bubbles with blue 'must do first' arrows, in the order you type them",
    examples: [["order Section 1-8", "Section 1 → 2 → 3 ... → 8"], ["order Unit 1-10 in Section 2", "orders the units inside Section 2"]],
    notes: ["Ordered bubbles hide their main line so they look like a path. lines on brings it back."],
    run(text) {
      const r = resolveItems(text);
      if (r.error) return showError(r);
      if (r.items.length < 2) return say(bad("I need at least 2 bubbles to put in order."));
      if (new Set(r.items.map(b => b.parent)).size > 1) return say(bad("They all need to be in the same place."));
      change("order " + r.items[0].text + " ...", () => chain(r.items));
      say(ok("✓ Linked ") + num(r.items.length) + " in order: " + nm(r.items[0].text) + dim(" → ... → ") + nm(r.items[r.items.length - 1].text));
    },
  },
  {
    names: ["unorder", "unchain"],
    level: "advanced", group: "Organizing",
    about: "remove the blue arrows from bubbles",
    examples: [["unorder Section 1-8", "no more arrows between them"], ["unorder all", "removes every arrow here"]],
    run(text) {
      const r = resolveItems(text);
      if (r.error) return showError(r);
      change("unorder", () => r.items.forEach(b => { b.after = null; b.hideMain = false; }));
      say(ok("✓ Removed the arrows from ") + num(r.items.length) + " " + plural("bubble", r.items.length));
    },
  },
  {
    names: ["lines"],
    level: "advanced", group: "Organizing",
    about: "turn the main line on or off for bubbles that have blue arrows",
    examples: [["lines off Section 2-8", "only the blue arrows show"], ["lines on Section 2-8", "the main lines come back"]],
    run(text) {
      const m = text.trim().match(/^(on|off|show|hide)\s+(.+)$/i);
      if (!m) return say(bad("Try: ") + highlight("lines off Section 2-8"));
      const hide = /^(off|hide)$/i.test(m[1]);
      const r = resolveItems(m[2]);
      if (r.error) return showError(r);
      change("lines " + m[1].toLowerCase(), () => r.items.forEach(b => { b.hideMain = hide; }));
      say(ok("✓ Main lines ") + (hide ? "hidden" : "showing") + " for " + num(r.items.length) + " " + plural("bubble", r.items.length));
      const noArrow = r.items.filter(b => b.after == null).length;
      if (hide && noArrow) say(dim(`(${noArrow} of them have no blue arrow, so their main line stays.)`));
    },
  },
  {
    names: ["outside"],
    level: "advanced", group: "Organizing",
    about: "show sub-steps outside on the map (hanging off their bubble)",
    examples: [["outside Unit 1-10 in Section 1", "they hang off Section 1 on the map"], ["outside all in Section 1", "everything in Section 1"]],
    run(text) { setOutside(text, true); },
  },
  {
    names: ["inside"],
    level: "advanced", group: "Organizing",
    about: "hide sub-steps inside their bubble (tap it on the map to see them)",
    examples: [["inside Unit 1-10 in Section 1", "they only show when you tap Section 1"]],
    run(text) { setOutside(text, false); },
  },
  {
    names: ["turn", "type"],
    level: "advanced", group: "Organizing",
    about: "change what kind of bubble something is",
    examples: [["turn Spanish into a goal", "Spanish becomes a goal"], ["turn Tip 1-3 into notes", "they become notes"]],
    run(text) {
      const m = text.match(/^(.+?)\s+(?:into|to|in)\s+(?:a\s+|an\s+)?(goal|step|note)s?\s*$/i) || text.match(/^(.+?)\s+(goal|step|note)s?\s*$/i);
      if (!m) return say(bad("Try: ") + highlight("turn Spanish into a goal"));
      const r = resolveItems(m[1]);
      if (r.error) return showError(r);
      const type = m[2].toLowerCase();
      change("turn into " + type, () => r.items.forEach(b => { b.type = type; }));
      say(ok("✓ ") + num(r.items.length) + " " + plural("bubble", r.items.length) + " turned into " + (r.items.length === 1 ? "a " + type : type + "s"));
    },
  },

  // ---------------- FINDING (advanced) ----------------
  {
    names: ["tree"],
    level: "advanced", group: "Finding",
    about: "show everything below you, like the Linux tree command",
    examples: [["tree", "everything below you"], ["tree Spanish", "everything inside Spanish"], ["tree -L 1", "only 1 level deep"]],
    run(text) {
      let t = text.trim(), depth = 99;
      const L = t.match(/(?:^|\s)-L\s*(\d+)/i);
      if (L) { depth = Number(L[1]); t = t.replace(L[0], " ").trim(); }
      else if (/^\d+$/.test(t)) { depth = Number(t); t = ""; }
      const place = t ? findPlace(t) : { id: cwd };
      if (place.error) return showError(place);
      showTree(place.id, Math.max(1, depth));
    },
  },
  {
    names: ["find", "search", "grep", "locate"],
    level: "advanced", group: "Finding",
    about: "search your WHOLE brain for a name",
    examples: [["find unit 5", "every bubble with 'unit 5' in its name"]],
    run(text) {
      const q = norm(text.replace(/"/g, ""));
      if (!q) return say(bad("Find what? Try: ") + highlight("find unit 5"));
      const hits = brain.filter(b => norm(b.text).includes(q));
      if (!hits.length) return say(dim("Nothing found for ") + nm(text.trim()));
      say(dim(`Found ${hits.length}:`));
      hits.sort((a, b) => pathText(a.id).localeCompare(pathText(b.id), undefined, { numeric: true }));
      hits.slice(0, 50).forEach(b => say("  " + icon(b) + " " + nm(b.text) + dim("  in ") + pl(pathText(b.parent))));
      if (hits.length > 50) say(dim(`...and ${hits.length - 50} more`));
    },
  },
  {
    names: ["info", "stat", "details", "stats"],
    level: "advanced", group: "Finding",
    about: "show what's inside a bubble and how done it is",
    examples: [["info", "about the place you're in"], ["info Section 1-3", "about each of them"]],
    run(text) {
      const t = text.trim();
      if (!t) {
        if (cwd === null) return showTotals();
        return describe(findBubble(cwd)).forEach(line => say(line));
      }
      const r = resolveItems(t);
      if (r.error) return showError(r);
      r.items.slice(0, 10).forEach(b => describe(b).forEach(line => say(line)));
      if (r.items.length > 10) say(dim(`...and ${r.items.length - 10} more`));
    },
  },
  {
    names: ["history", "hist"],
    level: "advanced", group: "Finding",
    about: "show the commands you typed before",
    examples: [["history", "your old commands"], ["!!", "run the last command again"], ["!5", "run command number 5"]],
    run() {
      if (!pastCommands.length) return say(dim("You haven't typed anything yet."));
      const start = Math.max(0, pastCommands.length - 30);
      pastCommands.slice(start).forEach((h, i) => say(dim(String(start + i + 1).padStart(4) + "  ") + highlight(h)));
      say(dim("!! runs the last one again · !number runs that one"));
    },
  },

  // ---------------- LOOK AND FEEL ----------------
  {
    names: ["theme", "themes", "skin"],
    level: "basic", group: "Look and feel",
    about: "change the console's colors",
    examples: [["theme green", "black and green"], ["theme", "see all the themes"], ["theme red", "black and red"], ["theme blue", "black and blue"]],
    run(text) {
      const name = text.trim().toLowerCase();
      if (!name) {
        say("Themes (type " + cm("theme") + " and a name):");
        Object.keys(THEMES).forEach(n => say("  " + swatch(n) + dim("  " + THEMES[n].label) + (n === appearance.theme ? ok("  ← now") : "")));
        say(dim("Or make your own: ") + highlight("color background navy"));
        return;
      }
      if (!THEMES[name]) {
        say(bad(`There's no theme called ${name}.`));
        return say(dim("Themes: ") + Object.keys(THEMES).map(n => cm(n)).join(dim(", ")));
      }
      appearance.theme = name;
      appearance.custom = {};
      saveSettings();
      applyLook();
      say(ok("✓ Theme: ") + nm(name) + dim("  (theme classic changes it back)"));
    },
  },
  {
    names: ["color", "colour", "colors", "colours"],
    level: "basic", group: "Look and feel",
    about: "pick your own colors",
    examples: [
      ["color background navy", "changes the background"],
      ["color text white", "changes the main text color"],
      ["color reset", "back to normal"],
      ["colors", "see every part and its color"],
      ["color prompt gold", "nerds can color any part"],
    ],
    basicShow: 2,
    notes: [
      "Use color names (red, gold, pink, navy, dark blue...) or codes like #ff8800.",
      "Parts you can color: background, text, prompt, commands, names, places, numbers, keywords, good, warnings, errors, hints.",
      "Can't read anything? Type color reset (or theme classic).",
    ],
    run(text) {
      const t = text.trim();
      if (!t) return showColors();
      if (/^(reset|default|normal|clear)$/i.test(t)) {
        appearance.theme = "classic";
        appearance.custom = {};
        saveSettings();
        applyLook();
        return say(ok("✓ Colors are back to normal."));
      }
      const m = t.match(/^(\S+)\s+(.+)$/);
      if (!m) return say(bad("Try: ") + highlight("color background navy"));
      const part = PART_WORDS[m[1].toLowerCase()];
      if (!part) {
        say(bad(`I don't know the part "${m[1]}".`));
        return say(dim("Parts: background, text, prompt, commands, names, places, numbers, keywords, good, warnings, errors, hints"));
      }
      const value = m[2].trim().toLowerCase().replace(/\s+/g, "");
      if (!window.CSS || !CSS.supports("color", value)) {
        say(bad(`I don't know the color "${m[2].trim()}".`));
        return say(dim("Try a color name like red, gold or navy, or a code like #ff8800."));
      }
      appearance.custom[part] = value;
      saveSettings();
      applyLook();
      say(ok("✓ ") + esc(PART_LABEL[part]) + " → " + `<span style="color:${esc(value)}">■</span> ` + esc(value));
      const against = part === "bg" ? "text" : "bg";
      if (sameColor(value, currentColor(against))) say(warn("Heads up: that's the same color as the " + PART_LABEL[against] + ", so you won't see it! Type color reset to fix it."));
    },
  },
  {
    names: ["size", "font", "zoom"],
    level: "basic", group: "Look and feel",
    about: "make the text bigger or smaller",
    examples: [["size bigger", "bigger text"], ["size smaller", "smaller text"], ["size 18", "an exact size (10 to 26)"]],
    run(text) {
      const t = text.trim().toLowerCase();
      let size = appearance.size;
      if (/^(bigger|big|larger|up|\+)$/.test(t)) size += 2;
      else if (/^(smaller|small|down|-)$/.test(t)) size -= 2;
      else if (/^\d+$/.test(t)) size = Number(t);
      else return say(dim(`The text size is ${appearance.size}. Try: `) + highlight("size bigger"));
      appearance.size = Math.max(10, Math.min(26, size));
      saveSettings();
      applyLook();
      say(ok("✓ Text size: ") + num(appearance.size));
    },
  },

  // ---------------- OTHER ----------------
  {
    names: ["help", "?", "man", "commands"],
    level: "basic", group: "Other",
    about: "show what you can type",
    examples: [["help", "the basic commands"], ["help add", "everything about one command"], ["help advanced", "every command and trick (for nerds)"]],
    basicShow: 3,
    run(text, word) {
      const topic = text.trim().toLowerCase();
      if (["advanced", "all", "everything", "nerd"].includes(topic) || (word === "man" && !topic)) return showAdvancedHelp();
      if (topic) return showCommandHelp(topic);
      showBasicHelp();
    },
  },
  {
    names: ["tutorial", "tut", "learn", "lesson"],
    level: "basic", group: "Other",
    about: "learn the console step by step",
    examples: [["tutorial", "learn the basics (start here!)"], ["tutorial advanced", "learn the nerdy tricks"], ["tutorial stop", "quit the tutorial"]],
    basicShow: 2,
    run(text) {
      const t = text.trim().toLowerCase();
      if (["stop", "quit", "end", "exit"].includes(t)) return stopTutorial();
      if (["advanced", "nerd", "2", "pro"].includes(t)) return startTutorial("advanced");
      startTutorial("basic");
    },
  },
  {
    names: ["clear", "cls", "clean"],
    level: "basic", group: "Other",
    about: "clean the screen",
    examples: [["clear", "clean the screen"]],
    run() { out.innerHTML = ""; },
  },
  {
    names: ["exit", "quit", "close", "bye", "logout", "q"],
    level: "basic", group: "Other",
    about: "leave the console",
    examples: [["exit", "leave the console (or tap ✕ Exit at the top)"]],
    run() { closeConsole(); },
  },
  {
    names: ["echo", "print"],
    level: "advanced", group: "Other",
    about: "prints whatever you type",
    examples: [["echo hi!", "prints hi!"]],
    run(text) { say(esc(text)); },
  },
  {
    names: ["date", "time"],
    level: "advanced", group: "Other",
    about: "shows today's date and time",
    examples: [["date", "today's date and time"]],
    run() { say(esc(new Date().toLocaleString())); },
  },
  {
    names: ["whoami"],
    level: "advanced", group: "Other",
    about: "tells you who you are",
    examples: [["whoami", "find out 🙂"]],
    run() { say("You. The boss of this brain. 🧠"); },
  },
];

// ==============================================================
// PART 4: HELP PAGES
// ==============================================================
const TRICKS = [
  ["Ranges", "Section 1-8 · Section 1..8 · Section {1..8} · 8-1 counts down"],
  ["Lists", "Reading, Writing, Speaking  (commas)"],
  ["Quotes", "\"Talk to mom\" keeps words like to / in / with inside a name"],
  ["Types", "add goal ... · add note ... · steps are the default"],
  ["Endings", "outside · inside · in order  (put them at the end of add)"],
  ["Paths", "Spanish/Section 1 · ~ = home · .. = up · ~/... = start at home · cd - = last spot"],
  ["All", "done all · delete all notes in Spanish · add Part 1-3 to all steps"],
  ["Many", "go Spanish; add Section 1-3   ( ; or && runs more than one )"],
  ["History", "↑ ↓ keys · !! = last command · !5 = command 5 · history"],
  ["Keys", "Tab = finish a name · Ctrl+L = clear the screen"],
  ["Safety", "rm -f skips the question · undo / redo remember " + UNDO_LIMIT + " changes"],
  ["Names", "BIG or small letters don't matter · extra copies get {2}, {3}..."],
  ["Slash", "/help works the same as help (so does /tutorial)"],
];

function showBasicHelp() {
  say(strong("🧠 BRAIN CONSOLE — THE BASICS"));
  say(dim("Type a command, then press Enter (or tap ⏎)."));
  GROUP_ORDER.forEach(group => {
    const cmds = COMMANDS.filter(c => c.level === "basic" && c.group === group);
    if (!cmds.length) return;
    say("");
    say(kw(group.toUpperCase()));
    cmds.forEach(c => c.examples.slice(0, c.basicShow || 1).forEach(([example, what]) => helpLine(example, what || c.about)));
  });
  say("");
  say(dim("1-8 means 1 to 8 · end with ") + kw("outside") + dim(" to show sub-steps on the map · end with ") + kw("in order") + dim(" for blue arrows"));
  say(dim("More: ") + cm("help add") + dim(" (works for any command) · ") + cm("help advanced") + dim(" · ") + cm("tutorial"));
}

function showAdvancedHelp() {
  say(strong("🤓 BRAIN CONSOLE — EVERYTHING"));
  say(dim("Every command, every nickname, every trick."));
  GROUP_ORDER.forEach(group => {
    const cmds = COMMANDS.filter(c => c.group === group);
    if (!cmds.length) return;
    say("");
    say(kw("── " + group.toUpperCase() + " ──"));
    cmds.forEach(c => {
      say(cm(c.names[0]) + dim(" — " + c.about) + (c.names.length > 1 ? dim("   (also: " + c.names.slice(1).join(", ") + ")") : ""));
      c.examples.forEach(([example, what]) => say("   " + highlight(example) + (what ? dim("  → " + what) : "")));
    });
  });
  say("");
  say(kw("── TRICKS ──"));
  TRICKS.forEach(([name, text]) => say(nm(name.padEnd(8)) + " " + esc(text)));
  say("");
  say(dim("Tip: ") + cm("help add") + dim(" shows more about one command. ") + cm("tutorial advanced") + dim(" teaches all of this."));
}

function showCommandHelp(topic) {
  const c = LOOKUP[cleanWord(topic.split(/\s+/)[0])];
  if (!c) {
    say(bad(`There's no command called ${topic}.`));
    return say(dim("Type ") + cm("help advanced") + dim(" to see every command."));
  }
  say(strong(c.names[0].toUpperCase()) + dim(" — " + c.about));
  if (c.names.length > 1) say(dim("Also works as: ") + c.names.slice(1).map(n => cm(n)).join(dim(", ")));
  say("");
  c.examples.forEach(([example, what]) => helpLine(example, what));
  if (c.notes) {
    say("");
    c.notes.forEach(n => say(dim("• ") + rich(n)));
  }
}

function helpLine(example, what) {
  say("  " + highlight(example));
  if (what) say("      " + dim(what));
}

// ==============================================================
// PART 5: TUTORIALS
//   say(P)   -> what I tell you   (P = practice bubble's name)
//   type(P)  -> what you should type
//   done(s)  -> true when you did it   (s.cmd = last command, s.box = practice bubble)
// ==============================================================
const TUTORIALS = {
  basic: {
    title: "Basics tutorial",
    sandbox: "Practice",
    finish: [
      "🎉 You finished the tutorial! You know the basics now.",
      "Remember: the console changes your REAL brain. Tap 🗺 Map anytime to see it.",
      "Type `help` anytime to see the commands.",
      "Want the nerdy tricks? Type `tutorial advanced`",
      "Tap ✕ Exit at the top to go back to your app.",
    ],
    steps: [
      {
        say: P => [
          "👋 Hi! This is your brain console.",
          "Anything in a box like `this` is a command. Type it exactly, then press Enter (or tap ⏎).",
          `I made a practice bubble called ${P} so nothing important gets messed up.`,
          "First, let's see what's at the top of your brain:",
        ],
        type: () => "look",
        done: s => s.cmd === "look",
      },
      {
        say: () => [
           "That list shows the bubbles at the top of your brain.",
           "To go inside a bubble, type `go` and then its name:",
        ],
        type: P => "go " + P,
        done: s => cwd === s.box,
      },
      {
        say: () => [
           "You're inside it now. The green text next to where you type always shows where you are.",
           "Let's make 3 steps at once. `1-3` means 1, 2 and 3:",
        ],
        type: () => "add Section 1-3",
        done: s => kidsOf(s.box, "step").length >= 3,
      },
      {
        say: () => [
           "Boom, 3 steps! Now let's put 4 units inside EACH section.",
           "The word `to` means 'put them inside':",
        ],
        type: () => "add Unit 1-4 to Section 1-3",
        done: s => kidsOf(s.box, "step").filter(k => childrenOf(k.id).length >= 4).length >= 3,
      },
      {
        say: P => [
          "That made 12 units with one command! 😎",
          "⚠ This isn't pretend. The console changes your REAL brain map.",
          `Let's go look! \`map\` takes you to your brain map, right where you are (inside ${P}).`,
          "When you're done looking, tap the green  >_ Back to console  button.",
        ],
        type: () => "map",
        done: s => s.cmd === "map",
      },
      {
        say: () => [
           "Welcome back! Did you see your 3 sections on the map? 🗺",
           "You can tap 🗺 Map at the top of the console anytime to check what changed.",
           "Now let's go inside Section 1:",
        ],
        type: () => "go Section 1",
        done: s => cwd !== null && parentOf(cwd) === s.box,
      },
      {
        say: () => [
           "Now look around in here:",
        ],
        type: () => "look",
        done: s => s.cmd === "look" && cwd !== null && parentOf(cwd) === s.box,
      },
      {
        say: () => [
           "Pretend you finished the first 2 units. `done` checks them off:",
        ],
        type: () => "done Unit 1-2",
        done: () => cwd !== null && childrenOf(cwd).filter(k => k.done).length >= 2,
      },
      {
        say: () => [
           "Section 1 is now 50% done (its ring on the map fills up too!).",
           "`back` goes back out one level:",
        ],
        type: () => "back",
        done: s => cwd === s.box,
      },
      {
        say: () => [
           "You can make bubbles AND what's inside them in one go, with the word `with`:",
        ],
        type: () => "add Lesson 1-2 with Part 1-3",
        done: s => childrenOf(s.box).some(k => /^lesson/i.test(k.text) && childrenOf(k.id).length >= 3),
      },
      {
        say: () => [
           "Let's say Section 3 was a mistake. `delete` removes it.",
           "I'll ask you first, so type `yes` when I do.",
        ],
        type: () => "delete Section 3",
        done: s => !childByName(s.box, "Section 3"),
      },
      {
        say: () => [
           "Gone! Oops... we actually wanted it. `undo` brings it back:",
        ],
        type: () => "undo",
        done: s => !!childByName(s.box, "Section 3"),
      },
      {
        say: () => [
           "Phew. 😅 Now let's make the console look cool:",
        ],
        type: () => "theme green",
        done: () => appearance.theme === "green",
      },
      {
        say: P => [
           "Nice! (`theme classic` changes it back.)",
           `Last thing: clean up by deleting ${P}:`,
        ],
        type: P => "delete " + P,
        done: s => !findBubble(s.box),
      },
    ],
  },

  advanced: {
    title: "Advanced tutorial 🤓",
    sandbox: "Lab",
    finish: [
      "🤓 You're a brain console pro now!",
      "`help advanced` lists every command and trick.",
      "Type `color reset` if you want the normal colors back.",
    ],
    steps: [
      {
        say: P => [
          "Welcome, nerd. 🤓 Commands are shown in boxes like `this`.",
          "Linux nicknames work here: `ls` = look · `cd` = go · `pwd` = where · `rm` = delete · `mv` = move · `cp` = copy",
          `I made a bubble called ${P} to experiment in. Everything you do changes your real map, so tap 🗺 Map anytime to watch.`,
        ],
        type: P => "cd " + P,
        done: s => cwd === s.box,
      },
      {
        say: () => [
           "Bash-style ranges work: `{1..4}`.",
           "`in order` links them with blue arrows (and hides their main lines so it reads like a path):",
        ],
        type: () => "add Level {1..4} in order",
        done: s => kidsOf(s.box, "step").filter(k => k.after != null).length >= 3,
      },
      {
        say: () => [
           "`all steps` = every step in here.",
           "`outside` = hang them off their bubble on the map:",
        ],
        type: () => "add Part 1-3 to all steps outside",
        done: s => kidsOf(s.box, "step").some(k => childrenOf(k.id).filter(c => c.outside).length >= 3),
      },
      {
        say: () => [
           "Want to see that? `map` shows it (tap  >_ Back to console  to come back):",
        ],
        type: () => "map",
        done: s => s.cmd === "map",
      },
      {
        say: () => [
           "Commas make lists, and the first word can pick the type (`goal`, `step` or `note`):",
        ],
        type: () => "add note Tip A, Tip B",
        done: s => kidsOf(s.box, "note").length >= 2,
      },
      {
        say: () => [
           "`tree` shows everything below you as text, like the Linux tree command:",
        ],
        type: () => "tree",
        done: s => s.cmd === "tree",
      },
      {
        say: () => [
           "Paths: `/` means 'inside'. Jump 2 levels deep at once:",
        ],
        type: () => "cd Level 2/Part 1",
        done: s => cwd !== null && parentOf(parentOf(cwd)) === s.box,
      },
      {
        say: () => [
           "`..` means up one level, so `../..` goes up two.",
           "(and `cd -` jumps back to the last place you were)",
        ],
        type: () => "cd ../..",
        done: s => cwd === s.box,
      },
      {
        say: () => [
           "`find` searches your WHOLE brain:",
        ],
        type: () => "find part",
        done: s => s.cmd === "find",
      },
      {
        say: () => [
           "`mkdir` works too (it makes a step):",
        ],
        type: () => "mkdir Backup",
        done: s => !!childByName(s.box, "Backup"),
      },
      {
        say: () => [
           "`cp` copies bubbles with everything inside them:",
        ],
        type: () => "cp Level 1-2 to Backup",
        done: s => {
           const b = childByName(s.box, "Backup");
           return !!b && childrenOf(b.id).length >= 2;
        },
      },
      {
        say: () => [
           "`mv` moves a bubble INTO another one if it exists.",
           "Saved doesn't exist, so `mv` renames it instead (just like Linux):",
        ],
        type: () => "mv Backup to Saved",
        done: s => !!childByName(s.box, "Saved"),
      },
      {
        say: () => [
           "`;` runs more than one command.",
           "`done` on a bubble checks off everything inside it:",
        ],
        type: () => "done Level 1; ls",
        done: s => {
           const l = childByName(s.box, "Level 1");
           return s.cmd === "look" && !!l && isFinished(l);
        },
      },
      {
        say: () => [
           "`history` shows what you typed.",
           "`!!` runs the last command again, and `!5` runs command number 5.",
        ],
        type: () => "history",
        done: s => s.cmd === "history",
      },
      {
        say: () => [
           "You can color any part: text, background, prompt, commands, names, places, numbers, keywords, good, warnings, errors, hints.",
        ],
        type: () => "color prompt gold",
        done: () => !!appearance.custom.prompt,
      },
      {
        say: () => [
           "Last one. `rm -f` deletes WITHOUT asking, so be careful (`undo` still works):",
        ],
        type: P => "rm -f " + P,
        done: s => !findBubble(s.box),
      },
    ],
  },
};

function startTutorial(kind) {
  const lesson = TUTORIALS[kind];
  if (tut) say(dim("(Starting a new tutorial.)"));
  const name = uniqueTopName(lesson.sandbox);
  const sandbox = makeBubble(null, name, "goal", false);   // not undoable on purpose
  saveBrain();
  refreshMap();
  tut = { kind, step: 0, box: sandbox.id, name };
  prevCwd = cwd;
  cwd = null;
  say("");
  say(strong("🎓 " + lesson.title));
  say(dim("Type skip to skip a step, or stop to quit the tutorial."));
  showStep();
}

function showStep() {
  const lesson = TUTORIALS[tut.kind];
  const step = lesson.steps[tut.step];
  tut.shownOnLine = lineCount;   // so I don't nag right after showing the step
  say("");
  say(kw(`🎓 Step ${tut.step + 1} of ${lesson.steps.length}`));
  step.say(tut.name).forEach(line => say(rich(line)));
  say(ok("👉 Type: ") + code(step.type(tut.name)));
  updateChips();
}

function currentTask() {
  if (!tut) return null;
  return TUTORIALS[tut.kind].steps[tut.step].type(tut.name);
}

function tutorialCheck(typedSomething) {
  if (!tut || pending) return;
  const step = TUTORIALS[tut.kind].steps[tut.step];
  let passed = false;
  try { passed = step.done({ cmd: lastCmd, box: tut.box }); } catch (e) { passed = false; }
  if (passed) {
    say(ok(PRAISE[Math.floor(Math.random() * PRAISE.length)]));
    nextStep();
  } else if (typedSomething && tut.shownOnLine !== lineCount) {
    say(dim("👉 When you're ready, type: ") + code(step.type(tut.name)) + dim("   (or ") + code("skip") + dim(" / ") + code("stop") + dim(")"));
  }
}

function nextStep() {
  tut.step++;
  if (tut.step >= TUTORIALS[tut.kind].steps.length) return finishTutorial();
  showStep();
}

function finishTutorial() {
  const lesson = TUTORIALS[tut.kind];
  tut = null;
  say("");
  lesson.finish.forEach(line => say(rich(line, "good")));
  updateChips();
}

function stopTutorial() {
  if (!tut) return say(dim("There's no tutorial running. Type tutorial to start one."));
  const sandbox = findBubble(tut.box);
  tut = null;
  say(warn("Tutorial stopped."));
  if (sandbox) say(dim("Your practice bubble is still there. Delete it with: ") + highlight("delete " + sandbox.text));
  updateChips();
}

// ==============================================================
// PART 6: WHAT THE COMMANDS DO
// ==============================================================

// ---------- add ----------
function addCommand(text) {
  if (!text.trim()) return say(bad("Add what? Try: ") + highlight("add Section 1-3"));
  const flags = { outside: false, inOrder: false };
  let rest = grabFlags(text, flags);

  // 1. where do they go?  "... to Section 1-8"
  let targets = [cwd];
  const where = splitAt(rest, ["to", "into", "in", "inside"], true);
  if (where) {
    const found = findTargets(grabFlags(where.right, flags));
    if (found.error) {
      showError(found);
      if (!found.matches) {
        const whole = readTyped(where.left + " " + where.word + " " + where.right, "step");
        const example = "add " + (whole.type !== "step" ? whole.type + " " : "") + '"' + whole.spec + '"';
        say(dim(`If "${where.word} ${where.right}" is part of the name, put the name in quotes: `) + highlight(example));
      }
      return;
    }
    targets = found.ids;
    rest = where.left;
  }

  // 2. "with" = also make things inside each new one
  let subText = null;
  const w = splitAt(rest, ["with"], false);
  if (w) { rest = w.left; subText = grabFlags(w.right, flags); }
  rest = grabFlags(rest, flags);

  // 3. read the names (ranges, lists, types)
  const main = readTyped(rest, "step");
  let names, subs = null, subType = "step";
  try {
    names = expandNames(main.spec);
    if (subText !== null) {
      const s = readTyped(subText, "step");
      subs = expandNames(s.spec);
      subType = s.type;
    }
  } catch (e) { return say(bad(e.message)); }
  if (!names.length || (subs && !subs.length)) return say(bad("Add what? Try: ") + highlight("add Section 1-3"));

  const total = targets.length * names.length * (1 + (subs ? subs.length : 0));
  if (total > MAX_AT_ONCE) {
    say(bad(`That would make ${total} bubbles!`));
    return say(dim(`The most I can make at once is ${MAX_AT_ONCE}. Try it in smaller pieces.`));
  }

  // 4. is any of it already there?
  const plan = { targets, names, type: main.type, subs, subType, outside: flags.outside, inOrder: flags.inOrder };
  const dups = [];
  targets.forEach(t => names.forEach(n => {
    const old = childByName(t, n);
    if (old && !dups.includes(old)) dups.push(old);
  }));
  if (!dups.length) return doAdd(plan, "keep");
  const keepText = subs ? "keep them, and only add what's missing inside them" : "leave them alone, only add what's missing";
  askAboutDuplicates(dups, keepText, mode => doAdd(plan, mode));
}

function doAdd(plan, mode) {
  let made = 0, madeSubs = 0, kept = 0, keptSubs = 0, replaced = 0;
  const label = "add " + (plan.names.length === 1 ? plan.names[0] : plan.names[0] + " ... " + plan.names[plan.names.length - 1]);
  change(label, () => {
    plan.targets.forEach(t => {
      const row = [];
      plan.names.forEach(n => {
        let item = childByName(t, n);
        let name = n;
        if (item && mode === "replace") { removeDeep(item.id); replaced++; item = null; }
        else if (item && mode === "new") { item = null; name = markedName(t, n); }
        if (item) kept++;
        else { item = makeBubble(t, name, plan.type, plan.outside && !plan.subs); made++; }
        row.push(item);
        if (plan.subs) {
          const subRow = [];
          plan.subs.forEach(s => {
            let sub = childByName(item.id, s);
            if (sub) keptSubs++;
            else { sub = makeBubble(item.id, s, plan.subType, plan.outside); madeSubs++; }
            subRow.push(sub);
          });
          if (plan.inOrder) chain(subRow);
        }
      });
      if (plan.inOrder) chain(row);
    });
  });

  // tell them what happened
  const place = plan.targets.length === 1 ? pl(nameOf(plan.targets[0])) : num(plan.targets.length) + " places";
  const bits = [];
  if (made) bits.push(num(made) + " " + plural(plan.type, made));
  if (madeSubs) bits.push(num(madeSubs) + " " + plural(plan.subType === "step" ? "sub-step" : plan.subType, madeSubs));
  if (bits.length) say(ok("✓ Added ") + bits.join(" and ") + " in " + place);
  else say(dim("Nothing new to add. It was all already there."));
  if (kept) say(dim(`Kept ${kept} that ${kept === 1 ? "was" : "were"} already there.`));
  if (keptSubs) say(dim(`${keptSubs} sub-steps were already there, so I left them alone.`));
  if (replaced) say(warn(`Replaced ${replaced} old ${plural("one", replaced)}.`) + dim(" Type undo to get them back."));
  if (plan.inOrder && bits.length) say(dim("Linked them in order with blue arrows."));
  if (madeSubs && !plan.outside) say(dim("The sub-steps are inside. Tap a bubble on your map to see them (or end with outside next time)."));
  if (plan.outside && (made || madeSubs)) say(dim("They'll hang outside on your map."));
}

function askAboutDuplicates(dups, keepText, onChoice) {
  const n = dups.length;
  say(warn(n === 1 ? "⚠ This already exists:" : `⚠ ${n} of these already exist:`));
  dups.slice(0, 5).forEach(d => describe(d).forEach(line => say("  " + line)));
  if (n > 5) say(dim(`  ...and ${n - 5} more`));
  say("What should I do?");
  say("  " + cm("keep") + dim(" — " + keepText));
  say("  " + cm("new") + dim(" — make new ones anyway, marked ") + nm("{2}"));
  say("  " + cm("replace") + dim(" — delete the old ones (and what's inside) and start fresh"));
  say("  " + cm("cancel") + dim(" — do nothing"));
  ask(["keep", "new", "replace", "cancel"], choice => {
    if (choice === "cancel") return say(dim("Okay, nothing changed."));
    onChoice(choice);
  });
}

// ---------- done / undone ----------
function setDone(text, value) {
  const t = text.replace(/^off\s+/i, "").trim();
  if (!t) return say(bad(value ? "Check off what? Try: " : "Un-check what? Try: ") + highlight(value ? "done Unit 1-3" : "undone Unit 3"));
  const r = resolveItems(t);
  if (r.error) return showError(r);
  let changed = 0, notes = 0;
  change(value ? "check off" : "un-check", () => {
    r.items.forEach(b => {
      if (b.type === "note") { notes++; return; }
      leafSteps(b).forEach(s => { if (!!s.done !== value) { s.done = value; changed++; } });
    });
  });
  if (changed) say(ok(value ? "✓ Checked off " : "↺ Un-checked ") + num(changed) + " " + plural("step", changed));
  else say(dim(value ? "Those were already checked off." : "Those weren't checked off."));
  if (notes) say(dim("(Notes can't be checked off.)"));
}

// ---------- rename ----------
function renameCommand(text) {
  const s = splitAt(text, ["to", "as", "into"], true);
  if (!s) return say(bad("Rename it to what? Try: ") + highlight("rename Section 1 to Basics"));
  // "rename Unit 1-3 to Lesson 1-3 in Section 1"  ->  the "in Section 1" belongs to the old names
  let oldSpec = s.left, newSpec = s.right;
  const inside = splitAt(s.right, ["in", "inside", "from"], true);
  if (inside && !/(^|\s)(in|inside|from)\s/i.test(mask(s.left)) && !findPlace(inside.right).error) {
    oldSpec = s.left + " in " + inside.right;
    newSpec = inside.left;
  }
  const r = resolveItems(oldSpec);
  if (r.error) return showError(r);
  let newNames;
  try { newNames = expandNames(newSpec); } catch (e) { return say(bad(e.message)); }
  if (newNames.length !== r.items.length) {
    say(bad(`You picked ${r.items.length} ${plural("bubble", r.items.length)} but gave ${newNames.length} new ${plural("name", newNames.length)}.`));
    return say(dim("Example: ") + highlight("rename Unit 1-3 to Lesson 1-3"));
  }
  const oldNames = r.items.map(b => b.text);
  const notes = [];
  change("rename " + oldNames[0], () => r.items.forEach((b, i) => {
    let name = newNames[i];
    const clash = childrenOf(b.parent).find(k => k.id !== b.id && same(k.text, name));
    if (clash) {
      name = markedName(b.parent, name);
      notes.push(`There was already a ${clash.text} there, so this one is called ${name}.`);
    }
    b.text = name;
  }));
  if (r.items.length === 1) say(ok("✓ Renamed ") + nm(oldNames[0]) + dim(" → ") + nm(r.items[0].text));
  else say(ok("✓ Renamed ") + num(r.items.length) + " bubbles " + dim("(") + nm(oldNames[0]) + dim(" → ") + nm(r.items[0].text) + dim(" ...)"));
  notes.forEach(n => say(dim(n)));
}

// ---------- move / mv ----------
function moveCommand(text, smart) {
  let s = splitAt(text, ["to", "into", "in"], true);
  if (!s) {
    const q = text.match(/^\s*"([^"]+)"\s+"([^"]+)"\s*$/);
    if (q) s = { left: `"${q[1]}"`, right: `"${q[2]}"` };
  }
  if (!s) return say(bad("Move it where? Try: ") + highlight("move Unit 9 to Section 2"));
  const r = resolveItems(s.left);
  if (r.error) return showError(r);
  const dest = findPlace(s.right);
  if (dest.error) {
    if (smart && !dest.matches) return renameCommand(s.left + " to " + s.right);   // Linux mv renames
    return showError(dest);
  }
  const loop = r.items.find(b => isInsideOrSame(dest.id, b.id));
  if (loop) return say(bad(`Can't move ${loop.text} inside itself.`));
  const notes = [];
  const moved = r.items.filter(b => b.parent !== dest.id);
  if (!moved.length) return say(dim(`They're already in ${nameOf(dest.id)}.`));
  change("move " + moved[0].text, () => {
    moved.forEach(b => {
      if (childByName(dest.id, b.text)) {
        const newName = markedName(dest.id, b.text);
        notes.push(`There was already a ${b.text} there, so this one is called ${newName}.`);
        b.text = newName;
      }
      b.parent = dest.id;
      b.attach = null;
      delete b.x; delete b.y; delete b.ox; delete b.oy;
    });
    // blue arrows only work between bubbles in the same place
    brain.forEach(o => {
      const first = o.after != null ? findBubble(o.after) : null;
      if (first && first.parent !== o.parent) o.after = null;
      const anchor = o.attach != null ? findBubble(o.attach) : null;
      if (anchor && anchor.parent !== o.parent) o.attach = null;
    });
  });
  say(ok("✓ Moved ") + num(moved.length) + " " + plural("bubble", moved.length) + " into " + pl(nameOf(dest.id)));
  notes.forEach(n => say(dim(n)));
}

// ---------- copy ----------
function copyCommand(text) {
  const t = text.replace(/(^|\s)-(?:r|R|a|-recursive)(?=\s|$)/g, " ").trim();
  let s = splitAt(t, ["to", "into"], true);
  if (!s) {   // Linux style without "to":  cp Spanish/* French   or   cp "Unit 1" "Section 2"
    const q = t.match(/^\s*"([^"]+)"\s+"([^"]+)"\s*$/) || t.match(/^(.+?\/\s*\*)\s+(.+)$/);
    if (q) s = { left: q[0].startsWith('"') ? `"${q[1]}"` : q[1], right: q[0].startsWith('"') ? `"${q[2]}"` : q[2] };
  }
  if (!s) return say(bad("Copy to where? Try: ") + highlight("copy Section 1-8 to French"));
  const targets = findTargets(s.right);
  if (targets.error) return showError(targets);

  // "everything in Spanish" / "inside Spanish" / "Spanish/*" = only what's inside
  const left = s.left.trim();
  const m = left.match(/^(?:everything|all|all the stuff|what'?s|whats)\s+(?:in|inside|inside of|from)\s+(.+)$/i)
         || left.match(/^(?:inside of|inside|contents of|the contents of)\s+(.+)$/i)
         || left.match(/^(.+?)\s*\/\s*\*$/);
  if (m) {
    const place = findPlace(m[1]);
    if (place.error) return showError(place);
    const kids = sorted(childrenOf(place.id));
    if (!kids.length) return say(bad(`There's nothing inside ${nameOf(place.id)} to copy.`));
    return copyCheck(kids, targets.ids);
  }

  const r = resolveItems(left);
  if (r.error) return showError(r);
  if (r.items.length === 1 && childrenOf(r.items[0].id).length) {
    const one = r.items[0];
    const n = childrenOf(one.id).length;
    say(`Copy ${nm(one.text)} itself, or just the ${num(n)} ${plural("thing", n)} inside it?`);
    say("  " + cm("itself") + dim(` — makes a ${one.text} bubble there (with everything inside)`));
    say("  " + cm("inside") + dim(` — only copies what's inside ${one.text}`));
    return ask(["itself", "inside", "cancel"], a => {
      if (a === "cancel") return say(dim("Okay, nothing was copied."));
      copyCheck(a === "itself" ? [one] : sorted(childrenOf(one.id)), targets.ids);
    });
  }
  copyCheck(r.items, targets.ids);
}

function copyCheck(sources, targetIds) {
  for (const t of targetIds) {
    const loop = sources.find(src => isInsideOrSame(t, src.id));
    if (loop) return say(bad(`Can't copy ${loop.text} inside itself.`));
  }
  const total = sources.reduce((n, src) => n + countAll(src.id), 0) * targetIds.length;
  if (total > MAX_COPY) return say(bad(`That would copy ${total} bubbles. The most I can copy at once is ${MAX_COPY}.`));
  const dups = [];
  targetIds.forEach(t => sources.forEach(src => {
    const old = childByName(t, src.text);
    if (old && !dups.includes(old)) dups.push(old);
  }));
  if (!dups.length) return doCopy(sources, targetIds, "keep");
  askAboutDuplicates(dups, "leave those alone (don't copy them)", mode => doCopy(sources, targetIds, mode));
}

function doCopy(sources, targetIds, mode) {
  let top = 0, made = 0, skipped = 0, replaced = 0;
  change("copy " + (sources.length === 1 ? sources[0].text : sources.length + " bubbles"), () => {
    const trees = sources.map(src => snapshotTree(src.id));   // copy what's there NOW (never the copies)
    targetIds.forEach(t => {
      const idMap = new Map();
      const pairs = [];
      trees.forEach(tree => {
        const src = tree.node;
        let name = src.text;
        const old = childByName(t, name);
        if (old) {
          if (mode === "keep") { skipped++; return; }
          if (mode === "replace" && old.id !== src.id && !isInsideOrSame(src.id, old.id)) { removeDeep(old.id); replaced++; }
          else name = markedName(t, name);
        }
        top++;
        made += buildCopy(tree, t, name, idMap, pairs);
      });
      // keep blue arrows + attachments that were inside the copied group
      pairs.forEach(([orig, copy]) => {
        copy.after = idMap.has(orig.after) ? idMap.get(orig.after) : null;
        if (idMap.has(orig.attach)) copy.attach = idMap.get(orig.attach);
      });
    });
  });
  if (!top) return say(dim("Nothing was copied (it was all already there)."));
  const place = targetIds.length === 1 ? pl(nameOf(targetIds[0])) : num(targetIds.length) + " places";
  say(ok("✓ Copied ") + num(top) + " " + plural("bubble", top) + (made > top ? dim(` (${made} counting what's inside)`) : "") + " to " + place);
  say(dim("Copies start un-checked."));
  if (skipped) say(dim(`Skipped ${skipped} that ${skipped === 1 ? "was" : "were"} already there.`));
  if (replaced) say(warn(`Replaced ${replaced}.`) + dim(" Type undo to get the old ones back."));
}

function snapshotTree(id) {
  return { node: Object.assign({}, findBubble(id)), kids: childrenOf(id).map(k => snapshotTree(k.id)) };
}

function buildCopy(tree, parent, name, idMap, pairs) {
  const src = tree.node;
  const copy = { id: newId(), text: name, type: src.type, parent, done: false, after: null };
  if (src.outside) copy.outside = true;
  if (src.hideMain) copy.hideMain = true;
  if (src.alsoCenter) copy.alsoCenter = true;
  brain.push(copy);
  idMap.set(src.id, copy.id);
  pairs.push([src, copy]);
  let count = 1;
  tree.kids.forEach(k => { count += buildCopy(k, copy.id, k.node.text, idMap, pairs); });
  return count;
}

// ---------- delete ----------
function deleteCommand(text) {
  let force = false;
  const t = text.replace(/(^|\s)-(?:-force|[rRfF]{1,2})(?=\s|$)/g, m => { if (/f/i.test(m)) force = true; return " "; }).trim();
  if (!t) return say(bad("Delete what? Try: ") + highlight("delete Section 3"));
  const r = resolveItems(t);
  if (r.error) return showError(r);
  const items = r.items;
  const total = items.reduce((n, b) => n + countAll(b.id), 0);
  const label = items.length === 1 ? items[0].text : items.length + " bubbles";
  const doIt = () => {
    const holder = items.find(b => isInsideOrSame(cwd, b.id));   // are you standing inside what gets deleted?
    change("delete " + label, () => items.forEach(b => { if (findBubble(b.id)) removeDeep(b.id); }));
    if (holder) cwd = holder.parent;
    checkCwd();
    say(ok("✓ Deleted ") + num(total) + " " + plural("bubble", total) + dim("  (type undo to bring them back)"));
  };
  if (force) return doIt();
  say(warn("⚠ This will delete:"));
  items.slice(0, 6).forEach(b => describe(b).forEach(line => say("  " + line)));
  if (items.length > 6) say(dim(`  ...and ${items.length - 6} more`));
  if (total > items.length) say(warn(`That's ${total} bubbles in total, counting what's inside.`));
  ask(["yes", "no"], a => (a === "yes" ? doIt() : say(dim("Okay, nothing was deleted."))));
}

// ---------- outside / inside ----------
function setOutside(text, value) {
  const r = resolveItems(text);
  if (r.error) return showError(r);
  let changed = 0, goals = 0;
  change(value ? "show outside" : "move inside", () => r.items.forEach(b => {
    if (b.type === "goal") { goals++; return; }
    if (!!b.outside !== value) { b.outside = value; delete b.ox; delete b.oy; changed++; }
  }));
  say(ok("✓ ") + num(changed) + " " + plural("bubble", changed) + (value ? " now hang outside on the map" : " are now inside"));
  if (goals) say(dim("(Goals can't hang outside. On the map, drag a goal onto another one to attach it.)"));
}

// ---------- undo / redo ----------
// Every change is saved as "before" and "after" so undo can go back.
function change(label, doChange) {
  const before = JSON.stringify(brain);
  doChange();
  const after = JSON.stringify(brain);
  if (after === before) return false;
  undoList.push({ label, before, after });
  if (undoList.length > UNDO_LIMIT) undoList.shift();
  redoList.length = 0;
  saveBrain();
  refreshMap();
  changedThisLine = true;
  changedSinceMap = true;
  return true;
}

function doUndo() {
  const rec = undoList[undoList.length - 1];
  if (!rec) return say(dim("There's nothing to undo."));
  const go = () => {
    undoList.pop();
    redoList.push(rec);
    brain = JSON.parse(rec.before);
    saveBrain();
    checkCwd();
    refreshMap();
    say(ok("↺ Undid: ") + esc(rec.label));
  };
  if (JSON.stringify(brain) !== rec.after) {
    say(warn("⚠ Your brain changed since then (maybe on the map)."));
    say(dim("Undoing will also undo those changes. Undo anyway?"));
    return ask(["yes", "no"], a => (a === "yes" ? go() : say(dim("Okay, nothing changed."))));
  }
  go();
}

function doRedo() {
  const rec = redoList[redoList.length - 1];
  if (!rec) return say(dim("There's nothing to redo."));
  const go = () => {
    redoList.pop();
    undoList.push(rec);
    brain = JSON.parse(rec.after);
    saveBrain();
    checkCwd();
    refreshMap();
    say(ok("↻ Redid: ") + esc(rec.label));
  };
  if (JSON.stringify(brain) !== rec.before) {
    say(warn("⚠ Your brain changed since then. Redo anyway?"));
    return ask(["yes", "no"], a => (a === "yes" ? go() : say(dim("Okay, nothing changed."))));
  }
  go();
}

// ---------- making + deleting bubbles ----------
function makeBubble(parent, text, type, outside) {
  const b = { id: newId(), text, type, parent, done: false, after: null };
  if (outside) b.outside = true;
  brain.push(b);
  return b;
}

function removeDeep(id) {
  const doomed = [id];
  for (let i = 0; i < doomed.length; i++) childrenOf(doomed[i]).forEach(k => doomed.push(k.id));
  const gone = new Set(doomed);
  brain = brain.filter(b => !gone.has(b.id));
  brain.forEach(b => {
    if (gone.has(b.after)) b.after = null;
    if (gone.has(b.attach)) b.attach = null;
  });
  return doomed.length;
}

// Section 1, Section 2 ... with blue "must do first" arrows (and hidden main lines)
function chain(list) {
  for (let i = 1; i < list.length; i++) {
    const prev = list[i - 1], cur = list[i];
    if (prev.after === cur.id) prev.after = null;
    cur.after = prev.id;
    cur.hideMain = true;
  }
}

// every bubble needs its own id number
function newId() {
  let id = Math.max(Date.now(), lastId + 1);
  while (findBubble(id)) id++;
  lastId = id;
  return id;
}

// "Section 1" is taken? -> "Section 1 {2}"
function markedName(parent, name) {
  let n = 2;
  while (childByName(parent, `${name} {${n}}`)) n++;
  return `${name} {${n}}`;
}

function uniqueTopName(base) {
  let name = base, n = 2;
  while (childByName(null, name)) name = base + " " + n++;
  return name;
}

// the steps that actually hold a checkmark (steps with nothing to count inside)
function leafSteps(b) {
  const counted = childrenOf(b.id).filter(k => k.type !== "note");
  if (b.type === "step" && !counted.length) return [b];
  const found = [];
  counted.forEach(k => found.push(...leafSteps(k)));
  return found;
}

// redraw the brain map after a change
function refreshMap() {
  if (brainView !== null && !findBubble(brainView)) brainView = null;
  try { if (typeof closeMenu === "function") closeMenu(); } catch (e) { /* menu not ready */ }
  try { if (typeof showBrain === "function") showBrain(false); } catch (e) { console.error(e); }
}

// ==============================================================
// PART 7: FINDING BUBBLES AND READING NAMES
// ==============================================================

function norm(s) { return String(s).toLowerCase().replace(/\s+/g, " ").trim(); }
function same(a, b) { return norm(a) === norm(b); }
function childByName(parent, name) { return childrenOf(parent).find(k => same(k.text, name)); }
function kidsOf(id, type) { return childrenOf(id).filter(k => k.type === type); }

function parentOf(id) {
  if (id === null || id === undefined) return null;
  const b = findBubble(id);
  return b && b.parent !== undefined ? b.parent : null;
}

function nameOf(id) {
  if (id === null || id === undefined) return "My brain";
  const b = findBubble(id);
  return b ? b.text : "My brain";
}

function pathText(id) {
  if (id === null || id === undefined) return "~";
  const names = [];
  let b = findBubble(id), guard = 0;
  while (b && guard++ < 100) { names.unshift(b.text); b = findBubble(b.parent); }
  return "~/" + names.join("/");
}

function isInsideOrSame(id, ancestor) {
  if (ancestor === null) return true;
  let cur = id, guard = 0;
  while (cur !== null && cur !== undefined && guard++ < 200) {
    if (cur === ancestor) return true;
    cur = parentOf(cur);
  }
  return false;
}

function countAll(id) {
  let n = 0;
  const stack = [id];
  while (stack.length) {
    const x = stack.pop();
    n++;
    childrenOf(x).forEach(k => stack.push(k.id));
  }
  return n;
}

// natural sort: Section 2 comes before Section 10
function sorted(list) {
  return [...list].sort((a, b) => a.text.localeCompare(b.text, undefined, { numeric: true, sensitivity: "base" }));
}

function plural(word, n) { return n === 1 ? word : word + "s"; }

function listOf(names) {
  const shown = names.slice(0, 3).join(", ");
  return names.length > 3 ? `${shown} and ${names.length - 3} more` : shown;
}

function checkCwd() {
  if (cwd !== null && !findBubble(cwd)) cwd = null;
  if (prevCwd !== null && !findBubble(prevCwd)) prevCwd = null;
}

function goTo(id) {
  if (id === undefined) id = null;
  if (id !== cwd) { prevCwd = cwd; cwd = id; }
  say(dim("📂 ") + pl(pathText(id)) + dim(`  (${childrenOf(id).length} inside)`));
}

// Find ONE place from what was typed: "Spanish", "My 6 Languages/Spanish", "..", "~"
function findPlace(text, from = cwd) {
  let t = text.trim().replace(/^"(.*)"$/, "$1").trim();
  if (!t) return { error: "Which place? Type a name, like: go Spanish" };
  const low = t.toLowerCase();
  const realKid = childByName(from, t);          // a bubble really called "Home"? that wins
  if (realKid && !["~", "/", "~/", "..", "."].includes(low)) return { id: realKid.id };
  if (["~", "/", "~/", "home", "top", "my brain"].includes(low)) return { id: null };
  if ([".", "here"].includes(low)) return { id: from };
  if (["..", "back", "up"].includes(low)) return { id: parentOf(from) };
  const fromTop = /^~?\//.test(t);
  const parts = t.replace(/^~?\/+/, "").split("/").map(p => p.trim().replace(/^"(.*)"$/, "$1")).filter(Boolean);
  if (!parts.length) return { id: null };

  const walk = (start, list) => {
    let cur = start;
    for (const p of list) {
      if (p === "..") { cur = parentOf(cur); continue; }
      if (p === ".") continue;
      if (p === "~") { cur = null; continue; }
      const kid = childByName(cur, p);
      if (!kid) return null;
      cur = kid.id;
    }
    return { id: cur };
  };

  // 1. from where you are, then from the top
  const direct = fromTop ? walk(null, parts) : (walk(from, parts) || walk(null, parts));
  if (direct) return direct;
  if (fromTop) return { error: `I can't find ${t}.`, tip: "Type look to see what's here." };

  // 2. search the whole brain
  const found = [];
  brain.filter(b => same(b.text, parts[0])).forEach(b => {
    const end = walk(b.id, parts.slice(1));
    if (end && !found.includes(end.id)) found.push(end.id);
  });
  if (found.length === 1) return { id: found[0] };
  if (found.length > 1) return { error: `There are ${found.length} bubbles called ${parts[parts.length - 1]}. Which one?`, matches: found };
  return { error: `I can't find "${t}".`, tip: `Type look to see what's in ${nameOf(from)}, or find ${parts[parts.length - 1]} to search everywhere.` };
}

// Find the places after "to": "Section 1-8", "French, Italian", "all steps"
function findTargets(spec) {
  const s = spec.trim();
  const all = s.match(/^(all|each|every|everything|\*)(?:\s+(?:of\s+)?(?:the\s+)?(steps?|goals?|notes?|ones?|bubbles?|things?|of them))?$/i);
  if (all) {
    const kind = (all[2] || "").toLowerCase();
    let kids = childrenOf(cwd);
    if (kind.startsWith("step")) kids = kids.filter(k => k.type === "step");
    else if (kind.startsWith("goal")) kids = kids.filter(k => k.type === "goal");
    else if (kind.startsWith("note")) kids = kids.filter(k => k.type === "note");
    else kids = kids.filter(k => k.type !== "note");
    if (!kids.length) return { error: "There's nothing here to put them in." };
    return { ids: sorted(kids).map(k => k.id) };
  }
  let names;
  try { names = expandNames(s); } catch (e) { return { error: e.message }; }
  if (!names.length) return { error: "Where should they go? Type a name after to." };
  if (names.length === 1) {
    const p = findPlace(names[0]);
    return p.error ? p : { ids: [p.id] };
  }
  const fromRange = names.length !== splitList(s).filter(x => x.trim()).length;
  const ids = [], missing = [];
  names.forEach(n => {
    let id;
    if (fromRange) { const k = childByName(cwd, n); id = k ? k.id : undefined; }
    else { const p = findPlace(n); id = p.error ? undefined : p.id; }
    if (id === undefined) missing.push(n); else ids.push(id);
  });
  if (missing.length) {
    return { error: `I can't find ${listOf(missing)} in ${nameOf(cwd)}.`, tip: "Type look to see what's here. To make them AND fill them, use with, like: add Section 1-8 with Unit 1-10" };
  }
  return { ids };
}

// Find the bubbles a command is about: "Unit 1-3 in Section 1", "all notes", "Spanish"
function resolveItems(text) {
  let t = text.trim(), base = cwd;
  if (!t) return { error: "Which ones? Type a name after the command." };
  const where = splitAt(t, ["in", "from", "inside"], true);
  if (where) {
    const p = findPlace(where.right);
    if (p.error) return p;
    base = p.id;
    t = where.left;
  }
  const all = t.match(/^(all|everything|every|each|\*)(?:\s+(?:the\s+)?(steps?|goals?|notes?|ones?|bubbles?|things?))?$/i);
  if (all) {
    const kind = (all[2] || "").toLowerCase();
    let kids = childrenOf(base);
    if (kind.startsWith("step")) kids = kids.filter(k => k.type === "step");
    else if (kind.startsWith("goal")) kids = kids.filter(k => k.type === "goal");
    else if (kind.startsWith("note")) kids = kids.filter(k => k.type === "note");
    if (!kids.length) return { error: `There's nothing like that in ${nameOf(base)}.` };
    return { items: sorted(kids), base };
  }
  let names;
  try { names = expandNames(t); } catch (e) { return { error: e.message }; }
  if (!names.length) return { error: "Which ones? Type a name after the command." };
  const fromRange = names.length !== splitList(t).filter(x => x.trim()).length;
  const items = [], missing = [];
  for (const n of names) {
    let b = childByName(base, n);
    if (!b && !fromRange) {
      const p = findPlace(n, base);
      if (p.error && p.matches) return p;      // more than one: ask them to be clearer
      if (!p.error && p.id !== null) b = findBubble(p.id);
    }
    if (b) { if (!items.includes(b)) items.push(b); }
    else missing.push(n);
  }
  if (missing.length) return { error: `I can't find ${listOf(missing)} in ${nameOf(base)}.`, tip: "Type look to see what's here." };
  return { items, base };
}

// "Section 1-8, Practice" -> ["Section 1", ..., "Section 8", "Practice"]
function expandNames(spec) {
  const names = [];
  splitList(spec).forEach(piece => {
    piece = piece.trim();
    if (!piece) return;
    const quoted = piece.match(/^"(.*)"$/);
    if (quoted) { if (quoted[1].trim()) names.push(quoted[1].trim()); return; }
    const brace = piece.match(/^(.*?)\{\s*(\d+)\s*\.\.\s*(\d+)\s*\}(.*)$/);   // Section {1..8}
    const dash = piece.match(/^(.*?)(\d+)\s*(?:-|–|—|\.\.)\s*(\d+)$/);        // Section 1-8
    let before, a, b, after = "";
    if (brace) { before = brace[1]; a = Number(brace[2]); b = Number(brace[3]); after = brace[4]; }
    else if (dash) { before = dash[1]; a = Number(dash[2]); b = Number(dash[3]); }
    else { names.push(piece.replace(/\s+/g, " ")); return; }
    const count = Math.abs(b - a) + 1;
    if (count > MAX_AT_ONCE) throw new Error(`${a}-${b} is ${count} things. The most I can do at once is ${MAX_AT_ONCE}.`);
    const step = a <= b ? 1 : -1;
    for (let n = a; n !== b + step; n += step) names.push((before + n + after).replace(/\s+/g, " ").trim());
  });
  return names;
}

// "goal Learn French" -> { type: "goal", spec: "Learn French" }
function readTyped(spec, fallback) {
  let s = spec.trim().replace(/^(a|an|some|the)\s+/i, "");
  const m = s.match(/^(goals?|steps?|sub-?steps?|notes?|ideas?)\s+(.+)$/i);
  if (!m) return { type: fallback, spec: s.replace(/^(called|named)\s+/i, "") };
  const w = m[1].toLowerCase();
  const type = w.startsWith("goal") ? "goal" : (w.startsWith("note") || w.startsWith("idea")) ? "note" : "step";
  return { type, spec: m[2].replace(/^(called|named)\s+/i, "") };
}

// takes "outside", "inside" and "in order" off the end (and "in order" from the middle)
function grabFlags(text, flags) {
  let t = " " + text.trim();
  for (let guard = 0; guard < 6; guard++) {
    const m = mask(t);
    let r = m.match(/\s(in order|ordered|in a row)\s*$/);
    if (r) { flags.inOrder = true; t = t.slice(0, r.index); continue; }
    r = m.match(/\s(outside|on the map|on map)\s*$/);
    if (r) { flags.outside = true; t = t.slice(0, r.index); continue; }
    r = m.match(/\s(inside|hidden)\s*$/);
    if (r) { flags.outside = false; t = t.slice(0, r.index); continue; }
    break;
  }
  const mid = mask(t).search(/\sin order(?=\s)/);
  if (mid >= 0) { flags.inOrder = true; t = t.slice(0, mid) + t.slice(mid + " in order".length); }
  return t.trim();
}

// splits "Unit 1-10 to Section 1-8" at a word (but never inside "quotes")
function splitAt(text, words, useLast) {
  const padded = " " + text + " ";
  const m = mask(padded);
  const re = new RegExp("\\s(" + words.join("|") + ")\\s", "g");
  let hit = null, r;
  while ((r = re.exec(m))) {
    hit = r;
    if (!useLast) break;
    re.lastIndex = r.index + 1;
  }
  if (!hit) return null;
  const left = padded.slice(0, hit.index).trim();
  const right = padded.slice(hit.index + hit[0].length).trim();
  if (!left || !right) return null;
  return { left, right, word: hit[1] };
}

// splits on commas (but never inside "quotes")
function splitList(spec) {
  const m = mask(spec), parts = [];
  let start = 0;
  for (let i = 0; i < m.length; i++) {
    if (m[i] === ",") { parts.push(spec.slice(start, i)); start = i + 1; }
  }
  parts.push(spec.slice(start));
  return parts;
}

// lowercase copy where everything inside "quotes" is hidden, so words in names don't count
function mask(s) {
  let result = "", inQuotes = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') { inQuotes = !inQuotes; result += ch; }
    else result += inQuotes ? "x" : ch.toLowerCase();
  }
  return result;
}

// "go Spanish; look" -> ["go Spanish", "look"]
function splitCommands(line) {
  const m = mask(line), list = [];
  let start = 0;
  for (let i = 0; i < m.length; i++) {
    if (m[i] === ";") { list.push(line.slice(start, i)); start = i + 1; }
    else if (m[i] === "&" && m[i + 1] === "&") { list.push(line.slice(start, i)); start = i + 2; i++; }
  }
  list.push(line.slice(start));
  return list.map(x => x.trim()).filter(Boolean);
}

// ---------- showing bubbles ----------
function icon(b) {
  if (b.type === "goal") return kw("◆");
  if (b.type === "note") return pl("✎");
  return isFinished(b) ? ok("✓") : dim("•");
}

function listInside(id) {
  const kids = sorted(childrenOf(id));
  say(pl("📂 " + nameOf(id)) + dim(`  (${kids.length} inside)`));
  if (!kids.length) return say(dim("  Nothing here yet. Try: ") + highlight("add Section 1-3"));
  kids.forEach(k => {
    const bits = [k.type];
    const inside = childrenOf(k.id).length;
    const p = progress(k.id);
    if (inside) bits.push(inside + " inside");
    if (p !== null) bits.push(Math.round(p * 100) + "%");
    else if (k.type === "step" && k.done) bits.push("done");
    if (k.outside) bits.push("outside");
    const first = k.after != null ? findBubble(k.after) : null;
    if (first) bits.push("after " + first.text);
    say("  " + icon(k) + " " + nm(k.text) + "  " + dim(bits.join(" · ")));
  });
}

function showTree(id, maxDepth) {
  const LIMIT = 400;
  let lines = 0;
  say(pl(id === null ? "~ (My brain)" : nameOf(id)));
  const walk = (pid, prefix, depth) => {
    const kids = sorted(childrenOf(pid));
    kids.forEach((k, i) => {
      if (lines >= LIMIT) return;
      const last = i === kids.length - 1;
      const p = progress(k.id);
      say(dim(prefix + (last ? "└── " : "├── ")) + icon(k) + " " + nm(k.text) + (p !== null ? dim(" " + Math.round(p * 100) + "%") : ""));
      lines++;
      if (depth < maxDepth) walk(k.id, prefix + (last ? "    " : "│   "), depth + 1);
    });
  };
  walk(id, "", 1);
  if (!lines) say(dim("   (empty)"));
  if (lines >= LIMIT) say(dim(`...I stopped at ${LIMIT} lines. Try tree -L 2 to show fewer levels.`));
}

// 2 lines about a bubble: what it is, where it is, what's inside
function describe(b) {
  const kids = childrenOf(b.id);
  const steps = kids.filter(k => k.type === "step");
  const goals = kids.filter(k => k.type === "goal");
  const notes = kids.filter(k => k.type === "note");
  const bits = [];
  if (steps.length) bits.push(`${steps.length} ${plural("step", steps.length)} (${steps.filter(k => isFinished(k)).length} done)`);
  if (goals.length) bits.push(`${goals.length} ${plural("goal", goals.length)}`);
  if (notes.length) bits.push(`${notes.length} ${plural("note", notes.length)}`);
  const everything = countAll(b.id) - 1;
  const p = progress(b.id);
  let second = dim("   inside: ") + (bits.length ? esc(bits.join(", ")) : dim("nothing yet"));
  if (everything > kids.length) second += dim(` · ${everything} in total`);
  if (p !== null) second += dim(" · ") + num(Math.round(p * 100) + "%") + dim(" done");
  else if (b.type === "step" && b.done) second += dim(" · ") + ok("✓ checked off");
  return [icon(b) + " " + nm(b.text) + dim(` (${b.type}) in `) + pl(pathText(b.parent)), second];
}

function showTotals() {
  const goals = brain.filter(b => b.type === "goal").length;
  const steps = brain.filter(b => b.type === "step");
  const notes = brain.filter(b => b.type === "note").length;
  const leaves = steps.filter(s => progress(s.id) === null);
  const done = leaves.filter(s => s.done).length;
  say(strong("🧠 Your whole brain"));
  say("  " + num(goals) + " " + plural("goal", goals));
  say("  " + num(steps.length) + " " + plural("step", steps.length) + dim(` (${done} of ${leaves.length} checked off)`));
  say("  " + num(notes) + " " + plural("note", notes));
}

function showError(res) {
  say(bad(res.error));
  if (res.matches) {
    res.matches.slice(0, 8).forEach(id => say("  " + pl(pathText(id))));
    const example = pathText(res.matches[0]).split("/").slice(-2).join("/");
    say(dim("Use more of the path, like: ") + nm(example));
  }
  if (res.tip) say(dim(res.tip));
}

// ==============================================================
// PART 8: THE SCREEN
// ==============================================================

// ---------- printing ----------
function esc(s) {
  return String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}
function paint(kind, s) { return `<span class="k-${kind}">${esc(s)}</span>`; }
function cm(s) { return paint("command", s); }   // commands
function nm(s) { return paint("name", s); }      // bubble names
function pl(s) { return paint("place", s); }     // places / paths
function num(s) { return paint("number", s); }   // numbers
function kw(s) { return paint("keyword", s); }   // keywords + headings
function ok(s) { return paint("good", s); }      // good news
function bad(s) { return paint("error", s); }    // errors
function warn(s) { return paint("warning", s); } // warnings
function dim(s) { return paint("dim", s); }      // hints
function strong(s) {
   return `<b>${esc(s)}</b>`;
}
function code(s) { // command in a box
   return `<span class="con-code">${highlight(s)}</span>`;
}

function rich(text, kind) {
   return String(text).split("`").map((part, i) => {
      if (i % 2 === 1) return code(part);
      return kind ? paint(kind, part) : esc(part);
   }).join("");
}

function say(html) {
  const line = document.createElement("div");
  line.className = "con-line";
  line.innerHTML = html || "&nbsp;";
  out.appendChild(line);
  while (out.childElementCount > 1500) out.firstChild.remove();
  out.scrollTop = out.scrollHeight;
}

// colors what you typed: commands, numbers, keywords
const KEYWORDS = new Set(["to", "into", "in", "with", "from", "inside", "outside", "order", "ordered", "all", "each", "every", "everything", "as", "on", "off", "itself"]);
function highlight(line) {
  let html = "", expectCommand = true;
  line.split(/("[^"]*"?)/).forEach(part => {
    if (!part) return;
    if (part.startsWith('"')) { html += nm(part); expectCommand = false; return; }
    part.split(/(\s+|;|&&)/).forEach(tok => {
      if (!tok) return;
      if (/^\s+$/.test(tok)) { html += tok; return; }
      if (tok === ";" || tok === "&&") { html += kw(tok); expectCommand = true; return; }
      if (expectCommand) {
        expectCommand = false;
        html += (LOOKUP[cleanWord(tok)] || /^!/.test(tok)) ? cm(tok) : esc(tok);
        return;
      }
      if (/\d/.test(tok) && (/^[\d\-–.]+$/.test(tok) || /\{\d+\.\.\d+\}/.test(tok))) html += num(tok);
      else if (KEYWORDS.has(tok.toLowerCase()) || /^-{1,2}[a-z]+$/i.test(tok)) html += kw(tok);
      else html += esc(tok);
    });
  });
  return html;
}

function shortPath(id) {
  const full = pathText(id);
  if (full.length <= 17) return full;
  const last = nameOf(id);
  return "~/…/" + (last.length > 18 ? last.slice(0, 17) + "…" : last);
}

function promptHtml() {
  return `<span class="k-prompt">brain</span><span class="k-dim">:</span><span class="k-place">${esc(shortPath(cwd))}</span><span class="k-text"> $</span>`;
}

function updatePrompt() { promptEl.innerHTML = promptHtml(); }

// ---------- quick buttons ----------
function addChip(label, action, main) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "con-chip" + (main ? " main" : "");
  chip.textContent = label;
  chip.addEventListener("mousedown", e => e.preventDefault());   // don't steal the typing box
  chip.addEventListener("click", action);
  chipsEl.appendChild(chip);
}

function updateChips() {
  if (!chipsEl) return;
  chipsEl.innerHTML = "";
  if (pending) {
    pending.choices.forEach((c, i) => addChip(c, () => submit(c), i === 0));
    return;
  }
  if (suggestion) {
     const s = suggestion;
     addChip(s, () => submit(s), true);
  }
  if (changedSinceMap) addChip("🗺 see it on the map", () => submit("map"), !suggestion);
  if (tut) {
    const task = currentTask();
    addChip("👉 " + task, () => { input.value = task; input.focus(); }, true);
    addChip("skip", () => submit("skip"));
    addChip("stop tutorial", () => submit("stop"));
  }
  addChip("↑", () => { recall(-1); input.focus(); });
  QUICK_BUTTONS.forEach(c => addChip(c, () => submit(c)));
}

// ---------- questions (yes / no, keep / new ...) ----------
function ask(choices, onAnswer) {
  pending = { choices, onAnswer };
  say(dim("Type ") + choices.map(c => cm(c)).join(dim(" or ")) + dim("  (or tap a button)"));
  updateChips();
}

function matchChoice(line, choices) {
  const low = line.trim().toLowerCase();
  if (choices.includes(low)) return low;
  if (choices.includes("yes") && ["y", "yeah", "yep", "sure", "ok", "okay", "yup"].includes(low)) return "yes";
  if (choices.includes("no") && ["n", "nope", "nah"].includes(low)) return "no";
  if (["cancel", "stop", "nevermind", "never mind", "c"].includes(low)) {
    if (choices.includes("cancel")) return "cancel";
    if (choices.includes("no")) return "no";
  }
  const byLetter = choices.filter(c => c[0] === low);
  if (low.length === 1 && byLetter.length === 1) return byLetter[0];
  return null;
}

// ---------- running what you typed ----------
function submit(raw) {
  let line = String(raw).replace(/[“”„]/g, '"').replace(/[‘’]/g, "'").trim();
  say(promptHtml() + " " + highlight(line));
  suggestion = null;
  lastCmd = null;
  lineCount++;
  if (!line) { updateChips(); return; }

  // answering a question?
  if (pending) {
    const p = pending;
    pending = null;
    const answer = matchChoice(line, p.choices);
    if (answer) {
      p.onAnswer(answer);
      afterLine(true);
      return;
    }
    say(dim("(Okay, I skipped that question.)"));
  }

  // tutorial words
  if (tut) {
    const low = line.toLowerCase();
    if (["skip", "next"].includes(low)) { nextStep(); updatePrompt(); return; }
    if (["stop", "stop tutorial", "quit tutorial", "end tutorial", "exit tutorial"].includes(low)) { stopTutorial(); return; }
  }

  // !! and !5 run old commands again
  if (line === "!!" || /^!\d+$/.test(line)) {
    const n = line === "!!" ? pastCommands.length : Number(line.slice(1));
    const old = pastCommands[n - 1];
    if (!old) { say(bad(`There's no command ${line}.`) + dim(" Type history to see them.")); updateChips(); return; }
    line = old;
    say(dim("↳ ") + highlight(line));
  }
  remember(line);

  const pieces = splitCommands(line);
  for (let i = 0; i < pieces.length; i++) {
    runOne(pieces[i]);
    if (pending && i < pieces.length - 1) { say(dim("(I stopped here to wait for your answer.)")); break; }
  }
  afterLine(true);
}

function afterLine(typedSomething) {
  updatePrompt();
  if (changedThisLine && !toldAboutMap && !tut) {
     toldAboutMap = true;
     say(warn("👀 That really changed your brain!") + dim(" Tap ") + strong("🗺 Map") + dim(" at the top (or type ") + code("map") + dim(") to see it."));
  }
  changedThisLine = false;
  tutorialCheck(typedSomething);
  updateChips();
}

function cleanWord(w) { return String(w).toLowerCase().replace(/^\/+(?=.)/, ""); }

function runOne(text) {
  checkCwd();
  const m = text.trim().match(/^(\S+)\s*([\s\S]*)$/);
  if (!m) return;
  let word = cleanWord(m[1]);
  let rest = m[2];
  if (word === "sudo") {
    say(dim("🧐 No sudo needed. You're already the boss here."));
    return rest.trim() ? runOne(rest) : undefined;
  }
  if (word === "cd.." || word === "cd../") { word = "back"; rest = ""; }
  if ((word === "go" || word === "cd") && /^(back|up|\.\.)$/i.test(rest.trim())) { word = "back"; rest = ""; }
  if ((word === "go" || word === "cd") && /^(home|~|\/|top)$/i.test(rest.trim())) { word = "home"; rest = ""; }
  const cmd = LOOKUP[word];
  if (!cmd) return unknown(word, rest, text);
  lastCmd = cmd.names[0];
  try { cmd.run(rest, word); }
  catch (e) { say(bad("Oops, something went wrong: " + e.message)); console.error(e); }
  updatePrompt();
}

function unknown(word, rest, text) {
  const asPlace = childByName(cwd, text.trim());
  if (asPlace) {
    suggestion = "go " + asPlace.text;
    return say(bad(`"${text.trim()}" isn't a command.`) + " Did you mean " + highlight(suggestion) + "?" + dim(" (tap it below)"));
  }
  // 1. a command that starts with what they typed ("ad" -> "add")
  let best = null, bestScore = 99;
  if (word.length >= 2) {
    const starts = COMMANDS.map(c => c.names[0]).filter(n => n.startsWith(word));
    if (starts.length) { best = starts.sort((a, b) => a.length - b.length)[0]; bestScore = 0; }
  }
  // 2. otherwise the closest spelling (main names win ties)
  if (!best) {
    COMMANDS.forEach(c => c.names.forEach((name, i) => {
      if (name.length < 2) return;
      const d = distance(word, name) + (i === 0 ? 0 : 0.5);
      if (d < bestScore) { bestScore = d; best = c.names[0]; }
    }));
  }
  if (best && bestScore <= (word.length <= 3 ? 1.5 : 2.5)) {
    suggestion = (best + " " + rest).trim();
    return say(bad(`I don't know "${word}".`) + " Did you mean " + highlight(suggestion) + "?" + dim(" (tap it below)"));
  }
  say(bad(`I don't know "${word}".`) + dim(" Type ") + cm("help") + dim(" to see what I can do."));
}

// how many letters are different between two words (for "did you mean")
function distance(a, b) {
  const d = [];
  for (let i = 0; i <= a.length; i++) d.push([i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

// ---------- old commands (↑ ↓) ----------
function remember(line) {
  if (pastCommands[pastCommands.length - 1] !== line) pastCommands.push(line);
  if (pastCommands.length > HISTORY_LIMIT) pastCommands = pastCommands.slice(-HISTORY_LIMIT);
  histPos = pastCommands.length;
  saveSettings();
}

function recall(dir) {
  if (!pastCommands.length) return;
  histPos = Math.max(0, Math.min(pastCommands.length, histPos + dir));
  input.value = pastCommands[histPos] || "";
}

// ---------- Tab finishes names ----------
function complete() {
  const v = input.value;
  if (!v.trim()) return;
  if (!/\s/.test(v.trim())) {
    const opts = Object.keys(LOOKUP).filter(n => n.length > 1 && n.startsWith(v.trim().toLowerCase()));
    if (opts.length === 1) input.value = opts[0] + " ";
    else if (opts.length > 1) say(dim(opts.join("  ")));
    return;
  }
  const names = childrenOf(cwd).map(k => k.text);
  const words = v.split(" ");
  for (let i = 1; i < words.length; i++) {
    const head = words.slice(0, i).join(" ");
    const tail = words.slice(i).join(" ");
    if (!tail) continue;
    const opts = names.filter(n => n.toLowerCase().startsWith(tail.toLowerCase()));
    if (opts.length === 1) { input.value = head + " " + opts[0]; return; }
    if (opts.length > 1) {
      let common = opts[0];
      opts.forEach(o => { while (!o.toLowerCase().startsWith(common.toLowerCase())) common = common.slice(0, -1); });
      if (common.length > tail.length) input.value = head + " " + common;
      else say(dim(opts.slice(0, 20).join(" · ")));
      return;
    }
  }
}

// ---------- colors + saving ----------
function currentColor(part) {
  return appearance.custom[part] || (THEMES[appearance.theme] || THEMES.classic)[part];
}

function applyLook() {
  if (!box) return;
  PARTS.forEach(part => box.style.setProperty("--con-" + part, currentColor(part)));
  box.style.setProperty("--con-size", appearance.size + "px");
}

function swatch(name) {
  const t = THEMES[name];
  return `<span class="con-swatch" style="background:${t.bg};color:${t.text}">` +
    `<span style="color:${t.prompt}">brain:~$</span> <span style="color:${t.command}">add</span> ` +
    `<span style="color:${t.name}">${esc(name)}</span> <span style="color:${t.number}">1-8</span></span>`;
}

function showColors() {
  say("Your colors (change one with " + highlight("color text white") + "):");
  PARTS.forEach(p => {
    const v = currentColor(p);
    say(`  <span style="color:${esc(v)}">■</span> ` + nm(PART_LABEL[p].padEnd(11)) + dim(v));
  });
  say(dim("Use color names (red, gold, pink, navy...) or codes like #ff8800."));
  say(dim("color reset = back to normal · theme = ready-made colors"));
}

function toRGB(color) {
  const probe = document.createElement("span");
  probe.style.color = color;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}
function sameColor(a, b) { return toRGB(a) === toRGB(b); }

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    if (saved.appearance) appearance = Object.assign(appearance, saved.appearance);
    if (!THEMES[appearance.theme]) appearance.theme = "classic";
    if (!appearance.custom || typeof appearance.custom !== "object") appearance.custom = {};
    if (Array.isArray(saved.history)) pastCommands = saved.history.slice(-HISTORY_LIMIT);
  } catch (e) { /* nothing saved yet */ }
  histPos = pastCommands.length;
}

function saveSettings() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ appearance, history: pastCommands })); } catch (e) { /* storage full */ }
}

// ---------- opening + closing ----------
function openConsole() {
  if (backBtn) backBtn.classList.remove("show");
  if (!tut) {
    const view = typeof brainView !== "undefined" ? brainView : null;
    cwd = view !== null && findBubble(view) ? view : null;
  }
  checkCwd();
  box.classList.add("open");
  document.body.style.overflow = "hidden";
  fitToScreen();
  if (!welcomed) {
     welcome();
     welcomed = true;
  }
  else if (tut) {
     if (tut.shownOnLine === lineCount) say(ok("👋 Welcome back! Your next step is just above."));
     else showStep();
  }
  else say(dim("📂 You're in ") + pl(pathText(cwd)) + (cwd === null ? dim(" (the top of your brain)") : ""));
  updatePrompt();
  updateChips();
  input.focus();
}

function closeConsole() {
  box.classList.remove("open");
  document.body.style.overflow = "";
  box.style.height = "";
  box.style.top = "";
  input.blur();
}

function welcome() {
  say(strong("🧠 BRAIN CONSOLE"));
  say(dim("A terminal for your Second Brain."));
  say("");
  say("New here? Type " + code("tutorial") + " and press Enter.");
  say("Type " + code("help") + " to see what you can do.");
  say("Everything you do here changes your " + strong("real") + " brain map.");
  say("Tap " + strong("🗺 Map") + " at the top (or type " + code("map") + ") to see it.");
  say("Tap " + bad("✕ Exit") + " at the top to leave anytime.");
  say("");
  say(dim("📂 You're in ") + pl(pathText(cwd)) + (cwd === null ? dim(" (the top of your brain)") : ""));
}

// keeps the console above the iPhone keyboard
function fitToScreen() {
  const vv = window.visualViewport;
  if (!vv || !box.classList.contains("open")) return;
  box.style.height = vv.height + "px";
  box.style.top = vv.offsetTop + "px";
  out.scrollTop = out.scrollHeight;
}

function buildScreen() {
  box = document.createElement("div");
  box.id = "console";
  box.innerHTML = `
    <div class="con-top">
      <span class="con-title">&gt;_ brain console</span>
      <button type="button" class="con-help">? help</button>
      <button type="button" class="con-map">🗺 Map</button>
      <button type="button" class="con-exit">✕ Exit</button>
    </div>
    <div class="con-out"></div>
    <div class="con-chips"></div>
    <form class="con-input-row" autocomplete="off">
      <span class="con-prompt"></span>
      <input class="con-in" type="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="send" aria-label="Type a command">
      <button type="submit" class="con-run" aria-label="Run the command">⏎</button>
    </form>`;
  document.body.appendChild(box);
  out = box.querySelector(".con-out");
  chipsEl = box.querySelector(".con-chips");
  promptEl = box.querySelector(".con-prompt");
  input = box.querySelector(".con-in");

  box.querySelector(".con-exit").addEventListener("click", closeConsole);
  box.querySelector(".con-help").addEventListener("click", () => submit("help"));
  box.querySelector(".con-map").addEventListener("click", () => submit("map"));

  // the ">_ Back to console" button that shows on the map
  backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "con-back";
  backBtn.textContent = ">_ Back to console";
  backBtn.addEventListener("click", openConsole);
  document.body.appendChild(backBtn);
  document.querySelectorAll("nav button").forEach(b => b.addEventListener("click", () => backBtn.classList.remove("show")));



   
  box.querySelector("form").addEventListener("submit", e => {
    e.preventDefault();
    const line = input.value;
    input.value = "";
    submit(line);
  });
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") { e.preventDefault(); recall(-1); }
    else if (e.key === "ArrowDown") { e.preventDefault(); recall(1); }
    else if (e.key === "Tab") { e.preventDefault(); complete(); }
    else if (e.key.toLowerCase() === "l" && e.ctrlKey) { e.preventDefault(); out.innerHTML = ""; }
  });
  out.addEventListener("click", () => {
    const touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (!touch && !String(window.getSelection())) input.focus();
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", fitToScreen);
    window.visualViewport.addEventListener("scroll", fitToScreen);
  }
}

// the "Open brain console" button in Settings (only shows when Second Brain is on)
function addOpenButton() {
  const settingsTab = document.getElementById("settings");
  if (!settingsTab) return;
  openBtn = document.createElement("button");
  openBtn.id = "openConsole";
  openBtn.type = "button";
  openBtn.innerHTML = '<span class="con-btn-icon">&gt;_</span> Open brain console';
  openBtn.addEventListener("click", openConsole);
  settingsTab.appendChild(openBtn);
  const toggle = document.getElementById("brainToggle");
  const sync = () => { openBtn.style.display = toggle && !toggle.checked ? "none" : ""; };
  if (toggle) toggle.addEventListener("change", sync);
  sync();
}

// ==============================================================
// PART 9: START UP
// ==============================================================
function start() {
  COMMANDS.forEach(c => c.names.forEach(n => { LOOKUP[n.toLowerCase()] = c; }));
  loadSettings();
  buildScreen();
  applyLook();
  updatePrompt();
  updateChips();
  addOpenButton();
}

start();

})();
