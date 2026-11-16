#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script chuyển đổi báo cáo Sprint Planning Markdown sang định dạng Word (.docx) chuyên nghiệp.
Áp dụng phong cách thiết kế chuẩn mực: Times New Roman, bảng có viền chuẩn, header xanh navy.
"""

import os
import re
import sys
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

BLUE_DARK = RGBColor(0x1F, 0x49, 0x7D)   # Tiêu đề lớn & Header bảng
GRAY_DARK = RGBColor(0x59, 0x59, 0x59)   # Phụ đề
BLUE_SECT = RGBColor(0x1F, 0x49, 0x7D)   # Tiêu đề mục lớn
BLACK     = RGBColor(0x00, 0x00, 0x00)   # Văn bản thường
GRAY_CODE = RGBColor(0x1F, 0x49, 0x7D)   # Mã lệnh

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
            run.font.color.rgb = GRAY_CODE
        else:
            run = paragraph.add_run(token)
            run.font.name = default_font
            run.font.size = default_size
            run.font.color.rgb = default_color


def add_title(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(10)
    r = p.add_run(text.strip())
    r.bold = True
    r.font.size = Pt(17)
    r.font.color.rgb = BLUE_DARK
    r.font.name = FONT_MAIN


def add_section_heading(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text.strip())
    r.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = BLUE_SECT
    r.font.name = FONT_MAIN


def add_sub_heading(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(9)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text.strip())
    r.bold = True
    r.font.size = Pt(11.5)
    r.font.color.rgb = BLACK
    r.font.name = FONT_MAIN


def add_body(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    add_formatted_runs(p, text.strip())


def add_quote_box(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.8)
    p.paragraph_format.right_indent = Cm(0.8)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.line_spacing = 1.2
    
    r_lead = p.add_run("MỤC TIÊU SPRINT: ")
    r_lead.bold = True
    r_lead.font.name = FONT_MAIN
    r_lead.font.size = Pt(11)
    r_lead.font.color.rgb = BLUE_DARK

    run = p.add_run(text.strip())
    run.italic = True
    run.font.name = FONT_MAIN
    run.font.size = Pt(11)
    run.font.color.rgb = BLACK


def add_bullet(doc, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    add_formatted_runs(p, text.strip())


def add_numbered_item(doc, text):
    p = doc.add_paragraph(style='List Number')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    add_formatted_runs(p, text.strip())


def add_table_data(doc, headers, rows):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = 'Table Grid'
    
    # Format header
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
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(4)
        r = p.add_run(h.strip())
        r.bold = True
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        r.font.name = FONT_MAIN
        r.font.size = Pt(9.5)
        
    # Format body rows
    for i, row in enumerate(rows):
        tr = table.rows[i + 1]
        fill = 'EDF2F8' if i % 2 == 0 else 'FFFFFF'
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
                p.paragraph_format.space_before = Pt(2.5)
                p.paragraph_format.space_after = Pt(2.5)
                
                # Căn giữa cho cột ngắn (STT, SP, Tỷ lệ, Task)
                ct = cell_text.strip()
                if ct in ['BE', 'FE', 'FS'] or re.match(r'^\d+(\.\d+)?%$', ct) or re.match(r'^\d+ (thẻ|task|SP)$', ct) or re.match(r'^\d+$', ct):
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                else:
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    
                add_formatted_runs(p, ct, default_size=Pt(9.5))

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(4)
    p_sp.paragraph_format.space_after = Pt(4)


def convert_markdown_to_docx(md_path, docx_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    doc = create_document()
    
    in_table = False
    table_headers = []
    table_rows = []

    for line in lines:
        raw = line.rstrip('\r\n')
        sline = raw.strip()

        # Handle Markdown Table
        if sline.startswith('|') and sline.endswith('|'):
            cells = [c.strip() for c in sline.split('|')[1:-1]]
            if not in_table:
                in_table = True
                table_headers = cells
                table_rows = []
            else:
                # Kiểm tra nếu là dòng phân cách |---|---|
                if all(re.match(r'^:?-+:?$', c) for c in cells):
                    continue
                table_rows.append(cells)
            continue
        else:
            if in_table:
                add_table_data(doc, table_headers, table_rows)
                in_table = False
                table_headers = []
                table_rows = []

        if not sline:
            continue

        # Horizontal separator
        if sline == '---':
            continue

        # Title #
        if sline.startswith('# '):
            add_title(doc, sline[2:])
        # Section Heading ##
        elif sline.startswith('## '):
            add_section_heading(doc, sline[3:])
        # Sub Heading ###
        elif sline.startswith('### '):
            add_sub_heading(doc, sline[4:])
        # Blockquote
        elif sline.startswith('>'):
            quote_text = sline.lstrip('> ').strip(' "”„“')
            add_quote_box(doc, quote_text)
        # Bullet list -
        elif sline.startswith('- '):
            add_bullet(doc, sline[2:])
        # Numbered list 1.
        elif re.match(r'^\d+\.\s+', sline):
            text = re.sub(r'^\d+\.\s+', '', sline)
            add_numbered_item(doc, text)
        else:
            add_body(doc, sline)

    if in_table:
        add_table_data(doc, table_headers, table_rows)

    doc.save(docx_path)
    print(f"Xuat thanh cong: {docx_path}")


if __name__ == "__main__":
    md_file = r"docs/BAO_CAO_SPRINT_PLANNING_SPRINT_4_GREENPHONE.md"
    docx_file = r"docs/BAO_CAO_SPRINT_PLANNING_SPRINT_4_GREENPHONE.docx"
    convert_markdown_to_docx(md_file, docx_file)
