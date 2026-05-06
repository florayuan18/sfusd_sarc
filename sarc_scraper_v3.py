"""
SFUSD SARC Scraper
==================
Extracts structured data from SFUSD School Accountability Report Card (SARC) PDFs
into a single row per school. Given a folder of SARC PDFs, it produces a tidy
CSV / DataFrame where every row is a school and every column is a variable.

Approach
--------
All SARCs from this template are generated with identical layout, so anchor-based regex 
parsing on layout-preserved pdftotext output is
far more reliable (and faster) than trying to reconstruct tables with pdfplumber.

For each PDF we:
  1. Extract text with `pdftotext -layout`.
  2. Walk through the document using section headers as anchors
     (e.g. "Teacher Preparation and Placement (School Year 2020-2021)").
  3. Pull values out with targeted regexes and table-row parsing.

Cells that are blank, "--", or "N/A" in the PDF are preserved as None so
downstream analysis can distinguish missing/suppressed data from zeros.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd


# ---------------------------------------------------------------------------
# low-level helpers
# ---------------------------------------------------------------------------

def pdf_to_layout_text(pdf_path: Path) -> str:
    """Run `pdftotext -layout` and return the result as a string."""
    result = subprocess.run(
        ["pdftotext", "-layout", str(pdf_path), "-"],
        capture_output=True, text=True, check=True,
    )
    return result.stdout


def to_num(value: str | None) -> float | int | None:
    """Coerce '91.43', '1,234', '--', 'N/A', '' to number / None."""
    if value is None:
        return None
    v = value.strip().replace(",", "").replace("$", "").replace("%", "")
    if v in {"", "--", "----", "N/A", "n/a"}:
        return None
    try:
        f = float(v)
        return int(f) if f.is_integer() else f
    except ValueError:
        return None


def clean_text(value: str | None) -> str | None:
    """Collapse whitespace and strip. Return None for empty/dash."""
    if value is None:
        return None
    v = re.sub(r"\s+", " ", value).strip()
    if v in {"", "--", "----"}:
        return None
    return v


def section(text: str, start_re: str, end_re: str | None = None) -> str:
    """Return the slice of `text` between the first match of start_re
    and the first match of end_re after it (or end of text)."""
    m = re.search(start_re, text)
    if not m:
        return ""
    after = text[m.end():]
    if end_re:
        m2 = re.search(end_re, after)
        if m2:
            return after[:m2.start()]
    return after


# ---------------------------------------------------------------------------
# per-section extractors
# ---------------------------------------------------------------------------

def parse_header(text: str) -> dict[str, Any]:
    """Cover-page fields: school name, address, principal, phone, fax, IDs."""
    out: dict[str, Any] = {}

    # the school name sits on the line just before the address line, which
    # always has a comma + zip. grab the block near the top of page 1.
    top = text[:2000]
    lines = [l.strip() for l in top.splitlines() if l.strip()]

    # address line looks like: "0250 23rd av, san francisco, ca 94121"
    addr_idx = None
    for i, line in enumerate(lines):
        if re.match(r".+,\s*[A-Z ]+,\s*CA\s*\d{5}", line):
            addr_idx = i
            break
    if addr_idx is not None:
        out["School Address"] = lines[addr_idx]
        # school name is the non-generic line right above it
        for j in range(addr_idx - 1, -1, -1):
            cand = lines[j]
            if cand and "School Year" not in cand and "Published" not in cand \
                    and "Report Card" not in cand:
                out["School Name"] = cand
                break

    # field:value lookups
    patterns = {
        "Principal": r"Principal:\s*([^\n]+?)(?:\s{2,}|$)",
        "Phone": r"Phone:\s*([\d\-]+)",
        "Fax": r"Fax:\s*([\d\-]+)",
        "SFUSD School ID #": r"SFUSD School ID #:\s*(\d+)",
        "Calif.School ID #": r"Calif\.School ID #:\s*(\d+)",
    }
    for key, pat in patterns.items():
        m = re.search(pat, top)
        if m:
            out[key] = m.group(1).strip()
    return out


def parse_mission(text: str) -> dict[str, Any]:
    """The free-text 'School Description and Mission Statement' paragraph(s)."""
    block = section(
        text,
        r"School Description and Mission Statement\s*\n"
        r"This section provides information about the school's goals and programs\.",
        r"Student Enrollment By Grade Level",
    )
    return {"School Description and Mission Statement (Full)": clean_text(block)}


def parse_enrollment_by_grade(text: str) -> dict[str, Any]:
    """Enrollments per grade + total. The table has TWO parallel columns of
    (grade, count) pairs side-by-side on each line, e.g.:
        '    K             65                9             0'
    We scan each line for every (grade_label, count) pair, regardless of
    whether it's in the left or right half of the page.
    """
    block = section(
        text,
        r"Student Enrollment By Grade Level \(School Year[^\)]+\)",
        r"Student Enrollment By Group",
    )

    out: dict[str, Any] = {
        f"Enrollment Grade {g}": None
        for g in ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
    }

    # any (label, number) pair on any line. label is k or a 1-2 digit grade.
    # we exclude the "grade level / enrollment" header row, but we can't
    # skip the line containing "total enrollment" because in this layout
    # grade 4's (label, count) pair shares a line with "total enrollment".
    pair_re = re.compile(r"\b(K|1[0-2]|[1-9])\s+(\d+)\b")
    for line in block.splitlines():
        if "Grade Level" in line:
            continue
        # strip the "total enrollment number" part so its number can't get
        # mistaken for a grade count.
        clean_line = re.sub(r"Total Enrollment\s+[\d,]+", "", line)
        for m in pair_re.finditer(clean_line):
            label, count = m.group(1), m.group(2)
            key = f"Enrollment Grade {label}"
            if key in out and out[key] is None:
                out[key] = to_num(count)

    total_m = re.search(r"Total Enrollment\s+([\d,]+)", block)
    out["Total Enrollment"] = to_num(total_m.group(1)) if total_m else None
    return out


def parse_enrollment_by_group(text: str) -> dict[str, Any]:
    """Demographic % enrollment. Values can be blank when suppressed."""
    block = section(
        text,
        r"Student Enrollment By Group \(School Year[^\)]+\)",
        r"Section A \(Conditions of Learning\)",
    )

    group_to_col = {
        "African American": "% African American",
        "American Indian or Alaska Native": "% American Indian or Alaska Native",
        "Asian": "% Asian",
        "Filipino": "% Filipino",
        "Hispanic or Latino": "% Hispanic or Latino",
        "Pacific Islander": "% Pacific Islander",
        "White (Not Hispanic)": "% White (Not Hispanic)",
        "Two or More Races": "% Two or More Races",
        "Socioeconomically Disadvantaged": "% Socioeconomically Disadvantaged",
        "English Learners": "% English Learners",
        "Students with Disabilities": "% Students with Disabilities",
        "Foster Youth": "% Foster Youth",
        "Homeless": "% Homeless",
        "Migrant": "% Migrant",
        "Female": "% Female",
        "Male": "% Male",
        "Non-Binary": "% Non-Binary",
    }

    out: dict[str, Any] = {k: None for k in group_to_col.values()}
    for label, col in group_to_col.items():
        # match the label, optional whitespace, optional number. some rows
        # have no number at all when suppressed.
        pat = rf"(?m)^\s*{re.escape(label)}\s+([\d.]+)\s*$"
        m = re.search(pat, block)
        if m:
            out[col] = to_num(m.group(1))
    return out


# --- teacher preparation & placement (three years) -------------------------
# (row patterns are defined inline in parse_teacher_prep_block.)


def parse_teacher_prep_block(block: str, year_label: str) -> dict[str, Any]:
    """Parse one 'Teacher Preparation and Placement' table.

    Each data row is:
      <label potentially spanning 2 lines>  School# School%  District# District%  State# State%

    We collapse ALL whitespace to single spaces so wrapped labels read as one
    continuous string, then pull the six numbers following each row anchor.
    """
    out: dict[str, Any] = {}
    # normalize whitespace. newlines become single spaces.
    flat = re.sub(r"\s+", " ", block)

    # slightly relaxed row regexes (work against the flattened string).
    # note: the first row's label wraps across two physical lines in the pdf as
    #   "fully (preliminary or clear) credentialed for\n
    #    subject and student placement (properly        <6 numbers>
    #    assigned)"
    # so after whitespace flattening, the six numbers sit between "properly"
    # and "assigned)". we anchor on "properly" and ignore the trailing
    # "assigned)" token for that row.
    flat_rows = [
        ("Fully (Preliminary or Clear) Credentialed for Subject and Student Placement (properly assigned)",
         r"Fully \(Preliminary or Clear\) Credentialed for Subject and Student Placement \(properly"),
        ("Intern Credential Holders Properly Assigned",
         r"Intern Credential Holders Properly Assigned"),
        ("Teachers Without Credentials and Misassignments (\u201c ineffective\u201d under ESSA)",
         r"Teachers Without Credentials and Misassignments \([^)]*ineffective[^)]*\)"),
        ("Credentialed Teachers Assigned Out-of- Field (\u201c out-of-field\u201d under ESSA)",
         r"Credentialed Teachers Assigned Out-of-\s?Field \([^)]*out-of-field[^)]*\)"),
        ("Unknown", r"\bUnknown\b"),
        ("Total Teaching Positions", r"Total Teaching Positions"),
    ]

    for row_label, row_re in flat_rows:
        m = re.search(
            row_re + r"\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)",
            flat,
        )
        s_num = s_pct = d_num = d_pct = st_num = st_pct = None
        if m:
            s_num, s_pct, d_num, d_pct, st_num, st_pct = [to_num(x) for x in m.groups()]

        prefix = f"{row_label} {year_label}"
        out[f"{prefix} School Number"] = s_num
        out[f"{prefix} School %"] = s_pct
        out[f"{prefix} District Number"] = d_num
        out[f"{prefix} District %"] = d_pct
        out[f"{prefix} State Number"] = st_num
        out[f"{prefix} State %"] = st_pct
    return out


def parse_teacher_prep_all_years(text: str) -> dict[str, Any]:
    out: dict[str, Any] = {}
    years = [
        ("(2020-2021)", r"Teacher Preparation and Placement \(School Year 2020.2021\)"),
        ("(2021-2022)", r"Teacher Preparation and Placement \(School Year 2021.2022\)"),
        ("(2022-2023)", r"Teacher Preparation and Placement \(School Year 2022.2023\)"),
    ]
    # end anchors: next section or next year's table.
    next_anchors = [
        r"Teacher Preparation and Placement \(School Year 2021.2022\)",
        r"Teacher Preparation and Placement \(School Year 2022.2023\)",
        r"Teachers Without Credentials and Misassignments\s*\n"
        r"\s*\(considered .{1,3}ineffective.{1,3} under ESSA\)",
    ]
    for (label, anchor), end in zip(years, next_anchors):
        block = section(text, anchor, end)
        out.update(parse_teacher_prep_block(block, label))
    return out


def parse_ineffective_table(text: str) -> dict[str, Any]:
    """
    Teachers Without Credentials and Misassignments (considered "ineffective" under ESSA)
    3-column table: Permits/Waivers | Misassignments | Vacant Positions | Total
    """
    block = section(
        text,
        r"Teachers Without Credentials and Misassignments\s*\n\s*"
        r"\(considered .{1,3}ineffective.{1,3} under ESSA\)",
        r"Credentialed Teachers Assigned Out-of-Field\s*\n\s*"
        r"\(considered .{1,3}out-of-field.{1,3} under ESSA\)",
    )
    rows = [
        ("Permits and Waivers", "Permits and Waivers"),
        ("Misassignments", "Misassignments"),
        ("Vacant Positions", "Vacant Positions"),
        ("Total Teachers Without Credentials and Misassignment",
         "Total Teachers Without Credentials and Misassignment"),
    ]
    out: dict[str, Any] = {}
    for label, col in rows:
        m = re.search(rf"(?m)^\s*{re.escape(label)}\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*$",
                      block)
        y1 = y2 = y3 = None
        if m:
            y1, y2, y3 = (to_num(x) for x in m.groups())
        out[f"Ineffective - {col} 2020-21 Number"] = y1
        out[f"Ineffective - {col} 2021-22 Number"] = y2
        out[f"Ineffective - {col} 2022-23 Number"] = y3
    return out


def parse_out_of_field_table(text: str) -> dict[str, Any]:
    """Page 7: Credentialed Teachers Assigned Out-of-Field
    (considered "out-of-field" under ESSA).
    3 rows × 3 year columns:
      - Credentialed Teachers Authorized on a Permit or Waiver
      - Local Assignment Options
      - Total Out-of-Field Teachers
    """
    block = section(
        text,
        r"Credentialed Teachers Assigned Out-of-Field\s*\n\s*"
        r"\(considered .{1,3}out-of-field.{1,3} under ESSA\)",
        r"Class Assignments",
    )
    rows = [
        ("Credentialed Teachers Authorized on a Permit or Waiver",
         "Credentialed Teachers Authorized on a Permit or Waiver"),
        ("Local Assignment Options", "Local Assignment Options"),
        ("Total Out-of-Field Teachers", "Total Out-of-Field Teachers"),
    ]
    out: dict[str, Any] = {}
    for label, col in rows:
        m = re.search(
            rf"(?m)^\s*{re.escape(label)}\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*$",
            block,
        )
        y1 = y2 = y3 = None
        if m:
            y1, y2, y3 = (to_num(x) for x in m.groups())
        out[f"Out-of-Field - {col} 2020-21 Number"] = y1
        out[f"Out-of-Field - {col} 2021-22 Number"] = y2
        out[f"Out-of-Field - {col} 2022-23 Number"] = y3
    return out


def parse_class_assignments_table(text: str) -> dict[str, Any]:
    """Page 7: Class Assignments table.
    2 rows × 3 year-percent columns:
      - Misassignments for English Learners
      - No credential, permit or authorization to teach
    The labels span 3-4 lines but the percent values appear on the FIRST
    line of the label (which contains the descriptive text). So we anchor
    on the first few distinguishing words and grab the next 3 numbers.
    """
    block = section(
        text,
        r"Class Assignments\b",
        r"Quality, Currency, and Availability of Textbooks",
    )
    flat = re.sub(r"\s+", " ", block)

    rows = [
        # anchor on the first phrase only — the values appear on the same
        # physical line as this phrase.
        ("Misassignments for English Learners",
         r"Misassignments for English Learners",
         "Misassignments for English Learners"),
        ("No credential, permit or authorization to teach",
         r"No credential, permit or authorization to teach",
         "No credential, permit or authorization to teach"),
    ]
    out: dict[str, Any] = {}
    for _, anchor_re, col in rows:
        m = re.search(anchor_re + r"[^|]*?\s([\d.]+)\s+([\d.]+)\s+([\d.]+)\s",
                      flat)
        # use a more reliable approach: strip leading prose and grab the
        # last 3 numbers in the row.
        if not m:
            # try a simpler form: find label, then any words, then 3 numbers
            # with no other 3-number sequences in between.
            m = re.search(anchor_re + r".*?\b([\d.]+)\s+([\d.]+)\s+([\d.]+)\b",
                          flat)
        y1 = y2 = y3 = None
        if m:
            y1, y2, y3 = (to_num(x) for x in m.groups())
        out[f"Class Assignment - {col} 2020-21 %"] = y1
        out[f"Class Assignment - {col} 2021-22 %"] = y2
        out[f"Class Assignment - {col} 2022-23 %"] = y3
    return out


# --- facility inspection ---------------------------------------------------

FACILITY_ITEMS = [
    ("Systems: Gas Leaks, Mechanical/HVAC, Sewer", "Systems"),
    ("Interior: Interior Surfaces", "Interior"),
    ("Cleanliness: Overall and Pest Infestation", "Cleanliness"),
    ("Electrical", "Electrical"),
    ("Restrooms/Sinks/Fountains", "Restrooms/Sinks/Fountains"),
    ("Safety: Fire and Hazardous Materials", "Safety"),
    ("Structural: Damage, Roofs", "Structural"),
    ("External: School Grounds, Windows, Doors", "External"),
]


def _x_column_to_status(x_col: int, headers: list[tuple[str, int]]) -> str | None:
    """Given an X mark at column `x_col` and a list of (status_name, header_col)
    pairs sorted left-to-right, return the status for that X.

    Empirical rule for SFUSD SARC tables: X marks sit ~3-8 columns to the
    RIGHT of their own header label start, with the offset growing from the
    leftmost to rightmost column. After subtracting a typical offset of
    ~6 columns, each X is closest to its correct header. This works for
    both the per-row Repair Status table (headers 5 cols apart, offsets
    3/6/8) and the Overall Summary row (headers much farther apart, X
    offset ~9).
    """
    if not headers:
        return None
    X_OFFSET = 6
    shifted = x_col - X_OFFSET
    return min(headers, key=lambda h: abs(h[1] - shifted))[0]


def parse_facility_status(text: str) -> dict[str, Any]:
    """For each facility item, return the Repair Status (Good/Fair/Poor)
    plus the Overall Summary, inspection date, and additional comments.

    The facility table spans multiple pages (typically pages 9-11), and on
    SOME schools the table re-flows on subsequent pages with DIFFERENT
    column widths (e.g. Good/Fair/Poor at columns 35/40/45 on page 10
    instead of 53/58/63). So we must detect the header positions for each
    page-segment and use the headers that apply to each row's page.

    Strategy:
      1. Split the section into "page-segments" delimited by header rows
         (lines containing 'Item Inspected' AND 'Good Fair Poor').
      2. For each segment, parse Good/Fair/Poor column positions from its
         own header.
      3. For each row in the segment, find the X column and map it to a
         status using that segment's columns.
    """
    block = section(
        text,
        r"School Facility Good Repair Status",
        r"School Facility Conditions and Improvements",
    )

    out: dict[str, Any] = {}
    for _, short in FACILITY_ITEMS:
        out[f"Facility - {short} Status"] = None

    lines = block.splitlines()

    # identify header lines (repair status + item inspected + good fair poor)
    header_indices: list[int] = []
    for i, line in enumerate(lines):
        if "Item Inspected" in line and "Good" in line and "Fair" in line and "Poor" in line:
            header_indices.append(i)

    if not header_indices:
        return out  # no facility table found

    # build segments: each segment is (header_line_idx, page_lines)
    segments: list[tuple[list[tuple[str, int]], list[str]]] = []
    for seg_idx, h_idx in enumerate(header_indices):
        end_idx = header_indices[seg_idx + 1] if seg_idx + 1 < len(header_indices) else len(lines)
        # start the segment at the header line, end before next header
        seg_lines = lines[h_idx:end_idx]
        header_line = lines[h_idx]
        seg_headers = [
            ("Good", header_line.index("Good")),
            ("Fair", header_line.index("Fair")),
            ("Poor", header_line.index("Poor")),
        ]
        segments.append((seg_headers, seg_lines))

    # for each facility item, find which segment its row is in, then
    # determine status using that segment's headers.
    for label, short in FACILITY_ITEMS:
        for seg_headers, seg_lines in segments:
            found = False
            for line in seg_lines:
                if label in line:
                    label_end = line.index(label) + len(label)
                    # look for x marker after the label. must be a standalone x
                    # (preceded and followed by whitespace) to avoid matching
                    # x inside an arbitrary word in the notes column.
                    m = re.search(r"(?<=\s)X(?=\s|$)", line[label_end:])
                    if m:
                        x_col = label_end + m.start()
                        out[f"Facility - {short} Status"] = _x_column_to_status(
                            x_col, seg_headers)
                    found = True
                    break
            if found:
                break

    # overall summary — has its own four-column header (exemplary/good/fair/poor).
    # the header is sometimes split across two lines:
    #   line 1: "exemplary    good"
    #   line 2: "         poor    fair"  (note: order may vary!)
    # we collect column positions across both layout cases.
    overall_block = section(
        block, r"Overall Summary of School Facility Good Repair Status", None
    )
    overall_lines = overall_block.splitlines()

    overall_headers: list[tuple[str, int]] = []
    # first try: all four on the same line.
    for line in overall_lines:
        if all(w in line for w in ("Exemplary", "Good", "Fair", "Poor")):
            overall_headers = [
                ("Exemplary", line.index("Exemplary")),
                ("Good", line.index("Good")),
                ("Fair", line.index("Fair")),
                ("Poor", line.index("Poor")),
            ]
            break

    # if not found on a single line, try across two consecutive lines.
    if not overall_headers:
        for i in range(len(overall_lines) - 1):
            l1, l2 = overall_lines[i], overall_lines[i + 1]
            words_in_l1 = [w for w in ("Exemplary", "Good", "Fair", "Poor") if w in l1]
            words_in_l2 = [w for w in ("Exemplary", "Good", "Fair", "Poor") if w in l2]
            if set(words_in_l1) | set(words_in_l2) == {"Exemplary", "Good", "Fair", "Poor"} \
                    and words_in_l1 and words_in_l2:
                overall_headers = []
                for w in ("Exemplary", "Good", "Fair", "Poor"):
                    if w in l1:
                        overall_headers.append((w, l1.index(w)))
                    elif w in l2:
                        overall_headers.append((w, l2.index(w)))
                break

    overall_status: str | None = None
    for line in overall_lines:
        if "Overall Summary" in line and "Good Repair Status" not in line:
            idx = line.index("Overall Summary") + len("Overall Summary")
            m = re.search(r"(?<=\s)X(?=\s|$)", line[idx:])
            if m and overall_headers:
                x_pos = idx + m.start()
                overall_status = _x_column_to_status(x_pos, overall_headers)
            break
    out["Overall Summary of School Facility"] = overall_status

    m = re.search(r"Inspection Date\s+([^\n]+?)(?:\n|$)", overall_block)
    out["Inspection Date"] = clean_text(m.group(1)) if m else None

    m = re.search(
        r"Additional Comments:\s*(.+?)(?:\n\s*\n|School Facility Conditions)",
        overall_block, flags=re.S,
    )
    out["Additional Comments"] = clean_text(m.group(1)) if m else None

    return out


def parse_facility_improvements(text: str) -> dict[str, Any]:
    """Free-text narrative about renovations / improvements."""
    block = section(
        text,
        # allow page breaks (form-feed \x0c, page numbers, etc.) between
        # the title and the description sentence.
        r"School Facility Conditions and Improvements"
        r"[\s\S]*?"
        r"description of any planned or recently completed facility improvements\.",
        r"Part B \(Pupil Outcomes\) begins",
    )
    return {"School Facility Conditions and Improvements": clean_text(block)}


# --- caaspp summary (ela / math / science) --------------------------------

def parse_caaspp_summary(text: str) -> dict[str, Any]:
    """Percent meeting/exceeding for ELA and Math (school/district/state, 22-23 & 23-24).

    The subject labels in the PDF wrap across 2-3 lines; the six data values
    appear on the same line as the FIRST line of the label ("English Language"
    or "Mathematics (grades 3-"), so we anchor on those shorter strings.
    """
    block = section(
        text,
        r"California Assessment of Student Performance and Progress Results",
        r"CAASPP Assessment Results - English Language Arts",
    )
    out: dict[str, Any] = {}

    def grab_six_from_line(anchor_re: str) -> list[float | int | None]:
        # search on the original (multi-line) block; the six numbers are on
        # the same physical line as the anchor.
        m = re.search(
            anchor_re + r"\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*$",
            block, flags=re.MULTILINE,
        )
        return [to_num(x) for x in m.groups()] if m else [None] * 6

    ela = grab_six_from_line(r"English Language")
    math = grab_six_from_line(r"Mathematics \(grades 3-")

    labels = [
        "School_22-23", "School_23-24",
        "District_22-23", "District_23-24",
        "State_22-23", "State_23-24",
    ]
    for lab, val in zip(labels, ela):
        out[f"% Meeting/Exceeding ELA (3-8,11)_{lab}"] = val
    for lab, val in zip(labels, math):
        out[f"% Meeting/Exceeding Math (3-8,11)_{lab}"] = val
    return out


def parse_science_summary(text: str) -> dict[str, Any]:
    block = section(
        text, r"CAASPP Test Results in Science for All Students",
        r"CAASPP Test Results in Science by Student Group",
    )
    flat = re.sub(r"\s+", " ", block)
    m = re.search(
        r"Science \(Gr 5,8 and\s+high school\)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)",
        flat,
    )
    vals = [to_num(x) for x in m.groups()] if m else [None] * 6
    labels = [
        "School_22-23", "School_23-24",
        "District_22-23", "District_23-24",
        "State_22-23", "State_23-24",
    ]
    return {f"% Meeting/Exceeding Science_{lab}": v for lab, v in zip(labels, vals)}


# --- caaspp by student group (ela / math / science) ------------------------

# canonical group ordering used in all three by-group tables. the science
# table uses slightly different labels for a few rows; we map both forms.
CAASPP_GROUPS = [
    ("All Students", ["All Students"]),
    ("Male", ["Male"]),
    ("Female", ["Female"]),
    ("African American", ["African American", "Black or African American"]),
    ("American Indian/Alaskan",
     ["American Indian/Alaskan", "American Indian or Alaska Native"]),
    ("Asian", ["Asian"]),
    ("Filipino", ["Filipino"]),
    ("Hispanic or Latino", ["Hispanic or Latino"]),
    ("Pacific Islander/Hawaiian",
     ["Pacific Islander/Hawaiian", "Native Hawaiian or Pacific Islander"]),
    ("White", ["White"]),
    ("Two or More Races", ["Two or More Races"]),
    ("Economically Disadvantaged",
     ["Economically Disadvantaged", "Socioeconomically Disadvantaged"]),
    ("English Learners", ["English Learners"]),
    ("Students with Disabilities", ["Students with Disabilities"]),
    ("Migrant Education Services",
     ["Migrant Education Services", "Students Receiving Migrant Education Services"]),
    ("Foster Youth", ["Foster Youth"]),
    ("Homeless", ["Homeless"]),
    ("Military", ["Military"]),
]

FIELD_SUFFIXES = [
    "Total Enrollment",
    "Number Tested",
    "Percent Tested",
    "Percent Not Tested",
    "Percent Met or Exceeded",
]


def parse_caaspp_by_group_block(block: str, subject_prefix: str) -> dict[str, Any]:
    """Each row: <group label>  <5 numbers>. Labels and numbers can be '--' or missing."""
    out: dict[str, Any] = {}

    # initialize everything to none
    for canonical, _ in CAASPP_GROUPS:
        for suf in FIELD_SUFFIXES:
            out[f"{subject_prefix} {canonical} {suf}"] = None

    lines = block.splitlines()
    for canonical, aliases in CAASPP_GROUPS:
        for alias in aliases:
            # match the label then 5 tokens (numbers or '--' or '0').
            pat = (rf"(?m)^\s*{re.escape(alias)}\s+"
                   r"(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*$")
            m = re.search(pat, block)
            if m:
                vals = list(m.groups())
                for suf, val in zip(FIELD_SUFFIXES, vals):
                    out[f"{subject_prefix} {canonical} {suf}"] = to_num(val)
                break
    return out


def parse_caaspp_ela_by_group(text: str) -> dict[str, Any]:
    block = section(
        text,
        r"CAASPP Assessment Results - English Language Arts \(ELA\)\s*\n"
        r"\s*Grades Three to Eight and Grade Eleven \(School Year 2023-24\)",
        r"CAASPP Assessment Results - Mathematics",
    )
    return parse_caaspp_by_group_block(block, "CAASPP ELA 2023-24")


def parse_caaspp_math_by_group(text: str) -> dict[str, Any]:
    block = section(
        text,
        r"CAASPP Assessment Results - Mathematics\s*\n"
        r"\s*Grades Three to Eight and Grade Eleven \(School Year 2023-24\)",
        r"CAASPP Test Results in Science for All Students",
    )
    return parse_caaspp_by_group_block(block, "CAASPP Math 2023-24")


def parse_caaspp_science_by_group(text: str) -> dict[str, Any]:
    block = section(
        text,
        r"CAASPP Test Results in Science by Student Group\s*\n"
        r"\s*Grades Five, Eight, and High School",
        r"State Priority: Other Pupil Outcomes",
    )
    return parse_caaspp_by_group_block(block, "CAASPP Science 2023-24")


# --- physical fitness ------------------------------------------------------

def parse_pft(text: str) -> dict[str, Any]:
    block = section(
        text,
        r"California Physical Fitness Test Results \(School Year 2023-24\)",
        r"Part C \(Engagement\) begins",
    )
    out: dict[str, Any] = {}
    for grade in ["5", "7", "9"]:
        pat = (rf"(?m)^\s*Grade {grade}\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*$")
        m = re.search(pat, block)
        fields = ["Aerobic Capacity", "Abdominal Strength and Endurance",
                  "Trunk Extensor and Strength and Flexibility",
                  "Upper Body Strength and Endurance", "Flexibility"]
        if m:
            for f, v in zip(fields, m.groups()):
                out[f"PFT Grade {grade} - {f}"] = v.strip() if v.strip() not in {"--", "N/A"} else None
        else:
            for f in fields:
                out[f"PFT Grade {grade} - {f}"] = None
    return out


# --- dropout / graduation / chronic absenteeism / suspensions -------------

def parse_dropout_grad(text: str) -> dict[str, Any]:
    block = section(
        text,
        r"Dropout Rate and Graduation Rate \(Four-Year Cohort Rate\)",
        r"Graduation Rate by Student Group",
    )
    flat = re.sub(r"\s+", " ", block)
    out: dict[str, Any] = {}
    # columns: school 21-22, 22-23, 23-24, district 21-22, 22-23, 23-24,
    # state 21-22, 22-23, 23-24. values may be blank (e.g. elementary schools).
    for label, key in [("Dropout Rate", "Dropout Rate"),
                       ("Graduation Rate", "Graduation Rate")]:
        # grab everything after the label until the next row/end.
        m = re.search(
            rf"{label}\s+((?:\S+\s+){{0,9}}?\S+?)(?=\s+(?:Dropout Rate|Graduation Rate|Note|Graduation Rate by Student|$))",
            flat,
        )
        vals: list[str] = []
        if m:
            vals = m.group(1).split()
        # pad to 9, left-padded with nones if the pdf omitted school columns.
        if len(vals) < 9:
            vals = [None] * (9 - len(vals)) + vals  # type: ignore[list-item]
        cols = [
            "School_21-22", "School_22-23", "School_23-24",
            "District_21-22", "District_22-23", "District_23-24",
            "State_21-22", "State_22-23", "State_23-24",
        ]
        for c, v in zip(cols, vals):
            out[f"{key}_{c}"] = to_num(v) if isinstance(v, str) else None
    return out


GRAD_CHRONIC_SUSP_GROUPS = [
    "All Students", "Female", "Male", "Non-Binary",
    "African American", "American Indian or Alaska Native",
    "Asian", "Filipino", "Hispanic or Latino", "Pacific Islander",
    "White (Not Hispanic)", "Two or More Races",
    "Socioeconomically Disadvantaged", "English Learners",
    "Students with Disabilities", "Foster Youth", "Homeless", "Migrant",
]


def parse_graduation_by_group(text: str) -> dict[str, Any]:
    block = section(
        text,
        r"Graduation Rate by Student Group \(Four-Year Cohort Rate\)\s*\n"
        r"\s*\(School Year 2023-2024\)",
        r"For information on the Four-Year Adjusted Cohort Graduation Rate",
    )
    out: dict[str, Any] = {}
    for g in GRAD_CHRONIC_SUSP_GROUPS:
        pat = rf"(?m)^\s*{re.escape(g)}\s+(\S+)\s+(\S+)\s+(\S+)\s*$"
        m = re.search(pat, block)
        if m:
            num_in, cohort_grads, rate = (to_num(x) for x in m.groups())
        else:
            num_in = cohort_grads = rate = None
        out[f"Grad {g} - Number of Students"] = num_in
        out[f"Grad {g} - Cohort Graduates"] = cohort_grads
        out[f"Grad {g} - Cohort Graduation Rate"] = rate
    return out


def parse_chronic_absenteeism(text: str) -> dict[str, Any]:
    block = section(
        text,
        r"Chronic Absenteeism by Student Group",
        r"State Priority: School Climate",
    )
    out: dict[str, Any] = {}
    for g in GRAD_CHRONIC_SUSP_GROUPS:
        pat = rf"(?m)^\s*{re.escape(g)}\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*$"
        m = re.search(pat, block)
        if m:
            cum, elig, count, rate = (to_num(x) for x in m.groups())
        else:
            cum = elig = count = rate = None
        out[f"Chronic Absence {g} - Cumulative Enrollment"] = cum
        out[f"Chronic Absence {g} - Eligible Enrollment"] = elig
        out[f"Chronic Absence {g} - Count"] = count
        out[f"Chronic Absence {g} - Rate"] = rate
    return out


def parse_safety_plan(text: str) -> dict[str, Any]:
    """The free-text 'School Safety Plan' description."""
    # the header line ends with a newline, then the description line begins
    # with a leading space (a layout artifact). match liberally on whitespace.
    block = section(
        text,
        r"School Safety Plan\s*-\s*Most Recent Year\s+"
        r"This section provides information about the school's comprehensive safety plan\.",
        r"Suspensions and Expulsions",
    )
    return {"School Safety Plan": clean_text(block)}


def parse_suspensions_expulsions(text: str) -> dict[str, Any]:
    """3-year suspension & expulsion rates at school / district / state level."""
    # the header is plain "suspensions and expulsions" followed by a
    # description paragraph. the by-group table comes later with its own header.
    block = section(
        text,
        r"Suspensions and Expulsions\b(?![^\n]*by Student Group)",
        r"Suspensions and Expulsions by Student Group",
    )
    flat = re.sub(r"\s+", " ", block)
    out: dict[str, Any] = {}
    for label, key in [("Suspensions", "Suspensions"), ("Expulsions", "Expulsions")]:
        # anchor on the row label followed by 9 space-separated tokens.
        # use negative lookbehind so we don't match inside "by student group".
        m = re.search(
            rf"\b{label}\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)",
            flat,
        )
        vals = [to_num(v) for v in m.groups()] if m else [None] * 9
        cols = [
            "School_21-22", "School_22-23", "School_23-24",
            "District_21-22", "District_22-23", "District_23-24",
            "State_21-22", "State_22-23", "State_23-24",
        ]
        for c, v in zip(cols, vals):
            out[f"{key}_{c}"] = v
    return out


def parse_suspensions_by_group(text: str) -> dict[str, Any]:
    block = section(
        text,
        r"Suspensions and Expulsions by Student Group",
        r"State Priority: Parental Involvement",
    )
    out: dict[str, Any] = {}
    for g in GRAD_CHRONIC_SUSP_GROUPS:
        pat = rf"(?m)^\s*{re.escape(g)}\s+(\S+)\s+(\S+)\s*$"
        m = re.search(pat, block)
        if m:
            s, e = (to_num(x) for x in m.groups())
        else:
            s = e = None
        # column names matching the user's variable list
        col_g = (g.replace(" (Not Hispanic)", "").replace(" ", "_")
                  .replace("-", "").replace("(", "").replace(")", ""))
        out[f"{col_g}_Suspensions_Rate"] = s
        out[f"{col_g}_Expulsions_Rate"] = e
    return out


def parse_parental_involvement(text: str) -> dict[str, Any]:
    block = section(
        text,
        r"Opportunities for Parental Involvement\s+"
        r"This section provides information about opportunities for parents[^\n]*",
        r"Section D \(Other SARC Information\) begins",
    )
    return {"Opportunities for Parental Involvement": clean_text(block)}


# --- class size (elementary) ----------------------------------------------

def _tokens_with_positions(line: str) -> list[tuple[int, str]]:
    """Split `line` on runs of 2+ spaces (which pdftotext -layout uses as
    column separators) and return a list of (start_col, token) pairs.
    Single spaces inside a token are preserved."""
    out: list[tuple[int, str]] = []
    for m in re.finditer(r"\S+(?:\s\S+)*", line):
        # this matches a 'token' that can contain single spaces but stops at
        # runs of 2+ spaces. finditer advances past any 2+ space runs.
        token = m.group(0)
        # only accept if the next char (if any) is a 2+ space run or eol —
        # which re.finditer already guarantees by construction. record start.
        out.append((m.start(), token))
    return out


def _assign_to_nearest(token_pos: int, headers: list[int]) -> int:
    """Return index of header whose column is closest to token_pos."""
    return min(range(len(headers)), key=lambda i: abs(headers[i] - token_pos))


def parse_class_size_elementary(text: str) -> dict[str, Any]:
    """Elementary class size table. For each grade row we have, in three
    side-by-side year blocks: Avg | #classrooms in 1-20 | 21-32 | 33+.

    Empty cells collapse in layout text, so ordinal token position can't tell
    us which column is empty. We detect the column positions from the header
    rows, then for each grade row we split into tokens with their start
    columns and assign each token to the nearest header column.
    """
    block = section(
        text,
        r"Average Class Size and Class Size Distribution \(Elementary\)",
        r"Average Class Size and Class Size Distribution \(Secondary\)",
    )
    out: dict[str, Any] = {}
    grades = ["K", "1", "2", "3", "4", "5", "6", "Other"]

    # pre-fill with none so missing grades / bad parses stay none.
    for g in grades:
        for year in ("2021-22", "2022-23", "2023-24"):
            out[f"Avg Class Size Grade {g} {year}"] = None
            for bucket in ("1-20", "21-32", "33+"):
                out[f"Class Size Dist Grade {g} {year} #{bucket}"] = None

    lines = block.splitlines()

    avg_header_line = next((ln for ln in lines if ln.count("Avg") >= 3), None)
    dist_header_line = next(
        (ln for ln in lines if "1-20" in ln and "21-32" in ln and "33+" in ln),
        None,
    )
    if avg_header_line is None or dist_header_line is None:
        return out

    # find three avg columns
    avg_cols: list[int] = []
    i = 0
    while True:
        j = avg_header_line.find("Avg", i)
        if j == -1:
            break
        avg_cols.append(j)
        i = j + 3

    def find_all(s: str, sub: str) -> list[int]:
        out_: list[int] = []
        i = 0
        while True:
            j = s.find(sub, i)
            if j == -1:
                break
            out_.append(j)
            i = j + len(sub)
        return out_

    c_1_20 = find_all(dist_header_line, "1-20")
    c_21_32 = find_all(dist_header_line, "21-32")
    c_33 = find_all(dist_header_line, "33+")

    if not (len(avg_cols) == 3 and len(c_1_20) == len(c_21_32) == len(c_33) == 3):
        return out

    # build flat list of the 12 target columns in left-to-right order.
    # each target stores a template key and the header column position.
    targets: list[tuple[str, int]] = []
    years = ["2021-22", "2022-23", "2023-24"]
    for y_idx, year in enumerate(years):
        targets.append((f"Avg Class Size Grade {{g}} {year}", avg_cols[y_idx]))
        targets.append((f"Class Size Dist Grade {{g}} {year} #1-20", c_1_20[y_idx]))
        targets.append((f"Class Size Dist Grade {{g}} {year} #21-32", c_21_32[y_idx]))
        targets.append((f"Class Size Dist Grade {{g}} {year} #33+", c_33[y_idx]))

    # compute each cell's center column. because headers are left-aligned but
    # values can be arbitrarily offset, nearest-header assignment is unstable
    # near cell boundaries. using cell centers (midpoint between this header
    # and the next header) and matching each token's center to the nearest
    # cell center is much more robust.
    cell_centers: list[float] = []
    for i, (_, col) in enumerate(targets):
        if i + 1 < len(targets):
            nxt = targets[i + 1][1]
            cell_centers.append((col + nxt) / 2)
        else:
            # last cell: mirror the gap of the previous cell
            prev_gap = targets[i][1] - targets[i - 1][1] if i > 0 else 10
            cell_centers.append(col + prev_gap / 2)

    for g in grades:
        row = None
        for line in lines:
            prefix = line[:10].strip()
            if prefix == g:
                row = line
                break
        if row is None:
            continue

        # tokenize the row after the grade label so the label isn't matched
        # to a data column. preserve original column positions.
        label_end = row.index(g) + len(g)
        padded = " " * label_end + row[label_end:]
        tokens = _tokens_with_positions(padded)
        num_tokens = [(pos, tok) for pos, tok in tokens
                      if re.fullmatch(r"[\d.]+", tok)]

        for pos, tok in num_tokens:
            token_center = pos + len(tok) / 2
            # assign to nearest cell center
            idx = min(range(len(cell_centers)),
                      key=lambda i: abs(cell_centers[i] - token_center))
            # safety: skip if the token is absurdly far from any cell center
            if abs(cell_centers[idx] - token_center) > 10:
                continue
            key = targets[idx][0].format(g=g)
            if out.get(key) is None:
                out[key] = to_num(tok)

    return out


def parse_class_size_secondary(text: str) -> dict[str, Any]:
    """Secondary class size: rows are subjects (English, Math, Science,
    Social Science) and columns are 3 years × (Avg Class Size + 1-22 + 23-32 + 33+).

    Same column-position approach as the elementary table — empty cells
    collapse in layout text, so we tokenize each row and assign each token
    to the nearest header column.
    """
    block = section(
        text,
        r"Average Class Size and Class Size Distribution \(Secondary\)",
        # end anchor: anything that comes after — try common follow-ons
        r"Academic Counselors and Other Support Staff",
    )
    out: dict[str, Any] = {}
    subjects = ["English", "Math", "Science", "Social Science"]
    years = ["2021-22", "2022-23", "2023-24"]
    buckets = ["1-22", "23-32", "33+"]

    # pre-fill with none.
    for s in subjects:
        for y in years:
            out[f"Avg Class Size {s} {y}"] = None
            for b in buckets:
                out[f"Class Size Dist {s} {y} #{b}"] = None

    if not block.strip():
        return out

    lines = block.splitlines()

    avg_header_line = next((ln for ln in lines if ln.count("Avg") >= 3), None)
    dist_header_line = next(
        (ln for ln in lines if "1-22" in ln and "23-32" in ln and "33+" in ln),
        None,
    )
    if avg_header_line is None or dist_header_line is None:
        return out

    avg_cols: list[int] = []
    i = 0
    while True:
        j = avg_header_line.find("Avg", i)
        if j == -1:
            break
        avg_cols.append(j)
        i = j + 3

    def find_all(s: str, sub: str) -> list[int]:
        out_: list[int] = []
        i_ = 0
        while True:
            j = s.find(sub, i_)
            if j == -1:
                break
            out_.append(j)
            i_ = j + len(sub)
        return out_

    c_1_22 = find_all(dist_header_line, "1-22")
    c_23_32 = find_all(dist_header_line, "23-32")
    c_33 = find_all(dist_header_line, "33+")
    if not (len(avg_cols) == 3 and len(c_1_22) == len(c_23_32) == len(c_33) == 3):
        return out

    targets: list[tuple[str, int]] = []
    for y_idx, y in enumerate(years):
        targets.append((f"Avg Class Size {{s}} {y}", avg_cols[y_idx]))
        targets.append((f"Class Size Dist {{s}} {y} #1-22", c_1_22[y_idx]))
        targets.append((f"Class Size Dist {{s}} {y} #23-32", c_23_32[y_idx]))
        targets.append((f"Class Size Dist {{s}} {y} #33+", c_33[y_idx]))

    cell_centers: list[float] = []
    for i, (_, col) in enumerate(targets):
        if i + 1 < len(targets):
            nxt = targets[i + 1][1]
            cell_centers.append((col + nxt) / 2)
        else:
            prev_gap = targets[i][1] - targets[i - 1][1] if i > 0 else 10
            cell_centers.append(col + prev_gap / 2)

    # subject labels: "english", "math", "science", "social science"
    # "social science" wraps to two lines:  "social\nscience". so for that
    # row, look for "social" on its own line as the row marker.
    subject_anchor = {
        "English": ("English", False),
        "Math": ("Math", False),
        "Science": ("Science", True),  # exclude "social\nscience" continuation
        "Social Science": ("Social", False),
    }
    for s in subjects:
        anchor, must_not_have_social_above = subject_anchor[s]
        row = None
        for li, line in enumerate(lines):
            stripped = line.lstrip()
            if not stripped.startswith(anchor):
                continue
            after = stripped[len(anchor):]
            if after and not after[0].isspace():
                continue  # avoid matching "sciences" against "science"
            if must_not_have_social_above and li > 0:
                prev = lines[li - 1].lstrip()
                if prev.startswith("Social") and not prev[6:7].isalpha():
                    continue
            row = line
            break
        if row is None:
            continue

        label_start = row.index(anchor)
        label_end = label_start + len(anchor)
        padded = " " * label_end + row[label_end:]
        tokens = _tokens_with_positions(padded)
        num_tokens = [(pos, tok) for pos, tok in tokens
                      if re.fullmatch(r"[\d.]+", tok)]

        # identify the avg token for each year:
        # - year 0's avg is the first token (closest to avg_cols[0]).
        # - for y > 0, the avg token is the first 2-digit token whose
        #   position is at-or-after avg_cols[y] (with small left tolerance).
        #   this avoids picking up 1-digit bucket counts (typically 0-9)
        #   that drift past avg_cols[y] from the previous year — actual
        #   avg values are class sizes (10-50, always 2 digits).
        avg_token_indices: list[int | None] = [None, None, None]
        if num_tokens:
            avg_token_indices[0] = 0  # first token is always year 0 avg

            for yi in range(1, 3):
                target_col = avg_cols[yi]
                tolerance_left = 5
                # search for first 2-digit token at or near target_col
                best_idx = None
                # start search after previous avg token (if any)
                start_search = (avg_token_indices[yi - 1] or 0) + 1
                for ti in range(start_search, len(num_tokens)):
                    pos, tok = num_tokens[ti]
                    if pos < target_col - tolerance_left:
                        continue
                    # prefer 2-digit (or 3-digit) numeric tokens for avg
                    if len(tok) >= 2 and "." not in tok:
                        best_idx = ti
                        break
                # fallback: if no 2-digit token found, take the closest token
                # to target_col regardless of digit-count.
                if best_idx is None:
                    candidates = [
                        (ti, abs(num_tokens[ti][0] - target_col))
                        for ti in range(start_search, len(num_tokens))
                    ]
                    if candidates:
                        best_idx = min(candidates, key=lambda x: x[1])[0]
                avg_token_indices[yi] = best_idx

        # build segments using the identified avg tokens as boundaries.
        segments_indexed: list[list[tuple[int, str]]] = [[], [], []]
        for ti, (pos, tok) in enumerate(num_tokens):
            yi = 0
            for j in range(2, -1, -1):
                aj = avg_token_indices[j]
                if aj is not None and ti >= aj:
                    yi = j
                    break
            segments_indexed[yi].append((pos, tok))

        # now within each segment: first token is avg, rest are buckets.
        for yi in range(3):
            year = years[yi]
            segment = segments_indexed[yi]
            if not segment:
                continue

            avg_token = segment[0]
            bucket_tokens = segment[1:]

            key = f"Avg Class Size {s} {year}"
            if out.get(key) is None:
                out[key] = to_num(avg_token[1])

            bucket_header_cols = [c_1_22[yi], c_23_32[yi], c_33[yi]]
            bucket_keys = [
                f"Class Size Dist {s} {year} #1-22",
                f"Class Size Dist {s} {year} #23-32",
                f"Class Size Dist {s} {year} #33+",
            ]

            n = len(bucket_tokens)
            assigned: list[tuple[str, str]] = []

            if n >= 3:
                assigned = [(bucket_keys[i], bucket_tokens[i][1]) for i in range(3)]
            elif n == 2:
                pos1, pos2 = bucket_tokens[0][0], bucket_tokens[1][0]
                idx1 = min(range(3), key=lambda i: abs(bucket_header_cols[i] - pos1))
                idx2 = min(range(3), key=lambda i: abs(bucket_header_cols[i] - pos2))
                if idx1 != idx2 and idx1 < idx2:
                    assigned = [
                        (bucket_keys[idx1], bucket_tokens[0][1]),
                        (bucket_keys[idx2], bucket_tokens[1][1]),
                    ]
                else:
                    if pos1 > bucket_header_cols[0] + 5:
                        assigned = [
                            (bucket_keys[1], bucket_tokens[0][1]),
                            (bucket_keys[2], bucket_tokens[1][1]),
                        ]
                    else:
                        assigned = [
                            (bucket_keys[0], bucket_tokens[0][1]),
                            (bucket_keys[1], bucket_tokens[1][1]),
                        ]
            elif n == 1:
                pos = bucket_tokens[0][0]
                idx = min(range(3), key=lambda i: abs(bucket_header_cols[i] - pos))
                assigned = [(bucket_keys[idx], bucket_tokens[0][1])]

            for k, v in assigned:
                if out.get(k) is None:
                    out[k] = to_num(v)

    return out




# --- counselors / support staff -------------------------------------------

def parse_counselors(text: str) -> dict[str, Any]:
    """Academic Counselors ratio + the 9-row support staff FTE table.

    The Counselor row's label "Counselor (Academic, Social/Behavioral or
    Career Development)" wraps across two lines, with the FTE value (if
    present) appearing on the SAME line as the FIRST line of the label
    ("Counselor (Academic, Social/Behavioral or Career"), NOT after the
    closing "Development)". So we anchor on the first line.

    All other labels are single-line: their FTE value appears on the same
    line, OR is absent (in which case the next line starts a new row).
    """
    out: dict[str, Any] = {}
    m = re.search(r"Academic Counselors\s+([\d.]+|----)", text)
    out["Academic Counselors - Ratio"] = to_num(m.group(1)) if m else None

    block = section(
        text,
        r"Academic Counselors and Other Support Staff",
        r"Expenditures Per Pupil and School Site Teacher Salaries",
    )

    # for each row, anchor on label and extract a number that sits on the
    # same line as the label start (not after a newline). that way:
    #  - "counselor (academic, social/behavioral or career    0.7" matches 0.7
    #  - "library media teacher (librarian)    1.0" matches 1.0
    #  - "psychologist\n   social worker  2.0\n" — psychologist matches no
    #    digits on its line, so stays none (correct: empty cell).
    #
    # we use [^\n]* between label and number to constrain to one line.
    titles = [
        # use the first portion of the wrapped counselor label; the value
        # appears on this same line.
        (r"Counselor \(Academic, Social/Behavioral or Career",
         "Counselor (Academic/Social/Career) FTE"),
        (r"Library Media Teacher \(Librarian\)",
         "Library Media Teacher FTE"),
        (r"Library Media Services Staff \(Paraprofessional\)",
         "Library Media Services Staff FTE"),
        (r"Psychologist", "Psychologist FTE"),
        (r"Social Worker", "Social Worker FTE"),
        (r"Nurse", "Nurse FTE"),
        (r"Speech/Language/Hearing Specialist",
         "Speech/Language/Hearing Specialist FTE"),
        (r"Resource Specialist \(non-teaching\)", "Resource Specialist FTE"),
        # "other" appears as its own row near the bottom of the table.
        # anchor specifically by leading whitespace + other + trailing whitespace
        # to avoid matching "other" inside e.g. "other support staff".
        (r"(?m)^\s*Other\s", "Other Support Staff FTE"),
    ]
    for label_re, col in titles:
        # match label, then any non-newline chars, then a number, then end
        # of line. the number is the fte value (if present on this line).
        m = re.search(label_re + r"[^\n]*?\s([\d.]+)\s*$",
                      block, flags=re.MULTILINE)
        out[col] = to_num(m.group(1)) if m else None
    return out


# --- expenditures & salaries ----------------------------------------------

def parse_expenditures(text: str) -> dict[str, Any]:
    """Expenditures Per Pupil and School Site Teacher Salaries.

    The 5-row table has these rows (4 columns each):
      - School Site            $Total  $Restricted  $Unrestricted  $Salary
      - District               ----    ----         $Unrestricted  $Salary
      - Percent Difference - School Site and District   ---- ----  N%   N%
      - State                  ----    ----         $Unrestricted  $Salary
      - Percent Difference - School Site and State      ---- ----  N%   N%
    """
    block = section(
        text,
        r"Expenditures Per Pupil and School Site Teacher Salaries",
        r"Types of Services Funded",
    )
    flat = re.sub(r"\s+", " ", block)
    out: dict[str, Any] = {}

    # school site: 4 dollar figures
    m = re.search(
        r"School Site\s+\$([\d,\.]+)\s+\$([\d,\.]+)\s+\$([\d,\.]+)\s+\$([\d,\.]+)",
        flat,
    )
    cols = ["Total Exp/Pupil", "Exp/Pupil (Restricted)",
            "Exp/Pupil (Unrestricted)", "Average Teacher Salary"]
    if m:
        for c, v in zip(cols, m.groups()):
            out[f"School {c}"] = to_num(v)
    else:
        for c in cols:
            out[f"School {c}"] = None

    # district: "district   ----    ----    $8,211   $89,317"
    # capture all 4 columns (first two may be dashes).
    m = re.search(
        r"\bDistrict\b\s+(\S+)\s+(\S+)\s+\$?([\d,\.]+)\s+\$?([\d,\.]+)",
        flat,
    )
    if m:
        out["District Total Exp/Pupil"] = to_num(m.group(1))
        out["District Exp/Pupil (Restricted)"] = to_num(m.group(2))
        out["District Exp/Pupil (Unrestricted)"] = to_num(m.group(3))
        out["District Average Teacher Salary"] = to_num(m.group(4))
    else:
        out["District Total Exp/Pupil"] = None
        out["District Exp/Pupil (Restricted)"] = None
        out["District Exp/Pupil (Unrestricted)"] = None
        out["District Average Teacher Salary"] = None

    # percent difference - school site and district:
    # "---- ---- 0% 0%"
    m = re.search(
        r"Percent Difference\s*[-\u2013\u2014]\s*School Site and District"
        r"\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)",
        flat,
    )
    if m:
        out["Pct Diff School-District: Total Exp/Pupil"] = to_num(m.group(1))
        out["Pct Diff School-District: Exp/Pupil (Restricted)"] = to_num(m.group(2))
        out["Pct Diff School-District: Exp/Pupil (Unrestricted)"] = to_num(m.group(3))
        out["Pct Diff School-District: Average Teacher Salary"] = to_num(m.group(4))
    else:
        for c in cols:
            out[f"Pct Diff School-District: {c}"] = None

    # state row: 4 columns (first two are dashes typically)
    m = re.search(
        r"\bState\b\s+(\S+)\s+(\S+)\s+\$?([\d,\.]+)\s+\$?([\d,\.]+)",
        flat,
    )
    if m:
        out["State Total Exp/Pupil"] = to_num(m.group(1))
        out["State Exp/Pupil (Restricted)"] = to_num(m.group(2))
        out["State Exp/Pupil (Unrestricted)"] = to_num(m.group(3))
        out["State Average Teacher Salary"] = to_num(m.group(4))
    else:
        out["State Total Exp/Pupil"] = None
        out["State Exp/Pupil (Restricted)"] = None
        out["State Exp/Pupil (Unrestricted)"] = None
        out["State Average Teacher Salary"] = None

    # percent difference - school site and state
    m = re.search(
        r"Percent Difference\s*[-\u2013\u2014]\s*School Site and State"
        r"\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)",
        flat,
    )
    if m:
        out["Pct Diff School-State: Total Exp/Pupil"] = to_num(m.group(1))
        out["Pct Diff School-State: Exp/Pupil (Restricted)"] = to_num(m.group(2))
        out["Pct Diff School-State: Exp/Pupil (Unrestricted)"] = to_num(m.group(3))
        out["Pct Diff School-State: Average Teacher Salary"] = to_num(m.group(4))
    else:
        for c in cols:
            out[f"Pct Diff School-State: {c}"] = None

    return out


def parse_services_funded(text: str) -> dict[str, Any]:
    """The free-text 'Types of Services Funded (Fiscal Year 2023-24)' narrative."""
    block = section(
        text,
        r"Types of Services Funded \(Fiscal Year[^)]+\)\s+"
        r"This section provides information about the programs and supplemental services\s+"
        r"that are available at the school\s+"
        r"and funded through either categorical or other sources\.",
        r"Teacher and Administrative Salaries",
    )
    return {"Types of Services Funded": clean_text(block)}



def parse_salaries(text: str) -> dict[str, Any]:
    block = section(
        text, r"Teacher and Administrative Salaries",
        r"Advanced Placement Courses",
    )
    out: dict[str, Any] = {}
    rows = [
        ("Beginning Teacher Salary", "Beginning Teacher Salary"),
        ("Mid-Range Teacher Salary", "Mid-Range Teacher Salary"),
        ("Highest Teacher Salary", "Highest Teacher Salary"),
        ("Average Principal Salary \\(Elementary\\)", "Average Principal Salary (Elementary)"),
        ("Average Principal Salary \\(Middle\\)", "Average Principal Salary (Middle)"),
        ("Average Principal Salary \\(High\\)", "Average Principal Salary (High)"),
        ("Superintendent Salary", "Superintendent Salary"),
        ("Percent of Budget for Teacher Salaries", "Percent of Budget for Teacher Salaries"),
        ("Percent of Budget for Administrative Salaries", "Percent of Budget for Administrative Salaries"),
    ]
    for label_re, col in rows:
        m = re.search(rf"{label_re}\s+([\d,\.]+)\s+([\d,\.]+)", block)
        d, s = (None, None)
        if m:
            d, s = to_num(m.group(1)), to_num(m.group(2))
        out[f"{col} - District Amount"] = d
        out[f"{col} - State Average"] = s
    return out


def parse_ap_courses(text: str) -> dict[str, Any]:
    block = section(text, r"Advanced Placement Courses", r"Professional Development")
    out: dict[str, Any] = {}
    subjects = ["Computer Science", "English", "Fine and Performing Arts",
                "Foreign Language", "Mathematics", "Science", "Social Science",
                "All Courses"]
    for s in subjects:
        pat = rf"(?m)^\s*{re.escape(s)}\s+(\S+)(?:\s+(\S+))?\s*$"
        m = re.search(pat, block)
        if m:
            out[f"AP {s} - Number Offered"] = to_num(m.group(1))
            out[f"AP {s} - Percent Students"] = to_num(m.group(2)) if m.group(2) else None
        else:
            out[f"AP {s} - Number Offered"] = None
            out[f"AP {s} - Percent Students"] = None
    return out


# ---------------------------------------------------------------------------
# orchestration
# ---------------------------------------------------------------------------

def scrape_one(pdf_path: Path) -> dict[str, Any]:
    text = pdf_to_layout_text(pdf_path)
    row: dict[str, Any] = {"_source_file": pdf_path.name}
    # each parser returns a flat dict; order preserves the variable list order.
    parsers = [
        parse_header,
        parse_mission,
        parse_enrollment_by_grade,
        parse_enrollment_by_group,
        parse_teacher_prep_all_years,
        parse_ineffective_table,
        parse_out_of_field_table,
        parse_class_assignments_table,
        parse_facility_status,
        parse_facility_improvements,
        parse_caaspp_summary,
        parse_caaspp_ela_by_group,
        parse_caaspp_math_by_group,
        parse_science_summary,
        parse_caaspp_science_by_group,
        parse_pft,
        parse_dropout_grad,
        parse_graduation_by_group,
        parse_chronic_absenteeism,
        parse_safety_plan,
        parse_suspensions_expulsions,
        parse_suspensions_by_group,
        parse_parental_involvement,
        parse_class_size_elementary,
        parse_class_size_secondary,
        parse_counselors,
        parse_expenditures,
        parse_services_funded,
        parse_salaries,
        parse_ap_courses,
    ]
    for p in parsers:
        try:
            row.update(p(text))
        except Exception as exc:  # don't let one bad section kill the row
            row[f"_error_{p.__name__}"] = f"{type(exc).__name__}: {exc}"
    return row


def scrape_folder(folder: Path) -> pd.DataFrame:
    pdfs = sorted(folder.glob("*.pdf"))
    rows = [scrape_one(p) for p in pdfs]
    return pd.DataFrame(rows)


def main() -> int:
    ap = argparse.ArgumentParser(description="Scrape SFUSD SARC PDFs into a CSV.")
    ap.add_argument("input", help="PDF file, or folder containing PDFs")
    ap.add_argument("-o", "--output", default="sarc_scraped.csv",
                    help="Output CSV path (default: sarc_scraped.csv)")
    args = ap.parse_args()

    path = Path(args.input)
    if path.is_dir():
        df = scrape_folder(path)
    else:
        df = pd.DataFrame([scrape_one(path)])

    df.to_csv(args.output, index=False)
    print(f"Wrote {len(df)} row(s), {len(df.columns)} columns to {args.output}",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
