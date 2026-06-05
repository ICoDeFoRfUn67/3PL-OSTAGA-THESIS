views_path = r"c:\Users\cjnee\Desktop\Manpo\backend\employees\views.py"

with open(views_path, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

# Search for PayrollViewSet
start_line = None
for idx, line in enumerate(lines):
    if "class PayrollViewSet" in line:
        start_line = idx
        break

if start_line is not None:
    # Print 300 lines starting from start_line
    for idx in range(start_line, min(start_line + 350, len(lines))):
        print(f"{idx+1}: {lines[idx]}")
else:
    print("PayrollViewSet not found")
