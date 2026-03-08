from fpdf import FPDF
import io

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
    pdf = StrategicPlanPDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_font('Helvetica', '', 12)
    
    # Simple markdown-ish parsing for headings
    lines = text.split('\n')
    for line in lines:
        if line.startswith('# '):
            pdf.set_font('Helvetica', 'B', 16)
            pdf.multi_cell(0, 10, line[2:])
            pdf.set_font('Helvetica', '', 12)
        elif line.startswith('## '):
            pdf.set_font('Helvetica', 'B', 14)
            pdf.multi_cell(0, 10, line[3:])
            pdf.set_font('Helvetica', '', 12)
        elif line.startswith('### '):
            pdf.set_font('Helvetica', 'B', 12)
            pdf.multi_cell(0, 10, line[4:])
            pdf.set_font('Helvetica', '', 12)
        else:
            pdf.multi_cell(0, 10, line)
            
    return pdf.output()
