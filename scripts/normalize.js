// scripts/normalize.js
// Node 18+ gerekir (fetch var)

import fs from "fs";
import path from "path";

const DAY_MAP = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

function parseZaman(zamanStr) {
  if (!zamanStr) return [];

  // DAY : HH:MM - HH:MM (tekrarlı)
  const re = /(MON|TUE|WED|THU|FRI|SAT|SUN)\s*:\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/g;

  const meetings = [];
  let m;
  while ((m = re.exec(zamanStr)) !== null) {
    const day = DAY_MAP[m[1]];
    const start = m[2];
    const end = m[3];

    // saçma kayıtları ele (00:00-00:00, 23:00-23:00 vs.)
    if (start === end) continue;

    meetings.push({ day, start, end });
  }
  return meetings;
}

function normalize(rawJson) {
  const rows = rawJson?.d?.results ?? [];
  const byCourse = new Map();

  for (const r of rows) {
    const courseCode = String(r.SmShort ?? "").trim();
    const courseName = String(r.SmStext ?? "").trim();

    const meetings = parseZaman(String(r.Zaman ?? ""));
    if (meetings.length === 0) continue; // staj gibi şeyleri şimdilik at

    const section = {
      sectionId: String(r.SeObjid ?? ""),
      sectionCode: String(r.SeShort ?? "").trim(),
      instructor: String(r.Akademisyen ?? "").trim(),
      room: String(r.Oda ?? "").trim(),
      capacity: Number(String(r.Kapasite ?? "").trim()) || null,
      meetings,
    };

    if (!byCourse.has(courseCode)) {
      byCourse.set(courseCode, { courseCode, courseName, sections: [] });
    }
    byCourse.get(courseCode).sections.push(section);
  }

  return {
    term: "2025020",
    courses: Array.from(byCourse.values()).sort((a, b) =>
      a.courseCode.localeCompare(b.courseCode)
    ),
  };
}

// ---- main
const rawPath = path.join("data", "raw.json");
const outPath = path.join("data", "normalized.json");

const rawText = fs.readFileSync(rawPath, "utf-8");
const rawJson = JSON.parse(rawText);

const normalized = normalize(rawJson);
fs.writeFileSync(outPath, JSON.stringify(normalized, null, 2), "utf-8");

console.log(`Wrote ${outPath} (${normalized.courses.length} courses)`);