p='c:\\Users\\cjnee\\Desktop\\Manpo\\3PLCJ_AGAIN\\frontend\\src\\pages\\admin\\AdminHubsPage.tsx'
s=open(p,'r',encoding='utf-8').read()
pairs={'{':'}','(':')','[':']'}
stack=[]
for i,ch in enumerate(s):
    lineno = s[:i].count('\n')+1
    if ch in pairs:
        stack.append((ch,lineno,i))
    elif ch in '})]':
        if not stack:
            print('Unmatched closing',ch,'at',lineno); break
        op,opl,opi = stack.pop()
        if pairs[op]!=ch:
            print('Mismatched',op,'closed by',ch,'at',lineno); break
else:
    if stack:
        op,opl,opi=stack[-1]
        print('Unclosed',op,'opened at line',opl,'index',opi)
    else:
        print('All balanced')
