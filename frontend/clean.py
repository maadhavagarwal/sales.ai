import os
import re

directory = r'c:\Users\techa\OneDrive\Desktop\sales ai platfrom\frontend'

patterns_to_remove = [
    r'\s+bg-gradient-[A-Za-z0-9_-]+',
    r'\s+from-[A-Za-z0-9_\[\]\#\-]+',
    r'\s+to-[A-Za-z0-9_\[\]\#\-]+',
    r'\s+via-[A-Za-z0-9_\[\]\#\-]+',
    r'\s+shadow-\[[A-Za-z0-9_,\.\-\#\%\s]+\]', 
    r'\s+shadow-[a-zA-Z0-9_-]+', 
    r'\s+blur-[a-zA-Z0-9_\[\]\-]+', 
]

count = 0
for root, dirs, files in os.walk(directory):
    for filename in files:
        if filename.endswith('.tsx') or filename.endswith('.ts'):
            filepath = os.path.join(root, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            original = content
            
            for pattern in patterns_to_remove:
                content = re.sub(pattern, '', content)
                
            if content != original:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print("Cleaned:", filepath)
                count += 1

print(f"Cleaned {count} files.")
