#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script sinh file Word (.docx) chuẩn hóa cho BÁO CÁO TỔNG HỢP 4 SPRINT BẢO VỆ ĐỒ ÁN OJT GREENPHONE.
Hỗ trợ đầy đủ:
- Tiêu đề lớn, Phụ đề
- Tiêu đề mục (Heading 1, 2, 3)
- Bảng Markdown chuẩn (| col1 | col2 | ...) thành bảng Word chuyên nghiệp có màu header #1F497D, hàng xen kẽ #DCE6F1
- Danh sách có thứ tự, không thứ tự
- Định dạng in đậm, mã lệnh, Times New Roman chuẩn mực
- 100% Tiếng Việt có dấu, tuyệt đối không dùng emoji/icon
"""

import sys
import os
import re
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

BLUE_DARK = RGBColor(0x1F, 0x49, 0x7D)   # Tiêu đề lớn & Header bảng
GRAY_DARK = RGBColor(0x59, 0x59, 0x59)   # Phụ đề
BLUE_SECT = RGBColor(0x1F, 0x49, 0x7D)   # Tiêu đề mục lớn
BLACK     = RGBColor(0x00, 0x00, 0x00)   # Văn bản thường
FONT_MAIN = "Times New Roman"
FONT_CODE = "Courier New"


def create_document():
    doc = Document()
    for section in doc.sections:
        section.top_margin    = Cm(2.0)
        section.bottom_margin = Cm(2.0)
        section.left_margin   = Cm(2.5)
        section.right_margin  = Cm(2.0)
    style = doc.styles['Normal']
    style.font.name = FONT_MAIN
    style.font.size = Pt(11)
    return doc


def add_formatted_runs(paragraph, text, default_size=Pt(11), default_color=BLACK, default_font=FONT_MAIN):
    tokens = re.split(r'(\*\*[^*]+\*\*|`[^`]+`)', text)
    for token in tokens:
        if not token:
            continue
        if token.startswith('**') and token.endswith('**'):
            run = paragraph.add_run(token[2:-2])
            run.bold = True
            run.font.name = default_font
            run.font.size = default_size
            run.font.color.rgb = default_color
        elif token.startswith('`') and token.endswith('`'):
            run = paragraph.add_run(token[1:-1])
            run.font.name = FONT_CODE
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(0x1F, 0x49, 0x7D)
        else:
            run = paragraph.add_run(token)
            run.font.name = default_font
            run.font.size = default_size
            run.font.color.rgb = default_color


def add_title(doc, title_text, subtitle_text=""):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)

    r1 = p.add_run(title_text.strip() + "\n")
    r1.bold = True
    r1.font.size = Pt(18)
    r1.font.color.rgb = BLUE_DARK
    r1.font.name = FONT_MAIN

    if subtitle_text:
        r2 = p.add_run(subtitle_text.strip())
        r2.bold = True
        r2.font.size = Pt(12)
        r2.font.color.rgb = GRAY_DARK
        r2.font.name = FONT_MAIN

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(0)
    p_sp.paragraph_format.space_after = Pt(4)


def add_heading_1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text.strip())
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = BLUE_SECT
    r.font.name = FONT_MAIN


def add_heading_2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text.strip())
    r.bold = True
    r.font.size = Pt(11.5)
    r.font.color.rgb = RGBColor(0x2E, 0x5B, 0x82)
    r.font.name = FONT_MAIN


def add_heading_3(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text.strip())
    r.bold = True
    r.font.size = Pt(11)
    r.font.color.rgb = BLACK
    r.font.name = FONT_MAIN


def add_body(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    add_formatted_runs(p, text.strip())


def add_bullet(doc, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    add_formatted_runs(p, text.strip())


def add_table_data(doc, headers, rows):
    num_cols = len(headers)
    table = doc.add_table(rows=1 + len(rows), cols=num_cols)
    table.style = 'Table Grid'

    # Header
    hdr = table.rows[0]
    for j, h in enumerate(headers):
        c = hdr.cells[j]
        c._element.get_or_add_tcPr()
        shd = OxmlElement('w:shd')
        shd.set(qn('w:fill'), '1F497D')
        shd.set(qn('w:color'), 'auto')
        shd.set(qn('w:val'), 'clear')
        c._element.tcPr.append(shd)

        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(3)
        r = p.add_run(h.strip())
        r.bold = True
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        r.font.name = FONT_MAIN
        r.font.size = Pt(10)

    # Data rows
    for i, row in enumerate(rows):
        tr = table.rows[i + 1]
        fill = 'DCE6F1' if i % 2 == 0 else 'FFFFFF'
        for j, cell_text in enumerate(row):
            if j < len(tr.cells):
                c = tr.cells[j]
                c._element.get_or_add_tcPr()
                shd = OxmlElement('w:shd')
                shd.set(qn('w:fill'), fill)
                shd.set(qn('w:color'), 'auto')
                shd.set(qn('w:val'), 'clear')
                c._element.tcPr.append(shd)

                p = c.paragraphs[0]
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                # Căn giữa nếu là số thứ tự hoặc số ngắn
                val = cell_text.strip()
                if re.match(r'^\d+$', val) or val in ['Apple', 'Samsung', 'Xiaomi', 'OPPO', 'Realme', 'Vivo']:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                add_formatted_runs(p, val, default_size=Pt(9.5))

    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(2)
    p_after.paragraph_format.space_after = Pt(4)


def parse_and_convert(md_path, docx_path):
    with open(md_path, "r", encoding="utf-8") as f:
        lines = [line.rstrip() for line in f.readlines()]

    doc = create_document()
    n = len(lines)
    i = 0

    title_text = ""
    subtitle_text = ""

    # 1. Trích xuất Title & Subtitle nếu bắt đầu bằng # và ##
    while i < n and not title_text:
        line = lines[i].strip()
        if line.startswith("# "):
            title_text = line[2:].strip()
            i += 1
            if i < n and lines[i].strip().startswith("## "):
                subtitle_text = lines[i].strip()[3:].strip()
                i += 1
            break
        i += 1

    if title_text:
        add_title(doc, title_text, subtitle_text)

    while i < n:
        line = lines[i]
        stripped = line.strip()

        if not stripped or stripped == "---":
            i += 1
            continue

        # Kiểm tra bảng Markdown: dòng có chứa | và tiếp theo là |---|
        if stripped.startswith("|") and stripped.endswith("|"):
            # Thu thập toàn bộ dòng của bảng
            table_lines = [stripped]
            i += 1
            while i < n and lines[i].strip().startswith("|") and lines[i].strip().endswith("|"):
                table_lines.append(lines[i].strip())
                i += 1

            if len(table_lines) >= 3 and re.search(r'\|:?-+:?\|', table_lines[1]):
                # Parse headers
                raw_headers = [c.strip() for c in table_lines[0].strip('|').split('|')]
                raw_rows = []
                for row_line in table_lines[2:]:
                    cells = [c.strip() for c in row_line.strip('|').split('|')]
                    raw_rows.append(cells)
                add_table_data(doc, raw_headers, raw_rows)
            continue

        # Headings
        if stripped.startswith("### "):
            add_heading_1(doc, stripped[4:].strip())
            i += 1
            continue
        if stripped.startswith("#### "):
            add_heading_2(doc, stripped[5:].strip())
            i += 1
            continue
        if stripped.startswith("##### "):
            add_heading_3(doc, stripped[6:].strip())
            i += 1
            continue
        if stripped.startswith("## "):
            add_heading_1(doc, stripped[3:].strip())
            i += 1
            continue
        if stripped.startswith("# "):
            add_heading_1(doc, stripped[2:].strip())
            i += 1
            continue

        # Sub-heading theo kiểu a), b) hoặc Bước 1...
        if re.match(r'^[a-z]\)\s+', stripped) or stripped.startswith("Bước "):
            add_heading_3(doc, stripped)
            i += 1
            continue

        # Bullets
        if stripped.startswith("- ") or stripped.startswith("* ") or stripped.startswith("• "):
            bullet_text = stripped[2:].strip()
            add_bullet(doc, bullet_text)
            i += 1
            continue

        # Q&A item
        if re.match(r'^Q\d+:\s+', stripped):
            q_text = stripped
            a_text = ""
            if i + 1 < n and ("Trả lời:" in lines[i + 1] or "➔" in lines[i + 1]):
                a_text = lines[i + 1].strip()
                i += 2
            else:
                i += 1
            p_q = doc.add_paragraph()
            p_q.paragraph_format.space_before = Pt(6)
            p_q.paragraph_format.space_after = Pt(1)
            p_q.paragraph_format.keep_with_next = True
            r_q = p_q.add_run(q_text)
            r_q.bold = True
            r_q.font.color.rgb = BLUE_DARK
            r_q.font.name = FONT_MAIN
            r_q.font.size = Pt(11)

            if a_text:
                p_a = doc.add_paragraph()
                p_a.paragraph_format.space_before = Pt(0)
                p_a.paragraph_format.space_after = Pt(4)
                p_a.paragraph_format.line_spacing = 1.15
                add_formatted_runs(p_a, a_text)
            continue

        # Đoạn văn bản thường (Body paragraph)
        para_lines = [stripped]
        i += 1
        while i < n:
            next_l = lines[i].strip()
            if (not next_l or next_l == "---" or next_l.startswith("#") or
                (next_l.startswith("|") and next_l.endswith("|")) or
                next_l.startswith("- ") or next_l.startswith("* ") or
                re.match(r'^[a-z]\)\s+', next_l) or re.match(r'^Q\d+:\s+', next_l) or
                next_l.startswith("Bước ")):
                break
            para_lines.append(next_l)
            i += 1
        add_body(doc, " ".join(para_lines))

    os.makedirs(os.path.dirname(os.path.abspath(docx_path)), exist_ok=True)
    doc.save(docx_path)
    print(f"Đã xuất thành công tệp Word chuẩn mẫu: {docx_path}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Sử dụng: python generate_comprehensive_report_docx.py <input.md> <output.docx>")
        sys.exit(1)
    parse_and_convert(sys.argv[1], sys.argv[2])
