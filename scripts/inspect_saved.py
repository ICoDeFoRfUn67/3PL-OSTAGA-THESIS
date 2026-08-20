from bs4 import BeautifulSoup
p='scripts/pages/laguna.html'
print('Reading',p)
with open(p,'r',encoding='utf-8') as f:
    text=f.read()
    soup=BeautifulSoup(text,'html.parser')
uls=soup.find_all('ul')
print('Found',len(uls),'ul elements')
for i,ul in enumerate(uls[:10]):
    lis=ul.find_all('li')
    print(f'UL[{i}] has {len(lis)} li')
    for li in lis[:20]:
        print(' -',li.get_text(' ',strip=True)[:200])
    print('---')
# also search for words 'barangay' and 'perez'
print('\nSearching for "perez" occurrences:')
found=False
for s in soup.stripped_strings:
    if 'perez' in s.lower():
        print('  ->',s)
        found=True
        break
if not found:
    print('  none')
