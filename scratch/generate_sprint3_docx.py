#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script tạo file Word (.docx) Báo Cáo Tổng Kết Sprint 3 - Dự Án GreenPhone.
Tuân thủ tuyệt đối quy tắc:
1. KHÔNG SỬ DỤNG ICON HOẶC EMOJI TRONG BẤT KỲ THÀNH PHẦN NÀO.
2. 100% TIẾNG VIỆT CÓ DẤU CHUẨN XÁC NGỮ PHÁP.
3. KHÔNG DÙNG QUÁ NHIỀU MÀU SẮC, TRÌNH BÀY ĐẸP MẮT, TRANG NHÃ CHUẨN MỰC TÀI LIỆU DOANH NGHIỆP.
"""

import os
import re
from docx import Document
from docx.shared import Pt, RGBColor, Cm, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

# Bảng màu trang nhã, hạn chế màu mè theo yêu cầu
COLOR_PRIMARY = RGBColor(0x1F, 0x49, 0x7D)    # Xanh Navy đậm - Màu chủ đạo tiêu đề
COLOR_SECONDARY = RGBColor(0x36, 0x60, 0x92)  # Xanh lam trầm - Tiêu đề cấp 2
COLOR_DARK = RGBColor(0x26, 0x26, 0x26)       # Xám đen - Văn bản chính
COLOR_MUTED = RGBColor(0x59, 0x59, 0x59)      # Xám - Phụ đề và ghi chú
COLOR_BORDER = "CCCCCC"                       # Viền bảng mỏng
COLOR_BG_HEADER = "1F497D"                    # Nền header bảng (Xanh navy)
COLOR_BG_ALT = "F7F9FB"                       # Nền dòng xen kẽ bảng (rất nhạt)
COLOR_BG_BOX = "F2F5F9"                       # Nền khung trích dẫn Sprint Goal

FONT_MAIN = "Times New Roman"
FONT_CODE = "Consolas"

def set_cell_border(cell, **kwargs):
    """Thiết lập viền mỏng trang nhã cho ô bảng."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = 'w:{}'.format(edge)
            element = OxmlElement(tag)
            element.set(qn('w:val'), edge_data.get('val', 'single'))
            element.set(qn('w:sz'), str(edge_data.get('sz', 4)))
            element.set(qn('w:space'), '0')
            element.set(qn('w:color'), edge_data.get('color', COLOR_BORDER))
            tcBorders.append(element)
    tcPr.append(tcBorders)

def set_cell_shading(cell, color_hex):
    """Tô màu nền cho ô bảng."""
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Thiết lập khoảng đệm ô bảng (dxml units, 20 = 1pt)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def add_callout_box(doc, title, text):
    """Tạo hộp trích dẫn nổi bật cho Sprint Goal với viền xanh bên trái."""
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.cell(0, 0)
    cell.width = Cm(16.5)
    set_cell_shading(cell, COLOR_BG_BOX)
    
    # Chỉ đặt viền trái dày 36 (khoảng 4.5pt), các viền khác không có
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    
    left_b = OxmlElement('w:left')
    left_b.set(qn('w:val'), 'single')
    left_b.set(qn('w:sz'), '36')
    left_b.set(qn('w:space'), '0')
    left_b.set(qn('w:color'), '1F497D')
    tcBorders.append(left_b)
    
    for edge in ('top', 'bottom', 'right'):
        edge_b = OxmlElement(f'w:{edge}')
        edge_b.set(qn('w:val'), 'none')
        tcBorders.append(edge_b)
    tcPr.append(tcBorders)
    set_cell_margins(cell, top=160, bottom=160, left=240, right=200)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    run_t = p.add_run(title + "\n")
    run_t.font.name = FONT_MAIN
    run_t.font.size = Pt(11)
    run_t.font.bold = True
    run_t.font.color.rgb = COLOR_PRIMARY
    
    run_body = p.add_run(text)
    run_body.font.name = FONT_MAIN
    run_body.font.size = Pt(10.5)
    run_body.font.italic = True
    run_body.font.color.rgb = COLOR_DARK
    
    # Thêm đoạn trống sau bảng
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(0)
    p_after.paragraph_format.space_after = Pt(6)

