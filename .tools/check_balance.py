import sys
from pathlib import Path

def find_unbalanced(path):
    s = Path(path).read_text(encoding='utf-8')
    pairs = {'(': ')', '[': ']', '{': '}'}
    opens = set(pairs.keys())
    closes = set(pairs.values())
    stack = []  # (char, index)
    for idx, ch in enumerate(s):
        if ch in opens:
            stack.append((ch, idx))
        elif ch in closes:
            if not stack:
                line = s.count('\n', 0, idx) + 1
                return f"Unmatched closing {ch} at line {line} (idx {idx})"
            last, lastidx = stack.pop()
            if pairs[last] != ch:
                line = s.count('\n', 0, idx) + 1
                return f"Mismatched {last} ... {ch} at line {line} (idx {idx})"
    if stack:
        last, lastidx = stack[-1]
        line = s.count('\n', 0, lastidx) + 1
        return f"Unclosed {last} at line {line} (idx {lastidx})"
    return "Balanced"

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: check_balance.py <file>')
        sys.exit(2)
    path = sys.argv[1]
    res = find_unbalanced(path)
    print(res)
    # If user requests context, print surrounding lines
    if len(sys.argv) > 2 and sys.argv[2] == '--context':
        s = Path(path).read_text(encoding='utf-8')
        # Try to extract a line number from the message
        import re
        m = re.search(r'line (\d+)', res)
        if m:
            ln = int(m.group(1))
            start = max(1, ln - 6)
            end = ln + 6
            lines = s.splitlines()
            for i in range(start, min(end, len(lines)) + 1):
                prefix = '>' if i == ln else ' '
                print(f"{prefix} {i:4}: {lines[i-1]}")
