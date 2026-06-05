import re

views_path = r"c:\Users\cjnee\Desktop\Manpo\backend\employees\views.py"

with open(views_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's search for classes
print("CLASSES DEFINED IN VIEWS.PY:")
classes = re.findall(r'class\s+(\w+)\((.*?)\):', content)
for cls, base in classes:
    print(f" - {cls} ({base})")

# Let's search for "sleep" in views.py
print("\nOCCURRENCES OF 'sleep' IN VIEWS.PY:")
sleeps = []
for i, line in enumerate(content.splitlines(), 1):
    if 'sleep' in line:
        print(f"Line {i}: {line.strip()}")

# Let's search for complex loops or external API calls or database bottlenecks
# let's look for "time." or "api" or queries in serializers or views
print("\nCHECKING FOR POTENTIAL PERFORMANCE BOTTLENECKS:")
for i, line in enumerate(content.splitlines(), 1):
    if 'requests.get' in line or 'requests.post' in line or 'time.sleep' in line or 'delay' in line.lower():
        print(f"Line {i}: {line.strip()}")
