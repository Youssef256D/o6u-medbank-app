import re

css_path = "/Users/youssefayoub/Documents/Apps/MCQs Website/styles.css"

with open(css_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove legacy course card block (lines 9940 to 10257 in the original file)
# The block starts with .course-card { and ends with .course-card-empty-content { opacity: 0.85; }
legacy_pattern = r"\.course-card\s*\{[^}]+?\}(?:\s*/\*.*?\*/|\s*\.[a-zA-Z0-9_-]+(?:\s+body)?.*?\{[^}]+?\})*?\s*\.course-card-empty-content\s*\{\s*opacity:\s*0\.85;\s*\}"

# Let's do a direct exact string replacement for the entire legacy block from `.course-card {` to the end of `.course-card-empty-content` rule to be 100% safe
legacy_start = ".course-card {"
legacy_end = """.course-card-actions .course-card-primary {
  font-size: 0.82rem;
  font-weight: 700;
  min-height: 34px;
}

.course-card-empty-content {
  opacity: 0.85;
}"""

idx_start = content.find(legacy_start)
idx_end = content.find(legacy_end)

if idx_start != -1 and idx_end != -1:
    end_pos = idx_end + len(legacy_end)
    content = content[:idx_start] + "/* Legacy course card styles removed */" + content[end_pos:]
    print("Successfully removed legacy course card styles block!")
else:
    print("Could not find exact positions of legacy course card styles block:", idx_start, idx_end)

# 2. Remove legacy dark mode overrides
dark_legacy = """/* Course Cards Facts Icon */
body.theme-dark .course-card-facts svg {
  color: #48cae4;
}

/* Course Card Badges */
body.theme-dark .course-card-badge-year {
  background: rgba(23, 126, 137, 0.15);
  color: #48cae4;
  border-color: rgba(23, 126, 137, 0.3);
}
body.theme-dark .course-card-badge-completed {
  background: rgba(46, 125, 50, 0.18);
  color: #4ade80;
  border-color: rgba(46, 125, 50, 0.35);
}
body.theme-dark .course-card-badge-in_progress {
  background: rgba(184, 134, 11, 0.18);
  color: #fdd835;
  border-color: rgba(184, 134, 11, 0.35);
}
body.theme-dark .course-card-badge-not_started {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border-color: rgba(59, 130, 246, 0.3);
}
body.theme-dark .course-card-badge-request {
  background: rgba(230, 81, 0, 0.15);
  color: #ff9800;
  border-color: rgba(230, 81, 0, 0.3);
}
body.theme-dark .course-card-badge-open {
  background: rgba(46, 125, 50, 0.18);
  color: #4ade80;
  border-color: rgba(46, 125, 50, 0.3);
}

/* Course Primary Action Buttons in Dark Mode */
body.theme-dark .course-card-primary {
  background: linear-gradient(180deg, #177e89 0%, #11555d 100%) !important;
  border-color: rgba(23, 126, 137, 0.3) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 10px rgba(23, 126, 137, 0.25) !important;
}
body.theme-dark .course-card-primary:hover {
  background: linear-gradient(180deg, #1f9fae 0%, #177e89 100%) !important;
  box-shadow: 0 6px 14px rgba(23, 126, 137, 0.35) !important;
}

/* Progress bar gradient in dark mode */
body.theme-dark .course-progress-track span {
  background: linear-gradient(90deg, #177e89, #48cae4);
}

/* Cover Image Fallback Gradient in Dark Mode */
body.theme-dark .course-card-cover {
  background: linear-gradient(135deg, rgba(23, 126, 137, 0.2) 0%, rgba(62, 83, 168, 0.15) 100%);
}

/* Glassmorphism Cards in Dark Mode */
body.theme-dark .course-card,
body.theme-dark .courses-page-stat,
body.theme-dark .courses-toolbar-card {
  background: rgba(22, 22, 22, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}"""

if dark_legacy in content:
    content = content.replace(dark_legacy, "/* Obsolete theme-dark overrides removed */")
    print("Successfully removed theme-dark overrides!")
else:
    # Try with single newlines if copy-paste has CRLF
    normalized_dark = dark_legacy.replace("\r\n", "\n").replace("\n", "\r\n")
    if normalized_dark in content:
        content = content.replace(normalized_dark, "/* Obsolete theme-dark overrides removed */")
        print("Successfully removed theme-dark overrides (with CRLF)!")
    else:
        print("Could not find theme-dark legacy block exactly.")

# 3. Remove legacy comfort mode overrides
comfort_legacy = """/* Course Cards Facts Icon */
body.theme-comfort .course-card-facts svg {
  color: var(--brand);
}

/* Course Card Badges */
body.theme-comfort .course-card-badge-year {
  background: rgba(118, 86, 63, 0.12);
  color: #76563f;
  border-color: rgba(118, 86, 63, 0.25);
}
body.theme-comfort .course-card-badge-completed {
  background: rgba(56, 142, 60, 0.12);
  color: #2e7d32;
  border-color: rgba(56, 142, 60, 0.25);
}
body.theme-comfort .course-card-badge-in_progress {
  background: rgba(184, 134, 11, 0.12);
  color: #b8860b;
  border-color: rgba(184, 134, 11, 0.25);
}
body.theme-comfort .course-card-badge-not_started {
  background: rgba(26, 115, 232, 0.1);
  color: #1a73e8;
  border-color: rgba(26, 115, 232, 0.2);
}
body.theme-comfort .course-card-badge-request {
  background: rgba(230, 81, 0, 0.1);
  color: #e65100;
  border-color: rgba(230, 81, 0, 0.25);
}
body.theme-comfort .course-card-badge-open {
  background: rgba(56, 142, 60, 0.12);
  color: #2e7d32;
  border-color: rgba(56, 142, 60, 0.25);
}

/* Course Primary Action Buttons in Comfort Mode */
body.theme-comfort .course-card-primary {
  background: linear-gradient(180deg, #7b5b43 0%, #5d4330 100%) !important;
  border-color: rgba(93, 67, 48, 0.3) !important;
  color: #f7efe5 !important;
  box-shadow: 0 4px 10px rgba(118, 86, 63, 0.2) !important;
}
body.theme-comfort .course-card-primary:hover {
  background: linear-gradient(180deg, #8c684d 0%, #6e4e37 100%) !important;
  box-shadow: 0 6px 14px rgba(118, 86, 63, 0.3) !important;
}

/* Progress bar gradient in comfort mode */
body.theme-comfort .course-progress-track span {
  background: linear-gradient(90deg, #76563f, #f4a259);
}

/* Cover Image Fallback Gradient in Comfort Mode */
body.theme-comfort .course-card-cover {
  background: linear-gradient(135deg, rgba(118, 86, 63, 0.18) 0%, rgba(184, 134, 11, 0.12) 100%);
}

/* Glassmorphism Cards in Comfort Mode */
body.theme-comfort .course-card,
body.theme-comfort .courses-page-stat,
body.theme-comfort .courses-toolbar-card {
  background: rgba(240, 236, 227, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(105, 81, 61, 0.18);
}"""

if comfort_legacy in content:
    content = content.replace(comfort_legacy, "/* Obsolete theme-comfort overrides removed */")
    print("Successfully removed theme-comfort overrides!")
else:
    normalized_comfort = comfort_legacy.replace("\r\n", "\n").replace("\n", "\r\n")
    if normalized_comfort in content:
        content = content.replace(normalized_comfort, "/* Obsolete theme-comfort overrides removed */")
        print("Successfully removed theme-comfort overrides (with CRLF)!")
    else:
        print("Could not find theme-comfort legacy block exactly.")

# 4. Now let's fix the progress bar layout & alignments in the redesigned section
# Let's search for the redesigned classes and ensure stretch alignment
body_stretch = """.course-card-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  flex-grow: 1;
  align-items: stretch !important;
}"""

content = content.replace(".course-card-body {\n  padding: 1.25rem;\n  display: flex;\n  flex-direction: column;\n  gap: 0.85rem;\n  flex-grow: 1;\n}", body_stretch)
content = content.replace(".course-card-body {\r\n  padding: 1.25rem;\r\n  display: flex;\r\n  flex-direction: column;\r\n  gap: 0.85rem;\r\n  flex-grow: 1;\r\n}", body_stretch)

footer_stretch = """.course-card-footer {
  margin-top: auto;
  padding-top: 0.25rem;
  border-top: none;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  align-items: stretch !important;
  justify-content: flex-start !important;
  width: 100% !important;
}"""

content = content.replace(".course-card-footer {\n  margin-top: auto;\n  padding-top: 0.25rem;\n  border-top: none;\n  display: flex;\n  flex-direction: column;\n  gap: 0.85rem;\n}", footer_stretch)
content = content.replace(".course-card-footer {\r\n  margin-top: auto;\r\n  padding-top: 0.25rem;\r\n  border-top: none;\r\n  display: flex;\r\n  flex-direction: column;\r\n  gap: 0.85rem;\r\n}", footer_stretch)

facts_stretch = """.course-card-facts-row {
  display: flex;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 0.5rem;
  margin-bottom: 0.05rem;
  width: 100% !important;
  flex-direction: row !important;
}"""

content = content.replace(".course-card-facts-row {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-bottom: 0.05rem;\n}", facts_stretch)
content = content.replace(".course-card-facts-row {\r\n  display: flex;\r\n  align-items: center;\r\n  gap: 0.5rem;\r\n  margin-bottom: 0.05rem;\r\n}", facts_stretch)

progress_stretch = """/* Redesigned Progress Bar Box */
.course-progress-container {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.35rem;
  margin: 0.1rem 0;
  width: 100% !important;
  align-items: stretch !important;
}

.course-progress-info {
  display: flex !important;
  flex-direction: row !important;
  justify-content: space-between !important;
  align-items: center !important;
  width: 100% !important;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.course-progress-val {
  color: var(--brand);
}

.course-progress-track {
  height: 6px;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(72, 101, 129, 0.07);
  position: relative;
  margin-top: 0;
  width: 100% !important;
}"""

content = content.replace("""/* Redesigned Progress Bar Box */
.course-progress-container {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0.1rem 0;
}

.course-progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.course-progress-val {
  color: var(--brand);
}

.course-progress-track {
  height: 6px;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(72, 101, 129, 0.07);
  position: relative;
  margin-top: 0;
}""", progress_stretch)

# 5. Fix course-card-last aligning
content = content.replace(""".course-card-last {
  font-size: 0.74rem;
  color: var(--brand-strong);
  background: var(--brand-soft);
  padding: 0.4rem 0.65rem;
  border-radius: 8px;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  font-weight: 600;
  margin-top: 0.1rem;
}""", """.course-card-last {
  font-size: 0.74rem;
  color: var(--brand-strong);
  background: var(--brand-soft);
  padding: 0.4rem 0.65rem;
  border-radius: 8px;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  font-weight: 600;
  margin-top: 0.1rem;
  align-self: flex-start !important;
  max-width: 100%;
}""")

# 6. Fix course-card-badges alignment
content = content.replace(""".course-card-badges {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-top: 0.1rem;
}""", """.course-card-badges {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-top: 0.1rem;
  width: 100% !important;
  justify-content: flex-start !important;
  align-items: center !important;
}""")

with open(css_path, "w", encoding="utf-8") as f:
    f.write(content)

print("CSS cleanup script finished execution.")
