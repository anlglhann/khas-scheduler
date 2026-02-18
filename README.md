# KHAS Schedule Planner (Demo)

A simple course scheduler for Kadir Has University.

## Features
- Faculty → Program → Course filtering
- Section selection with time-conflict checks
- Weekly timetable view
- Save/Load draft (localStorage)
- Shareable link (URL parameter)

## Live Demo
(After enabling GitHub Pages, paste your link here.)

## Data pipeline
1. Put raw SPARKS exports into `raw/` (one JSON per program, e.g. `fens_cmpe.json`)
2. Run:
   ```bash
   node scripts/normalize.js

## Disclaimer
This is an independent student-built demo project.
It is not affiliated with Kadir Has University or the SPARKS system.
Course data used in this demo is manually exported from publicly visible course listings for educational and non-commercial purposes only.