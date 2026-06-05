import re

views_path = r"c:\Users\cjnee\Desktop\Manpo\backend\employees\views.py"

with open(views_path, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

viewsets = ["LeaveRequestViewSet", "EditRequestViewSet", "PayrollViewSet"]

for vs in viewsets:
    print(f"\n==================== {vs} ====================")
    start_line = None
    for idx, line in enumerate(lines):
        if line.startswith(f"class {vs}"):
            start_line = idx
            break
    
    if start_line is not None:
        # Find where the class ends (next non-indented class definition or similar)
        end_line = len(lines)
        for idx in range(start_line + 1, len(lines)):
            line = lines[idx]
            if line.strip() and not line.startswith(" ") and not line.startswith("\t"):
                if line.startswith("class ") or line.startswith("def ") or line.startswith("@"):
                    end_line = idx
                    break
        
        # print first 100 lines of it
        for idx in range(start_line, min(start_line + 200, end_line)):
            print(f"{idx+1}: {lines[idx]}")
    else:
        print("Not found")
