from fpdf import FPDF
import textwrap


def _sanitize_pdf_text(text):
    cleaned = []
    for raw_line in text.split('\n'):
        line = raw_line.replace('`', '').replace('\t', ' ').replace('•', '-')
        line = line.encode('latin-1', 'replace').decode('latin-1')
        line = " ".join(line.strip().split())
        if not line:
            cleaned.append("")
            continue
        cleaned.extend(textwrap.wrap(line, width=90, break_long_words=True, break_on_hyphens=False))
    return cleaned

class StrategicPlanPDF(FPDF):
    def header(self):
        # Arial bold 15
        self.set_font('Helvetica', 'B', 15)
        # Move to the right
        self.cell(80)
        # Title
        self.cell(40, 10, 'NEURAL BI - STRATEGIC BUSINESS PLAN', 0, 0, 'C')
        # Line break
        self.ln(20)

    def footer(self):
        # Position at 1.5 cm from bottom
        self.set_y(-15)
        # Arial italic 8
        self.set_font('Helvetica', 'I', 8)
        # Page number
        self.cell(0, 10, 'Page ' + str(self.page_no()) + '/{nb}', 0, 0, 'C')

def create_pdf_from_text(text, filename="Strategy_Plan.pdf"):
    try:
        pdf = StrategicPlanPDF()
        pdf.alias_nb_pages()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.set_font('Helvetica', '', 12)

        lines = _sanitize_pdf_text(text)
        usable_width = pdf.w - pdf.l_margin - pdf.r_margin

        for line in lines:
            pdf.set_x(pdf.l_margin)
            if not line:
                pdf.ln(4)
                continue
            if line.startswith('# '):
                pdf.set_font('Helvetica', 'B', 16)
                pdf.multi_cell(usable_width, 10, line[2:])
                pdf.set_font('Helvetica', '', 12)
            elif line.startswith('## '):
                pdf.set_font('Helvetica', 'B', 14)
                pdf.multi_cell(usable_width, 10, line[3:])
                pdf.set_font('Helvetica', '', 12)
            elif line.startswith('### '):
                pdf.set_font('Helvetica', 'B', 12)
                pdf.multi_cell(usable_width, 10, line[4:])
                pdf.set_font('Helvetica', '', 12)
            else:
                pdf.multi_cell(usable_width, 8, line)

        return _as_pdf_bytes(pdf)
    except Exception:
        fallback = StrategicPlanPDF()
        fallback.alias_nb_pages()
        fallback.add_page()
        fallback.set_auto_page_break(auto=True, margin=15)
        fallback.set_font('Helvetica', '', 11)
        usable_width = fallback.w - fallback.l_margin - fallback.r_margin

        for line in _sanitize_pdf_text(text):
            fallback.set_x(fallback.l_margin)
            if not line:
                fallback.ln(4)
                continue
            fallback.cell(usable_width, 7, txt=line[:110], new_x="LMARGIN", new_y="NEXT")

        return _as_pdf_bytes(fallback)


def _as_pdf_bytes(pdf: FPDF) -> bytes:
    output = pdf.output(dest="S")
    if isinstance(output, bytearray):
        return bytes(output)
    if isinstance(output, bytes):
        return output
    return str(output).encode("latin-1", "replace")
