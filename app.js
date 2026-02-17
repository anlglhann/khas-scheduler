let DATA = null;
let chosenSections = []; // {courseCode, sectionCode, meetings:[]}

function timeToMin(t) {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}

function overlaps(a, b) {
  if (a.day !== b.day) return false;
  const a0 = timeToMin(a.start), a1 = timeToMin(a.end);
  const b0 = timeToMin(b.start), b1 = timeToMin(b.end);
  return Math.max(a0, b0) < Math.min(a1, b1);
}

function sectionConflicts(secA, secB) {
  for (const ma of secA.meetings) {
    for (const mb of secB.meetings) {
      if (overlaps(ma, mb)) return true;
    }
  }
  return false;
}

function renderCourses() {
  const sel = document.getElementById("courseSelect");
  sel.innerHTML = "";

  for (const c of DATA.courses) {
    const opt = document.createElement("option");
    opt.value = c.courseCode;
    opt.textContent = `${c.courseCode} — ${c.courseName}`;
    sel.appendChild(opt);
  }

  sel.addEventListener("change", () => renderSections(sel.value));
  renderSections(sel.value);
}

function renderSections(courseCode) {
  const course = DATA.courses.find(c => c.courseCode === courseCode);
  const info = document.getElementById("courseInfo");
  const list = document.getElementById("sectionList");

  info.textContent = `${course.sections.length} section`;
  list.innerHTML = "";

  for (const s of course.sections) {
    const div = document.createElement("div");
    div.className = "row";

    const meetingsText = s.meetings
      .map(m => `${m.day} ${m.start}-${m.end}`)
      .join(" | ");

    div.innerHTML = `
      <b>${s.sectionCode}</b><br/>
      <span class="muted">${s.instructor || "—"} • ${s.room || "—"} • ${meetingsText}</span>
    `;

    const btn = document.createElement("button");
    btn.textContent = "Ekle";
    btn.onclick = () => addSection(course, s);

    div.appendChild(btn);
    list.appendChild(div);
  }
}

function addSection(course, section) {
  // aynı dersten başka section seçiliyse onu değiştir
  chosenSections = chosenSections.filter(x => x.courseCode !== course.courseCode);

  // çakışma kontrolü
  for (const ch of chosenSections) {
    if (sectionConflicts(ch, section)) {
      alert(`Çakışma var: ${ch.courseCode} / ${ch.sectionCode} ile`);
      return;
    }
  }

  chosenSections.push({
    courseCode: course.courseCode,
    courseName: course.courseName,
    sectionCode: section.sectionCode,
    meetings: section.meetings
  });

  renderChosen();
}

function renderChosen() {
  const list = document.getElementById("chosenList");
  const status = document.getElementById("status");
  list.innerHTML = "";

  for (const ch of chosenSections) {
    const div = document.createElement("div");
    div.className = "row";
    const mt = ch.meetings.map(m => `${m.day} ${m.start}-${m.end}`).join(" | ");
    div.innerHTML = `<b>${ch.courseCode}</b> — ${ch.sectionCode}<br/><span class="muted">${mt}</span>`;
    list.appendChild(div);
  }

  status.textContent = `${chosenSections.length} ders seçildi.`;
}

async function init() {
  const res = await fetch("data/normalized.json");
  DATA = await res.json();

  document.getElementById("clearBtn").onclick = () => {
    chosenSections = [];
    renderChosen();
  };

  renderCourses();
  renderChosen();
}

init();