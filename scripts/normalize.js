const fs = require("fs");
const path = require("path");

const RAW_DIR = path.join(__dirname, "..", "raw");
const OUTPUT_FILE = path.join(__dirname, "..", "data", "normalized.json");

function parseTimeBlocks(zamanStr) {
  if (!zamanStr) return [];

  const meetings = [];
  const regex = /(MON|TUE|WED|THU|FRI|SAT|SUN)\s*:\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/g;

  let match;
  while ((match = regex.exec(zamanStr)) !== null) {
    meetings.push({
      day: match[1][0] + match[1].slice(1).toLowerCase(),
      start: match[2],
      end: match[3]
    });
  }

  return meetings;
}

function normalizeAll() {
  const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith(".json"));
  const coursesMap = new Map();

  for (const file of files) {
    const base = path.basename(file, ".json"); 
    // örnek: fens_cmpe

    const [facultyName, programName] = base.split("_").map(x => x.toUpperCase());
    const filePath = path.join(RAW_DIR, file);
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const results = raw?.d?.results || [];

    for (const r of results) {
      const code = r.SmShort?.split("*")[0];
      if (!code) continue;

      if (!coursesMap.has(code)) {
        coursesMap.set(code, {
          courseCode: code,
          courseName: r.SmStext,
          faculty: facultyName,
          program: programName,
          sections: []
        });
      }

      coursesMap.get(code).sections.push({
        sectionCode: r.SeShort,
        sectionId: r.SeObjid,
        instructor: r.Akademisyen,
        room: r.Oda,
        capacity: parseInt(r.Kapasite) || null,
        meetings: parseTimeBlocks(r.Zaman)
      });
    }
  }

  const output = {
    courses: Array.from(coursesMap.values())
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Wrote data/normalized.json (${output.courses.length} courses)`);
}

normalizeAll();