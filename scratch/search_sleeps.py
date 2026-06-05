import os

search_dir = r"c:\Users\cjnee\Desktop\Manpo"
exclude_dirs = {'.git', 'node_modules', '__pycache__', 'venv', 'dist', '.gemini'}

print("SEARCHING FOR SLEEPS/DELAYS:")
for root, dirs, files in os.walk(search_dir):
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    for file in files:
        if file.endswith(('.py', '.ts', '.tsx', '.js', '.jsx', '.json')):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                if 'sleep' in content or 'setTimeout' in content or 'delay(' in content:
                    # Let's print occurrences
                    lines = content.splitlines()
                    for idx, line in enumerate(lines, 1):
                        if 'time.sleep' in line or 'sleep(' in line or 'setTimeout(' in line or 'delay(' in line:
                            # Skip standard imports or declarations if trivial
                            if 'import' in line or 'declare' in line:
                                continue
                            print(f"{os.path.relpath(filepath, search_dir)}:{idx} -> {line.strip()}")
            except Exception as e:
                pass
