import requests
from bs4 import BeautifulSoup
url='https://www.philatlas.com/lists/barangays-laguna.html'
print('Fetching',url)
r=requests.get(url,headers={'User-Agent':'Mozilla/5.0'},timeout=20)
print('Status',r.status_code)
soup=BeautifulSoup(r.text,'html.parser')
# print a few tag types and a snippet of the content
h1=soup.find('h1')
if h1:
    print('H1:', h1.get_text(strip=True))
# print first 20 list items under <ul> if present
uls=soup.find_all('ul')
for i,ul in enumerate(uls[:3]):
    print('UL',i,'len',len(ul.find_all('li')))
    for li in ul.find_all('li')[:10]:
        print('-', li.get_text(' ', strip=True))
# print some anchors
print('Anchors sample:')
for a in soup.find_all('a')[:20]:
    print(a.get_text(strip=True), '->', a.get('href'))
# Save whole page to file for inspection
with open('scripts/laguna_page.html','w',encoding='utf-8') as f:
    f.write(r.text)
print('Saved scripts/laguna_page.html')
