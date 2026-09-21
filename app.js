let DATA = null;
let chosenSections = [];
let courseQuery = "";

const DAYS = [
  { key: "Mon", label: "Monday" },
  { key: "Tue", label: "Tuesday" },
  { key: "Wed", label: "Wednesday" },
  { key: "Thu", label: "Thursday" },
  { key: "Fri", label: "Friday" },
];

const GRID_START_HOUR = 8;
const GRID_END_HOUR = 22;
const GRID_START_MINUTES = GRID_START_HOUR * 60;
const GRID_END_MINUTES = GRID_END_HOUR * 60;
const GRID_DURATION = GRID_END_MINUTES - GRID_START_MINUTES;
const DRAFT_KEY = "khasSchedulerDraftV1";
const THEME_KEY = "khasSchedulerThemeV1";
const DEFAULT_DOCUMENT_TITLE = "KHAS Scheduler";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function timeToMin(time) {
  const [hour, minute] = String(time || "").split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}

function safeMeetings(section) {
  return Array.isArray(section?.meetings) ? section.meetings : [];
}

function sectionConflicts(a, b) {
  for (const meetingA of safeMeetings(a)) {
    for (const meetingB of safeMeetings(b)) {
      if (meetingA.day !== meetingB.day) continue;

      const startA = timeToMin(meetingA.start);
      const endA = timeToMin(meetingA.end);
      const startB = timeToMin(meetingB.start);
      const endB = timeToMin(meetingB.end);

      if (startA < endB && startB < endA) return true;
    }
  }
  return false;
}

function findCourse(courseCode) {
  return DATA?.courses?.find((course) => course.courseCode === courseCode) || null;
}

function findSectionByCode(sectionCode) {
  for (const course of DATA?.courses || []) {
    const section = (course.sections || []).find((item) => item.sectionCode === sectionCode);
    if (section) return { course, section };
  }
  return null;
}

function normalizeSection(course, section) {
  return {
    courseCode: course.courseCode,
    courseName: course.courseName,
    sectionCode: section.sectionCode,
    meetings: safeMeetings(section),
    room: section.room || "",
    instructor: section.instructor || "",
    capacity: section.capacity ?? "",
  };
}

function getSelectedSectionCodes() {
  return chosenSections.map((item) => item.sectionCode);
}

function getSectionShortLabel(sectionCode) {
  const parts = String(sectionCode || "").split("-");
  return parts.length > 1 ? parts.at(-1) : sectionCode;
}

function updateStatus(message) {
  const status = document.getElementById("status");
  if (status) status.textContent = message || "";
}

function renderCourses() {
  const select = document.getElementById("courseSelect");
  const search = document.getElementById("courseSearch");
  const info = document.getElementById("courseInfo");
  const sectionList = document.getElementById("sectionList");
  const sectionCount = document.getElementById("sectionCount");
  if (!select) return;

  if (search && !search.dataset.bound) {
    search.dataset.bound = "true";
    search.addEventListener("input", () => {
      courseQuery = search.value.trim().toLocaleLowerCase("tr-TR");
      renderCourses();
    });
  }

  const previousCourse = select.value;
  const faculty = document.getElementById("facultySelect")?.value || "";
  const program = document.getElementById("programSelect")?.value || "";

  let filtered = (DATA?.courses || []).filter((course) => {
    if (faculty && course.faculty !== faculty) return false;
    if (program && course.program !== program) return false;
    return true;
  });

  if (courseQuery) {
    filtered = filtered.filter((course) => {
      const searchable = `${course.courseCode || ""} ${course.courseName || ""}`.toLocaleLowerCase("tr-TR");
      return searchable.includes(courseQuery);
    });
  }

  select.innerHTML = "";

  if (!filtered.length) {
    if (info) info.textContent = "Aramana uygun ders bulunamadı.";
    if (sectionList) sectionList.innerHTML = '<p class="empty-note">Başka bir arama ya da program deneyebilirsin.</p>';
    if (sectionCount) sectionCount.textContent = "0";
    return;
  }

  for (const course of filtered) {
    const option = document.createElement("option");
    option.value = course.courseCode;
    option.textContent = `${course.courseCode} — ${course.courseName}`;
    select.appendChild(option);
  }

  select.onchange = () => renderSections(select.value);
  select.value = filtered.some((course) => course.courseCode === previousCourse)
    ? previousCourse
    : filtered[0].courseCode;

  renderSections(select.value);
}

