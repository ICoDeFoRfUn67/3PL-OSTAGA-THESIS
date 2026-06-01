p='c:\\Users\\cjnee\\Desktop\\Manpo\\3PLCJ_AGAIN\\frontend\\src\\pages\\admin\\AdminHubsPage.tsx'
s=open(p,'r',encoding='utf-8').read()
start = s.find('\n  return (\n')
if start==-1:
    start = s.find('\n  return (')
if start==-1:
    print('could not find return (')
    raise SystemExit(1)
end = s.find('\n  );\n', start)
if end==-1:
    print('could not find closing return'); raise SystemExit(1)
frag = s[start:end]
stack=[]
for i,ch in enumerate(frag):
    lineno = s[:start].count('\n')+1+frag[:i].count('\n')
    if ch in '{([':
        stack.append((ch,lineno,i))
    elif ch in '})]':
        if not stack:
            print('Unmatched closing',ch,'at line',lineno)
            raise SystemExit(0)
        op,opl,opi = stack.pop()
        if {'{':'}','(':')','[':']'}[op]!=ch:
            print('Mismatched',op,'closed by',ch,'at line',lineno)
            raise SystemExit(0)
if stack:
    op,opl,opi = stack[-1]
    print('Unclosed',op,'opened at line',opl,'char index',opi)
    # show context
    abs_idx = start + opi
    snip_start = max(0, abs_idx-80)
    snip_end = min(len(s), abs_idx+80)
    context = s[snip_start:snip_end]
    # print with a marker
    marker = '\n' + context.replace('\n','\n') + '\n\n' + (' '*(abs_idx-snip_start)) + '^ HERE'
    print(marker)
else:
    print('All balanced')
