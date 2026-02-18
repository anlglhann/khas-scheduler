let DATA = null;
let chosenSections = [];
let COURSE_QUERY = "";
let FACULTY_DATA = {
  "Engineering": [
    "Computer Engineering",
    "Industrial Engineering",
    "Electrical Engineering"
  ],
  "Arts & Social Sciences": [
    "Psychology",
    "Economics",
    "International Relations"
  ],
  "Management": [
    "Business Administration",
    "Finance"
  ]
};

function getSelectedProgram() {
  const el = document.getElementById("programSelect");
  return el ? el.value : "";
}

function courseMatchesSelectedProgram(course) {
  const prog = getSelectedProgram();
  if (!prog) return true;
  // normalize.js artık course.program yazıyor (CMPE / IE gibi)
  return String(course.program || "").toUpperCase() === String(prog).toUpperCase();
}

function getSelectedProgram() {
  const el = document.getElementById("programSelect");
  return el ? el.value : "";
}

function timeToMin(t) {
  const [h, m] = String(t).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function safeMeetings(section) {
  return Array.isArray(section?.meetings) ? section.meetings : [];
}

function sectionConflicts(a, b) {
  const am = Array.isArray(a?.meetings) ? a.meetings : [];
  const bm = Array.isArray(b?.meetings) ? b.meetings : [];
  for (const ma of am) {
    for (const mb of bm) {
      if (ma.day !== mb.day) continue;
      const sa = timeToMin(ma.start);
      const ea = timeToMin(ma.end);
      const sb = timeToMin(mb.start);
      const eb = timeToMin(mb.end);
      if (sa < eb && sb < ea) return true;
    }
  }
  return false;
}

function findCourse(courseCode) {
  return DATA?.courses?.find(c => c.courseCode === courseCode) || null;
}

function findSectionByCode(sectionCode) {
  for (const course of (DATA?.courses || [])) {
    const section = (course.sections || []).find(s => s.sectionCode === sectionCode);
    if (section) return { course, section };
  }
  return null;
}

function getSelectedSectionCodes() {
  return chosenSections.map(x => x.sectionCode);
}

function updateStatus(msg) {
  const el = document.getElementById("status");
  if (el) el.textContent = msg || "";
}

function renderCourses() {
  const select = document.getElementById("courseSelect");
  const search = document.getElementById("courseSearch");
  if (!select) return;

  // Arama input'u sadece bir kere bağla
  if (search && !search._bound) {
    search._bound = true;
    search.addEventListener("input", () => {
      COURSE_QUERY = (search.value || "").trim().toLowerCase();
      renderCourses();
    });
  }

  const prevSelected = select.value;
  select.innerHTML = "";

  const all = (DATA?.courses || []);

  const faculty = document.getElementById("facultySelect")?.value || "";
  const program = document.getElementById("programSelect")?.value || "";

  let filtered = all.filter(c => {
    if (faculty && c.faculty !== faculty) return false;
    if (program && c.program !== program) return false;
    return true;
  });

  if (COURSE_QUERY) {
    filtered = filtered.filter(c => {
      const hay = `${c.courseCode} ${c.courseName}`.toLowerCase();
      return hay.includes(COURSE_QUERY);
    });
  }

  if (!filtered.length) {
    const info = document.getElementById("courseInfo");
    const list = document.getElementById("sectionList");
    if (info) info.textContent = "Sonuç yok";
    if (list) list.innerHTML = "";
    return;
  }

  for (const c of filtered) {
    const opt = document.createElement("option");
    opt.value = c.courseCode;
    opt.textContent = `${c.courseCode} - ${c.courseName}`;
    select.appendChild(opt);
  }

  select.onchange = () => renderSections(select.value);

  // Önceki seçimi korumaya çalış
  if (prevSelected && filtered.some(c => c.courseCode === prevSelected)) {
    select.value = prevSelected;
  } else {
    select.value = filtered[0].courseCode;
  }

  renderSections(select.value);
}

function renderSections(courseCode) {
  const course = findCourse(courseCode);
  const info = document.getElementById("courseInfo");
  const list = document.getElementById("sectionList");
  if (!list) return;
  list.innerHTML = "";

  if (!course) return;

  if (info) {
    const sectionCount = (course.sections || []).length;
    const label =
      sectionCount === 1
        ? "1 section"
        : `${sectionCount} sections`;
  
    info.textContent =
      `${course.courseCode} — ${course.courseName} (${label})`;
  }

  for (const section of (course.sections || [])) {
    const div = document.createElement("div");
    div.className = "row";

    const meetings = safeMeetings(section);

    const room = section.room || "";
    const inst = section.instructor || "";

    const meetingsHtml = meetings.map(m => {
      return `
        <div class="small">
          ${m.day} ${m.start}-${m.end}
        </div>
      `;
    }).join("");

    div.innerHTML = `
      <div><strong>${section.sectionCode}</strong></div>
      ${meetingsHtml || `<div class="small">Saat bilgisi yok</div>`}
      <div class="small">
        ${room ? `Room: ${room}<br>` : ""}
        ${inst ? `Instructor: ${inst}` : ""}
      </div>
      <div class="actions">
        <button class="addBtn">Ekle</button>
      </div>
    `;

    div.querySelector(".addBtn").onclick = () => addSection(course, section);
    list.appendChild(div);
  }
}

function addSection(course, section) {
  const normalizedSection = {
    courseCode: course.courseCode,
    courseName: course.courseName,
    sectionCode: section.sectionCode,
    meetings: safeMeetings(section),
    room: section.room || "",
    instructor: section.instructor || "",
    capacity: section.capacity ?? "",
  };

  chosenSections = chosenSections.filter(x => x.courseCode !== course.courseCode);

  for (const ch of chosenSections) {
    if (sectionConflicts(ch, normalizedSection)) {
      alert("Saat çakışması var!");
      return;
    }
  }

  chosenSections.push(normalizedSection);
  renderChosen();
}

function removeSection(courseCode) {
  chosenSections = chosenSections.filter(x => x.courseCode !== courseCode);
  renderChosen();
}

function renderChosen() {
  const list = document.getElementById("chosenList");
  if (!list) return;
  list.innerHTML = "";

  for (const ch of chosenSections) {
    const div = document.createElement("div");
    div.className = "row";

    const meetingsText = (ch.meetings || [])
      .map(m => `${m.day} ${m.start}-${m.end}`)
      .join("<br>");

    div.innerHTML = `
      <div><strong>${ch.courseCode}</strong> — ${ch.courseName}</div>
      <div class="small">
        ${ch.sectionCode}<br>
        ${meetingsText}<br>
        ${ch.room ? `Room: ${ch.room}<br>` : ""}
        ${ch.instructor ? `Instructor: ${ch.instructor}` : ""}
      </div>
      <div class="actions">
        <button class="removeBtn">Kaldır</button>
      </div>
    `;

    div.querySelector(".removeBtn").onclick = () => removeSection(ch.courseCode);
    list.appendChild(div);
  }

  renderCalendar();
  updateUrlFromSelection();
}

function renderCalendar() {
  const cal = document.getElementById("calendar");
  if (!cal) return;
  
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const startHour = 8;
  const endHour = 20;
  const slotMin = 30;

  cal.innerHTML = "";

  const totalRows = ((endHour - startHour) * 60) / slotMin;
  const gridStart = startHour * 60;
 
  cal.style.display = "grid";
  cal.style.gridTemplateColumns = "80px repeat(5, 1fr)";
  cal.style.gridAutoRows = "40px";

  const blank = document.createElement("div");
  blank.className = "cal-head";
  cal.appendChild(blank);

  for (const d of days) {
    const hd = document.createElement("div");
    hd.className = "cal-head";
    hd.textContent = d;
    cal.appendChild(hd);
  }
  
  const cellMap = [];
  
  for (let r = 0; r < totalRows; r++) {
    const minutes = gridStart + r * slotMin;
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
  
    const timeCell = document.createElement("div");
    timeCell.className = "cal-time";
    timeCell.textContent = `${hh}:${mm}`;
    cal.appendChild(timeCell);

    const rowCells = [];

    for (let i = 0; i < days.length; i++) {
      const cell = document.createElement("div");
      cell.className = "cal-cell";
      cell.style.position = "relative";
      cal.appendChild(cell);
      rowCells.push(cell);
    }
  
    cellMap.push(rowCells);
  }

  for (const ch of chosenSections) {
    for (const m of ch.meetings) {
      if (!days.includes(m.day)) continue;

      const start = timeToMin(m.start);
      const end = timeToMin(m.end);

      const startIndex = Math.floor((start - gridStart) / slotMin);
      const span = Math.ceil((end - start) / slotMin);

      const dayIndex = days.indexOf(m.day);
      const cell = cellMap[startIndex][dayIndex];

      const block = document.createElement("div");
      block.className = "cal-block";

      block.style.position = "absolute";
      block.style.top = "2px";
      block.style.left = "2px";
      block.style.right = "2px";
      block.style.height = span * 40 - 4 + "px";

      block.textContent =
        `${ch.courseCode}\n${ch.courseName}\n` +
        `${ch.sectionCode}\n` +
        `${m.start}-${m.end}\n` +
        `${ch.room ? ch.room + "\n" : ""}` +
        `${ch.instructor ? ch.instructor : ""}`;

      cell.appendChild(block);
    }
  }
}

function updateUrlFromSelection() {
  const codes = getSelectedSectionCodes();
  const url = new URL(window.location.href);
  if (codes.length === 0) url.searchParams.delete("s");
  else url.searchParams.set("s", codes.join(","));
  history.replaceState({}, "", url.toString());
}

function applySelectionBySectionCodes(sectionCodes) {
  chosenSections = [];

  for (const code of sectionCodes) {
    const found = findSectionByCode(code);
    if (!found) continue;

    const course = found.course;
    const section = found.section;

    const normalizedSection = {
      courseCode: course.courseCode,
      courseName: course.courseName,
      sectionCode: section.sectionCode,
      meetings: safeMeetings(section),
      room: section.room || "",
      instructor: section.instructor || "",
      capacity: section.capacity ?? "",
    };

    chosenSections = chosenSections.filter(x => x.courseCode !== course.courseCode);

    let conflict = false;
    for (const ch of chosenSections) {
      if (sectionConflicts(ch, normalizedSection)) { conflict = true; break; }
    }
    if (conflict) continue;

    chosenSections.push(normalizedSection);
  }

  renderChosen();
}

function loadSelectionFromUrl() {
  const url = new URL(window.location.href);
  const s = url.searchParams.get("s");
  if (!s) return;
  const codes = s.split(",").map(x => x.trim()).filter(Boolean);
  applySelectionBySectionCodes(codes);
}

const DRAFT_KEY = "khasSchedulerDraftV1";

function saveDraft() {
  const payload = { sectionCodes: getSelectedSectionCodes() };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
}

function loadDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) { alert("Kaydedilmiş taslak yok."); return; }
  const payload = JSON.parse(raw);
  applySelectionBySectionCodes(payload.sectionCodes || []);
}

