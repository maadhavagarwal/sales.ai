import zipfile
import xml.etree.ElementTree as ET

def extract_text(doc_path):
    try:
        with zipfile.ZipFile(doc_path) as docx:
            xml_content = docx.read('word/document.xml')
        
        tree = ET.XML(xml_content)
        text = []
        for node in tree.iter():
            if node.tag.endswith('}t') and node.text:
                text.append(node.text)
        return ' '.join(text)
    except Exception as e:
        return str(e)

file1 = r"c:\Users\techa\OneDrive\Desktop\sales ai platfrom\Format (Saavishkar 2026) (1).docx"
file2 = r"c:\Users\techa\OneDrive\Desktop\sales ai platfrom\Format (Saavishkar 2026).docx"

print("--- FILE 1 ---")
print(extract_text(file1))
print("\n\n--- FILE 2 ---")
print(extract_text(file2))
