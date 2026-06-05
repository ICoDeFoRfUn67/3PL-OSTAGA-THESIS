views_path = r"c:\Users\cjnee\Desktop\Manpo\backend\employees\views.py"

with open(views_path, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

# Print lines 1350 to 1410
for idx in range(1349, min(1415, len(lines))):
    print(f"{idx+1}: {lines[idx]}")