function setupFacultyProgram() {
  const facultySelect = document.getElementById("facultySelect");
  const programSelect = document.getElementById("programSelect");

  const faculties = Array.from(
    new Set((DATA?.courses || []).map(c => c.faculty).filter(Boolean))
  ).sort();

  facultySelect.innerHTML =
    `<option value="">All Faculties</option>` +
    faculties.map(f => `<option value="${f}">${f}</option>`).join("");

  facultySelect.onchange = () => {
    updateProgramDropdown();
    renderCourses();
  };

  programSelect.onchange = () => {
    renderCourses();
  };

  updateProgramDropdown();
}

function updateProgramDropdown() {
  const faculty = document.getElementById("facultySelect").value;
  const programSelect = document.getElementById("programSelect");

  let courses = DATA?.courses || [];

  if (faculty) {
    courses = courses.filter(c => c.faculty === faculty);
  }

  const programs = Array.from(
    new Set(courses.map(c => c.program).filter(Boolean))
  ).sort();

  programSelect.innerHTML =
    `<option value="">All Programs</option>` +
    programs.map(p => `<option value="${p}">${p}</option>`).join("");
}

async function init() {
  try {
    const res = await fetch("data/normalized.json");
    DATA = await res.json();

    setupFacultyProgram();
    renderCourses();

    document.getElementById("clearBtn").onclick = () => {
      chosenSections = [];
      renderChosen();
      updateStatus("");
    };

    document.getElementById("saveDraftBtn").onclick = () => {
      saveDraft();
      alert("Taslak kaydedildi.");
    };

    document.getElementById("loadDraftBtn").onclick = () => {
      loadDraft();
    };

    document.getElementById("copyLinkBtn").onclick = async () => {
      const link = window.location.href;
      await navigator.clipboard.writeText(link);
      alert("Link kopyalandı.");
    };

    document.getElementById("darkToggle").onclick = () => {
      document.body.classList.toggle("dark");
    };

    loadSelectionFromUrl();
    renderChosen();
    updateStatus("Hazır.");
  } catch (err) {
    console.error("Init error:", err);
    updateStatus("Veri yüklenemedi.");
  }
}

init();
