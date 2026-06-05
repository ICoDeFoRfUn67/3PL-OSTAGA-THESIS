import re

serializers_path = r"c:\Users\cjnee\Desktop\Manpo\backend\employees\serializers.py"

with open(serializers_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("CLASSES DEFINED IN SERIALIZERS.PY:")
classes = re.findall(r'class\s+(\w+)\((.*?)\):', content)
for cls, base in classes:
    print(f" - {cls} ({base})")

print("\nOCCURRENCES OF 'sleep' IN SERIALIZERS.PY:")
for i, line in enumerate(content.splitlines(), 1):
    if 'sleep' in line:
        print(f"Line {i}: {line.strip()}")
