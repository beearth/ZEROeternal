import os

file_path = r'c:\Users\심도진\Desktop\signalvoca\src\App.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines[:1148])

print(f"Truncated {file_path} to 1148 lines.")