def parse_markdown_to_docx(md_path, docx_path):
    doc = Document()
    
    # Thiết lập lề chuẩn trang A4
    for section in doc.sections:
        section.top_margin = Cm(2.0)
        section.bottom_margin = Cm(2.0)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.0)
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)
        
        # Header / Footer trang nhã
        footer = section.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("Báo Cáo Tổng Kết Sprint 3 - Dự Án GreenPhone (Rikkei Academy OJT)")
        f_run.font.name = FONT_MAIN
        f_run.font.size = Pt(9)
        f_run.font.color.rgb = COLOR_MUTED
    
    style = doc.styles['Normal']
    style.font.name = FONT_MAIN
    style.font.size = Pt(11)
    style.font.color.rgb = COLOR_DARK
    
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    i = 0
    in_table = False
    table_lines = []
    
    while i < len(lines):
        line = lines[i].rstrip('\r\n')
        
        # Xử lý bảng
        if line.startswith('|') and line.endswith('|'):
            table_lines.append(line)
            i += 1
            continue
        elif table_lines:
            # Render bảng đã tích lũy
            render_markdown_table(doc, table_lines)
            table_lines = []
            
        # Dòng trống
        if not line.strip():
            i += 1
            continue
            
        # Đường kẻ phân cách
        if line.strip() in ('---', '***', '___'):
            # Thêm khoảng cách nhẹ thay vì kẻ đậm lòe loẹt
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(6)
            p_border = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="6" w:space="1" w:color="D0D7DE"/></w:pBdr>')
            p._p.get_or_add_pPr().append(p_border)
            i += 1
            continue
            
        # Tiêu đề cấp 1 (# Title lớn)
        if line.startswith('# '):
            title_text = line[2:].strip()
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(10)
            p.paragraph_format.space_after = Pt(4)
            run = p.add_run(title_text)
            run.font.name = FONT_MAIN
            run.font.size = Pt(18)
            run.font.bold = True
            run.font.color.rgb = COLOR_PRIMARY
            i += 1
            continue
            
        # Tiêu đề cấp 2 (## Header 1)
        if line.startswith('## '):
            h_text = line[3:].strip()
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(16)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(h_text)
            run.font.name = FONT_MAIN
            run.font.size = Pt(13.5)
            run.font.bold = True
            run.font.color.rgb = COLOR_PRIMARY
            i += 1
            continue
            
        # Tiêu đề cấp 3 (### Header 2)
        if line.startswith('### '):
            h_text = line[4:].strip()
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(h_text)
            run.font.name = FONT_MAIN
            run.font.size = Pt(12)
            run.font.bold = True
            run.font.color.rgb = COLOR_SECONDARY
            i += 1
            continue
            
        # Trích dẫn Sprint Goal (bắt đầu bằng >)
        if line.startswith('> '):
            quote_text = line[2:].strip().strip('"')
            add_callout_box(doc, "TUYÊN NGÔN MỤC TIÊU SPRINT 3 (SPRINT GOAL)", quote_text)
            i += 1
            continue
            
        # Danh sách dấu đầu dòng (- hoặc *)
        if line.startswith('- ') or line.startswith('* '):
            bullet_text = line[2:].strip()
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            render_inline_formatting(p, bullet_text)
            i += 1
            continue
            
        # Danh sách đánh số (1., 2., 3.)
        m_num = re.match(r'^(\d+)\.\s+(.*)$', line)
        if m_num:
            num_str = m_num.group(1)
            item_text = m_num.group(2)
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(0.7)
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.line_spacing = 1.15
            run_num = p.add_run(f"{num_str}. ")
            run_num.font.name = FONT_MAIN
            run_num.font.bold = True
            run_num.font.color.rgb = COLOR_PRIMARY
            render_inline_formatting(p, item_text)
            i += 1
            continue
            
        # Đoạn văn bản thông thường
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        
        # Nếu là các dòng thông tin đầu tài liệu (Dự án: ..., Đơn vị: ...)
        if any(line.startswith(prefix) for prefix in ('Dự án:', 'Đơn vị:', 'Mã lớp:', 'Thời lượng Sprint:', 'Quy mô nhân sự:', 'Nguồn dữ liệu xác thực:', 'Ngày lập báo cáo:')):
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            parts = line.split(':', 1)
            r_k = p.add_run(parts[0] + ':')
            r_k.font.bold = True
            r_k.font.size = Pt(10.5)
            r_k.font.color.rgb = COLOR_MUTED
            r_v = p.add_run(parts[1])
            r_v.font.size = Pt(10.5)
            r_v.font.color.rgb = COLOR_DARK
        elif line.startswith('ĐẠI DIỆN') or line.startswith('XÁC NHẬN'):
            p.paragraph_format.space_before = Pt(16)
            p.paragraph_format.space_after = Pt(2)
            r = p.add_run(line)
            r.font.bold = True
            r.font.size = Pt(11)
            r.font.color.rgb = COLOR_PRIMARY
        elif line in ('Trưởng Nhóm Kỹ Thuật (Tech Lead)', 'Rikkei Academy', 'Vũ Đăng Nguyên'):
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            r = p.add_run(line)
            r.font.bold = (line == 'Vũ Đăng Nguyên' or line == 'Rikkei Academy')
            r.font.size = Pt(11)
        else:
            render_inline_formatting(p, line)
            
        i += 1
        
    # Xử lý bảng cuối cùng nếu có
    if table_lines:
        render_markdown_table(doc, table_lines)
        
    doc.save(docx_path)
    print(f"Đã lưu thành công file Word tại: {docx_path}")

