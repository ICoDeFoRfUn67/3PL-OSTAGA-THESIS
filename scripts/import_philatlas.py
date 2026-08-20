#!/usr/bin/env python3
"""
Scrape PhilAtlas barangay lists and produce a hierarchical JSON file.
Writes philippine_locations.json at repository root.
Usage: python scripts/import_philatlas.py
"""
import re
import time
import json
import os
import sys
from urllib.parse import urljoin

try:
    import requests
    from bs4 import BeautifulSoup
except Exception:
    print('This script requires requests and beautifulsoup4. Please run: pip install requests beautifulsoup4')
    sys.exit(1)

BASE = 'https://www.philatlas.com'
OUTFILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'philippine_locations.json')
HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; philatlas-scraper/1.0)'}

session = requests.Session()
session.headers.update(HEADERS)


def get_regions_map():
    url = urljoin(BASE, '/regions.html')
    print('Fetching regions list...')
    r = session.get(url, timeout=20)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, 'html.parser')
    mapping = {}
    for a in soup.find_all('a', href=True):
        href = a['href']
        if href.endswith('.html'):
            slug = href.strip('/').split('/')[-1].replace('.html', '')
            # ignore generic links like 'regions' 'luzon' etc
            if len(slug) > 1 and (slug.startswith('r') or slug.isupper() or slug.islower()):
                name = a.get_text(strip=True)
                mapping[slug] = name
    print(f'Found {len(mapping)} region entries')
    return mapping


def find_province_list_pages():
    url = urljoin(BASE, '/barangays.html')
    print('Fetching master barangays index...')
    r = session.get(url, timeout=20)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, 'html.parser')
    pages = set()
    for a in soup.find_all('a', href=True):
        href = a['href']
        # accept relative or absolute links containing the pattern
        if 'lists/barangays-' in href and href.endswith('.html'):
            pages.add(urljoin(BASE, href))
    pages = sorted(pages)
    print(f'Found {len(pages)} province list pages')
    return pages


def parse_province_page(url):
    print('  Fetching', url)
    r = session.get(url, timeout=30)
    r.raise_for_status()
    text = r.text
    soup = BeautifulSoup(text, 'html.parser')

    # Debug: save page HTML for inspection
    try:
        m = re.search(r'barangays-([a-z0-9-]+)\.html', url)
        slug = m.group(1) if m else 'page'
        os.makedirs(os.path.join(os.path.dirname(__file__), 'pages'), exist_ok=True)
        with open(os.path.join(os.path.dirname(__file__), 'pages', f'{slug}.html'), 'w', encoding='utf-8') as fh:
            fh.write(text)
    except Exception:
        pass

    # Debug: counts
    li_count = len(soup.find_all('li'))
    a_count = len(soup.find_all('a'))
    print(f'    page has {li_count} <li> and {a_count} <a> tags')
    # print sample li texts
    for i, li in enumerate(soup.find_all('li')[:8]):
        print('      LI:', li.get_text(' ', strip=True)[:120])
    for i, a in enumerate(soup.find_all('a')[:8]):
        print('      A :', a.get_text(' ', strip=True)[:80], '->', a.get('href'))

    # Many PhilAtlas province pages render barangays as a simple <ul> of <li> texts
    # like: "Bitin , Bay" where the last comma-separated token is the city/municipality.
    results = []

    # determine province name from <title> or url
    province = None
    title_tag = soup.find('title')
    if title_tag and 'List of barangays of' in title_tag.get_text():
        m = re.search(r'List of barangays of\s+(.+?)(?:\s*[\u2013\u2014\-–—]|$)', title_tag.get_text())
        if m:
            province = m.group(1).strip()
    if not province:
        m = re.search(r'barangays-([a-z0-9-]+)\.html', url)
        if m:
            province = m.group(1).replace('-', ' ').title()

    # choose the <ul> with the most <li> entries (likely the barangay list)
    uls = soup.find_all('ul')
    if not uls:
        return results
    largest = max(uls, key=lambda u: len(u.find_all('li')))
    for li in largest.find_all('li'):
        txt = li.get_text(' ', strip=True)
        if not txt:
            continue
        # split by comma; last part is city
        parts = [p.strip() for p in txt.split(',') if p.strip()]
        if len(parts) == 1:
            brgy = parts[0]
            city = None
        else:
            brgy = ', '.join(parts[:-1])
            city = parts[-1]
        results.append({'href': None, 'barangay': brgy, 'city': city, 'province': province, 'region_slug': None})
    return results


def build_hierarchy():
    regions_map = get_regions_map()
    province_pages = find_province_list_pages()

    provinces_by_region = {}
    cities_by_province = {}
    barangays_by_city = {}

    seen_provinces = set()

    for purl in province_pages:
        try:
            items = parse_province_page(purl)
            print(f'    parsed {len(items)} items from {purl}')
        except Exception as e:
            print('Failed to parse', purl, e)
            continue
        for it in items:
            brgy = it['barangay']
            city = it.get('city') or 'Unknown'
            province = it.get('province') or 'Unknown'
            region_slug = it.get('region_slug')
            region_name = regions_map.get(region_slug) if region_slug else None
            if region_name is None:
                region_name = 'Unknown'

            # provinces_by_region
            provinces_by_region.setdefault(region_name, set()).add(province)
            # cities_by_province
            cities_by_province.setdefault(province, set()).add(city)
            # barangays_by_city
            barangays_by_city.setdefault(city, []).append(brgy)

        time.sleep(0.25)

    # convert sets to sorted lists
    provinces_by_region = {k: sorted(list(v)) for k, v in provinces_by_region.items()}
    cities_by_province = {k: sorted(list(v)) for k, v in cities_by_province.items()}
    # deduplicate barangays per city while preserving insertion order
    for city, arr in barangays_by_city.items():
        seen = set()
        out = []
        for x in arr:
            if x not in seen:
                seen.add(x)
                out.append(x)
        barangays_by_city[city] = out

    regions = sorted([r for r in provinces_by_region.keys() if r != 'Unknown'])

    data = {
        'regions': regions,
        'provinces_by_region': provinces_by_region,
        'cities_by_province': cities_by_province,
        'barangays_by_city': barangays_by_city,
    }
    return data


if __name__ == '__main__':
    print('Starting PhilAtlas scraper...')
    data = build_hierarchy()
    print('Writing', OUTFILE)
    with open(OUTFILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print('Done. Regions:', len(data['regions']), 'Provinces mappings:', sum(len(v) for v in data['provinces_by_region'].values()), 'Cities:', len(data['cities_by_province']), 'Barangay city keys:', len(data['barangays_by_city']))