function renderSections(courseCode) {
  const course = findCourse(courseCode);
  const info = document.getElementById("courseInfo");
  const list = document.getElementById("sectionList");
  const count = document.getElementById("sectionCount");
  if (!list) return;

  list.innerHTML = "";

  if (!course) {
    if (count) count.textContent = "0";
    return;
  }

  const sections = course.sections || [];
  if (info) {
    info.textContent = `${course.courseCode} · ${course.courseName} · ${sections.length} şube`;
  }
  if (count) count.textContent = String(sections.length);

  if (!sections.length) {
    list.innerHTML = '<p class="empty-note">Bu ders için şube bulunamadı.</p>';
    return;
  }

  for (const section of sections) {
    const selected = chosenSections.some((item) => item.sectionCode === section.sectionCode);
    const card = document.createElement("article");
    card.className = `section-card${selected ? " is-selected" : ""}`;

    const meetingLines = safeMeetings(section)
      .map((meeting) => `<span>${escapeHtml(meeting.day)} · ${escapeHtml(meeting.start)}–${escapeHtml(meeting.end)}</span>`)
      .join("");

    card.innerHTML = `
      <div class="card-title">${escapeHtml(section.sectionCode)}</div>
      <div class="card-course-name">${escapeHtml(course.courseName)}</div>
      <div class="card-meta">
        ${meetingLines || "<span>Saat bilgisi yok</span>"}
        ${section.room ? `<span>Room · ${escapeHtml(section.room)}</span>` : ""}
        ${section.instructor ? `<span>${escapeHtml(section.instructor)}</span>` : ""}
      </div>
      <div class="card-actions">
        <button class="add-btn" type="button" ${selected ? "disabled" : ""}>${selected ? "Eklendi" : "Programa ekle"}</button>
      </div>
    `;

    const button = card.querySelector(".add-btn");
    if (!selected) button.addEventListener("click", () => addSection(course, section));
    list.appendChild(card);
  }
}

function addSection(course, section) {
  const nextSection = normalizeSection(course, section);
  const otherCourses = chosenSections.filter((item) => item.courseCode !== course.courseCode);
  const conflict = otherCourses.find((item) => sectionConflicts(item, nextSection));

  if (conflict) {
    window.alert(`${conflict.courseCode} ile saat çakışması var.`);
    return;
  }

  chosenSections = [...otherCourses, nextSection];
  renderChosen();
  updateStatus(`${course.courseCode} programa eklendi.`);
}

function removeSection(courseCode) {
  chosenSections = chosenSections.filter((item) => item.courseCode !== courseCode);
  renderChosen();
  updateStatus(`${courseCode} programdan kaldırıldı.`);
}

function renderChosen() {
  const list = document.getElementById("chosenList");
  const count = document.getElementById("chosenCount");
  const summary = document.getElementById("selectionSummary");
  const printCount = document.getElementById("printCourseCount");
  if (!list) return;

  list.innerHTML = "";
  if (count) count.textContent = String(chosenSections.length);

  const courseLabel = chosenSections.length === 1 ? "1 ders" : `${chosenSections.length} ders`;
  if (summary) summary.textContent = chosenSections.length ? `${courseLabel} programına eklendi` : "Henüz ders eklenmedi";
  if (printCount) printCount.textContent = chosenSections.length === 1 ? "1 course" : `${chosenSections.length} courses`;

  if (!chosenSections.length) {
    list.innerHTML = '<p class="empty-note">Eklediğin dersler burada görünecek.</p>';
  }

  for (const chosen of chosenSections) {
    const card = document.createElement("article");
    card.className = "chosen-card";
    const meetingLines = safeMeetings(chosen)
      .map((meeting) => `<span>${escapeHtml(meeting.day)} · ${escapeHtml(meeting.start)}–${escapeHtml(meeting.end)}</span>`)
      .join("");

    card.innerHTML = `
      <div class="card-title">${escapeHtml(chosen.courseCode)} · ${escapeHtml(getSectionShortLabel(chosen.sectionCode))}</div>
      <div class="card-course-name">${escapeHtml(chosen.courseName)}</div>
      <div class="card-meta">${meetingLines}</div>
      <div class="card-actions">
        <button class="remove-btn" type="button">Kaldır</button>
      </div>
    `;

    card.querySelector(".remove-btn").addEventListener("click", () => removeSection(chosen.courseCode));
    list.appendChild(card);
  }

  renderCalendar();
  updateUrlFromSelection();

  const selectedCourse = document.getElementById("courseSelect")?.value;
  if (selectedCourse) renderSections(selectedCourse);
}

function createCalendarHeader() {
  const header = document.createElement("div");
  header.className = "calendar-days";

  const corner = document.createElement("div");
  corner.className = "calendar-corner";
  corner.textContent = "TIME";
  header.appendChild(corner);

  for (const day of DAYS) {
    const heading = document.createElement("div");
    heading.className = "day-heading";
    heading.textContent = day.label;
    header.appendChild(heading);
  }

  return header;
}