def render_inline_formatting(paragraph, text):
    """Xử lý định dạng in đậm (**text**) và code (`code`)."""
    tokens = re.split(r'(\*\*[^*]+\*\*|`[^`]+`)', text)
    for token in tokens:
        if not token:
            continue
        if token.startswith('**') and token.endswith('**'):
            run = paragraph.add_run(token[2:-2])
            run.font.name = FONT_MAIN
            run.font.size = Pt(11)
            run.font.bold = True
            run.font.color.rgb = COLOR_DARK
        elif token.startswith('`') and token.endswith('`'):
            run = paragraph.add_run(token[1:-1])
            run.font.name = FONT_CODE
            run.font.size = Pt(10)
            run.font.color.rgb = COLOR_PRIMARY
        else:
            run = paragraph.add_run(token)
            run.font.name = FONT_MAIN
            run.font.size = Pt(11)
            run.font.color.rgb = COLOR_DARK

def render_markdown_table(doc, lines):
    """Chuyển đổi bảng markdown thành bảng Word thanh lịch, viền mỏng và nền nhã nhặn."""
    header_line = lines[0]
    headers = [c.strip() for c in header_line.split('|')[1:-1]]
    num_cols = len(headers)
    if num_cols == 0:
        return
        
    # Bỏ qua dòng phân cách |---|---|
    data_rows = []
    for l in lines[1:]:
        if re.match(r'^\|[\s\-:|]+\|$', l.strip()):
            continue
        cols = [c.strip() for c in l.split('|')[1:-1]]
        # Bổ sung nếu thiếu cột
        while len(cols) < num_cols:
            cols.append('')
        data_rows.append(cols[:num_cols])
        
    table = doc.add_table(rows=len(data_rows) + 1, cols=num_cols)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    
    # Thiết lập độ rộng tương đối cho bảng
    # Row 0: Header
    hdr_cells = table.rows[0].cells
    for col_idx, h_text in enumerate(headers):
        cell = hdr_cells[col_idx]
        set_cell_shading(cell, COLOR_BG_HEADER)
        set_cell_margins(cell, top=140, bottom=140, left=140, right=140)
        set_cell_border(cell, 
                        top={'val': 'single', 'sz': 6, 'color': '1F497D'},
                        bottom={'val': 'single', 'sz': 12, 'color': '1F497D'},
                        left={'val': 'none'}, right={'val': 'none'})
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(h_text)
        run.font.name = FONT_MAIN
        run.font.size = Pt(10)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        
    # Data rows
    for row_idx, r_data in enumerate(data_rows):
        row_cells = table.rows[row_idx + 1].cells
        bg_color = COLOR_BG_ALT if (row_idx % 2 == 1) else "FFFFFF"
        for col_idx, val in enumerate(r_data):
            cell = row_cells[col_idx]
            if bg_color != "FFFFFF":
                set_cell_shading(cell, bg_color)
            set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
            set_cell_border(cell,
                            top={'val': 'single', 'sz': 4, 'color': COLOR_BORDER},
                            bottom={'val': 'single', 'sz': 4, 'color': COLOR_BORDER},
                            left={'val': 'none'}, right={'val': 'none'})
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            
            # Căn lề số thứ tự hoặc số ngắn ở giữa, văn bản dài căn trái
            if col_idx == 0 and len(val) <= 4:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif val.endswith('SP') or val.endswith('%') or val.isdigit():
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                
            render_inline_formatting(p, val)
            # Điều chỉnh size font chữ trong bảng gọn gàng hơn
            for r in p.runs:
                r.font.size = Pt(9.5)
                
    # Thêm khoảng trống sau bảng
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(0)
    p_after.paragraph_format.space_after = Pt(6)

if __name__ == '__main__':
    md_file = "docs/BAO_CAO_TONG_KET_SPRINT_3_GREENPHONE.md"
    docx_file = "docs/BAO_CAO_TONG_KET_SPRINT_3_GREENPHONE.docx"
    parse_markdown_to_docx(md_file, docx_file)