function createTimeAxis() {
  const axis = document.createElement("div");
  axis.className = "time-axis";

  for (let hour = GRID_START_HOUR; hour <= GRID_END_HOUR; hour += 1) {
    const label = document.createElement("div");
    label.className = "time-label";
    if (hour === GRID_START_HOUR) label.classList.add("is-first");
    if (hour === GRID_END_HOUR) label.classList.add("is-last");
    label.style.top = `${((hour - GRID_START_HOUR) / (GRID_END_HOUR - GRID_START_HOUR)) * 100}%`;
    label.textContent = `${String(hour).padStart(2, "0")}:00`;
    axis.appendChild(label);
  }

  return axis;
}

function renderCalendar() {
  const calendar = document.getElementById("calendar");
  if (!calendar) return;

  calendar.innerHTML = "";
  calendar.appendChild(createCalendarHeader());

  const body = document.createElement("div");
  body.className = "calendar-body";
  body.appendChild(createTimeAxis());

  const columns = document.createElement("div");
  columns.className = "day-columns";
  const columnMap = new Map();

  for (const day of DAYS) {
    const column = document.createElement("div");
    column.className = "day-column";
    column.dataset.day = day.key;
    columnMap.set(day.key, column);
    columns.appendChild(column);
  }

  for (const chosen of chosenSections) {
    for (const meeting of safeMeetings(chosen)) {
      const column = columnMap.get(meeting.day);
      if (!column) continue;

      const rawStart = timeToMin(meeting.start);
      const rawEnd = timeToMin(meeting.end);
      if (rawEnd <= GRID_START_MINUTES || rawStart >= GRID_END_MINUTES || rawEnd <= rawStart) continue;

      const start = Math.max(rawStart, GRID_START_MINUTES);
      const end = Math.min(rawEnd, GRID_END_MINUTES);
      const duration = end - start;
      const block = document.createElement("article");
      block.className = `cal-block${duration < 90 ? " is-compact" : ""}`;
      block.style.top = `${((start - GRID_START_MINUTES) / GRID_DURATION) * 100}%`;
      block.style.height = `${(duration / GRID_DURATION) * 100}%`;
      block.setAttribute(
        "aria-label",
        `${chosen.courseCode}, ${chosen.courseName}, ${meeting.start}-${meeting.end}, ${chosen.room}, ${chosen.instructor}`
      );
      block.title = `${chosen.courseCode} · ${chosen.courseName}\n${chosen.sectionCode}\n${meeting.start}–${meeting.end}\n${chosen.room}\n${chosen.instructor}`;

      block.innerHTML = `
        <div class="cal-block-time">${escapeHtml(meeting.start)} – ${escapeHtml(meeting.end)}</div>
        <div class="cal-block-content">
          <div class="cal-block-code">${escapeHtml(chosen.courseCode)} <span>${escapeHtml(getSectionShortLabel(chosen.sectionCode))}</span></div>
          <div class="cal-block-name">${escapeHtml(chosen.courseName)}</div>
          <div class="cal-block-meta">
            ${chosen.room ? `<div>${escapeHtml(chosen.room)}</div>` : ""}
            ${chosen.instructor ? `<div>${escapeHtml(chosen.instructor)}</div>` : ""}
          </div>
        </div>
      `;

      column.appendChild(block);
    }
  }

  body.appendChild(columns);
  calendar.appendChild(body);
}

function updateUrlFromSelection() {
  try {
    const url = new URL(window.location.href);
    const sectionCodes = getSelectedSectionCodes();
    if (sectionCodes.length) url.searchParams.set("s", sectionCodes.join(","));
    else url.searchParams.delete("s");
    window.history.replaceState({}, "", url.toString());
  } catch (error) {
    console.warn("URL güncellenemedi:", error);
  }
}

function applySelectionBySectionCodes(sectionCodes) {
  const nextSelection = [];

  for (const code of sectionCodes) {
    const found = findSectionByCode(code);
    if (!found) continue;

    const normalized = normalizeSection(found.course, found.section);
    const withoutSameCourse = nextSelection.filter((item) => item.courseCode !== normalized.courseCode);
    const hasConflict = withoutSameCourse.some((item) => sectionConflicts(item, normalized));
    if (!hasConflict) nextSelection.splice(0, nextSelection.length, ...withoutSameCourse, normalized);
  }

  chosenSections = nextSelection;
  renderChosen();
}

function loadSelectionFromUrl() {
  const url = new URL(window.location.href);
  const value = url.searchParams.get("s");
  if (!value) return false;

  const codes = value.split(",").map((item) => item.trim()).filter(Boolean);
  applySelectionBySectionCodes(codes);
  return true;
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ sectionCodes: getSelectedSectionCodes() }));
    updateStatus("Taslak kaydedildi.");
  } catch (error) {
    console.error("Taslak kaydedilemedi:", error);
    updateStatus("Taslak kaydedilemedi.");
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      window.alert("Kaydedilmiş taslak yok.");
      return;
    }

    const payload = JSON.parse(raw);
    applySelectionBySectionCodes(payload.sectionCodes || []);
    updateStatus("Taslak yüklendi.");
  } catch (error) {
    console.error("Taslak yüklenemedi:", error);
    updateStatus("Taslak yüklenemedi.");
  }
}

function setupFacultyProgram() {
  const facultySelect = document.getElementById("facultySelect");
  const programSelect = document.getElementById("programSelect");
  if (!facultySelect || !programSelect) return;

  const faculties = [...new Set((DATA?.courses || []).map((course) => course.faculty).filter(Boolean))].sort();
  facultySelect.innerHTML = '<option value="">Tüm fakülteler</option>';

  for (const faculty of faculties) {
    const option = document.createElement("option");
    option.value = faculty;
    option.textContent = faculty;
    facultySelect.appendChild(option);
  }

  facultySelect.addEventListener("change", () => {
    updateProgramDropdown();
    renderCourses();
  });
  programSelect.addEventListener("change", renderCourses);
  updateProgramDropdown();
}

function updateProgramDropdown() {
  const faculty = document.getElementById("facultySelect")?.value || "";
  const programSelect = document.getElementById("programSelect");
  if (!programSelect) return;

  const matchingCourses = faculty
    ? (DATA?.courses || []).filter((course) => course.faculty === faculty)
    : DATA?.courses || [];
  const programs = [...new Set(matchingCourses.map((course) => course.program).filter(Boolean))].sort();

  programSelect.innerHTML = '<option value="">Tüm programlar</option>';
  for (const program of programs) {
    const option = document.createElement("option");
    option.value = program;
    option.textContent = program;
    programSelect.appendChild(option);
  }
}

async function copyShareLink() {
  const link = window.location.href;
  try {
    if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(link);
    updateStatus("Program bağlantısı kopyalandı.");
  } catch (error) {
    window.prompt("Bu bağlantıyı kopyalayabilirsin:", link);
  }
}

function setDarkMode(enabled) {
  document.body.classList.toggle("dark", enabled);
  const toggle = document.getElementById("darkToggle");
  if (toggle) {
    toggle.textContent = enabled ? "☀️" : "🌙";
    toggle.setAttribute("aria-label", enabled ? "Açık temayı aç" : "Koyu temayı aç");
  }
  try {
    localStorage.setItem(THEME_KEY, enabled ? "dark" : "light");
  } catch (error) {
    console.warn("Tema tercihi kaydedilemedi:", error);
  }
}

function preparePrint() {
  document.title = "khas-weekly-schedule-2026-2027-fall";
}

function restoreAfterPrint() {
  document.title = DEFAULT_DOCUMENT_TITLE;
}

function printSchedule() {
  preparePrint();
  updateStatus("PDF görünümü hazırlanıyor…");
  window.print();
  window.setTimeout(restoreAfterPrint, 500);
}

function bindActions() {
  document.getElementById("clearBtn")?.addEventListener("click", () => {
    chosenSections = [];
    renderChosen();
    updateStatus("Program temizlendi.");
  });
  document.getElementById("saveDraftBtn")?.addEventListener("click", saveDraft);
  document.getElementById("loadDraftBtn")?.addEventListener("click", loadDraft);
  document.getElementById("copyLinkBtn")?.addEventListener("click", copyShareLink);
  document.getElementById("printBtn")?.addEventListener("click", printSchedule);
  document.getElementById("darkToggle")?.addEventListener("click", () => {
    setDarkMode(!document.body.classList.contains("dark"));
  });

  window.addEventListener("beforeprint", preparePrint);
  window.addEventListener("afterprint", restoreAfterPrint);
}

async function init() {
  try {
    const response = await fetch("data/normalized.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    DATA = await response.json();

    setupFacultyProgram();
    renderCourses();
    bindActions();

    try {
      setDarkMode(localStorage.getItem(THEME_KEY) === "dark");
    } catch (error) {
      setDarkMode(false);
    }

    if (!loadSelectionFromUrl()) renderChosen();
    updateStatus("Hazır.");
  } catch (error) {
    console.error("Başlatma hatası:", error);
    updateStatus("Ders verileri yüklenemedi.");
    document.getElementById("calendar").innerHTML = '<p class="empty-note">Ders verileri yüklenemedi.</p>';
  }
}

init();
