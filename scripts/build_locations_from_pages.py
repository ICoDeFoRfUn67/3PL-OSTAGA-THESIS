#!/usr/bin/env python3
"""
Build `philippine_locations.json` from saved PhilAtlas pages in `scripts/pages/`.
Writes output to repository root: `philippine_locations.json`.
"""
import os
import re
import json
import sys
try:
    from bs4 import BeautifulSoup
except Exception:
    print('This script requires beautifulsoup4. Run: pip install beautifulsoup4')
    sys.exit(1)

ROOT = os.path.dirname(os.path.dirname(__file__))
PAGES_DIR = os.path.join(os.path.dirname(__file__), 'pages')
OUTFILE = os.path.join(ROOT, 'philippine_locations.json')
FRONTEND_LOC_FILE = os.path.join(ROOT, 'frontend', 'src', 'constants', 'philippineLocations.ts')


def load_frontend_provinces_by_region():
    mapping = {}
    if not os.path.exists(FRONTEND_LOC_FILE):
        return mapping
    txt = open(FRONTEND_LOC_FILE, 'r', encoding='utf-8').read()
    m = re.search(r'export const PROVINCES_BY_REGION[\s\S]*?=\s*{([\s\S]*?)}\s*;', txt)
    if not m:
        return mapping
    block = m.group(1)
    for region_match in re.finditer(r'"([^"]+)"\s*:\s*\[([^\]]*)\]', block, re.S):
        region = region_match.group(1).strip()
        arr = region_match.group(2)
        provinces = re.findall(r'"([^"]+)"', arr)
        mapping[region] = [p.strip() for p in provinces]
    return mapping


def parse_province_file(path):
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as fh:
            txt = fh.read()
    except Exception:
        return os.path.basename(path).replace('.html', '').replace('-', ' ').title(), []

    try:
        soup = BeautifulSoup(txt, 'html.parser')
    except Exception:
        return os.path.basename(path).replace('.html', '').replace('-', ' ').title(), []
    # derive province name from <title>
    province = None
    title = soup.find('title')
    if title:
        m = re.search(r'List of barangays of\s+(.+?)(?:\s*[–—-]|$)', title.get_text())
        if m:
            province = m.group(1).strip()
    if not province:
        province = os.path.basename(path).replace('.html', '').replace('-', ' ').title()

    uls = soup.find_all('ul')
    if not uls:
        return province, []
    # pick the UL with the most LI elements
    largest = max(uls, key=lambda u: len(u.find_all('li')))
    items = []
    for li in largest.find_all('li'):
        txt = li.get_text(' ', strip=True)
        if not txt:
            continue
        parts = [p.strip() for p in txt.split(',') if p.strip()]
        if len(parts) == 1:
            brgy = parts[0]
            city = None
        else:
            brgy = ', '.join(parts[:-1])
            city = parts[-1]
        items.append((brgy, city))
    return province, items


def main():
    if not os.path.isdir(PAGES_DIR):
        print('Pages directory not found:', PAGES_DIR)
        sys.exit(1)

    frontend_map = load_frontend_provinces_by_region()
    province_to_region = {}
    for region, provinces in frontend_map.items():
        for p in provinces:
            province_to_region[p.lower()] = region

    provinces_by_region = {}
    cities_by_province = {}
    barangays_by_city = {}

    files = sorted([f for f in os.listdir(PAGES_DIR) if f.endswith('.html')])
    for fname in files:
        path = os.path.join(PAGES_DIR, fname)
        print('Processing', fname)
        province, items = parse_province_file(path)
        if not items:
            print('  parsed 0 items from', fname)
            continue
        print('  parsed', len(items), 'items from', fname, 'province=', province)
        cities_set = set()
        for brgy, city in items:
            if not city:
                city = 'Unknown'
            cities_set.add(city)
            barangays_by_city.setdefault(city, []).append(brgy)
        cities_by_province.setdefault(province, set()).update(cities_set)
        region = province_to_region.get(province.lower())
        if region is None:
            pnorm = re.sub(r'\s+Province$', '', province, flags=re.I).strip()
            region = province_to_region.get(pnorm.lower())
        if region is None:
            region = 'Unknown'
        provinces_by_region.setdefault(region, set()).add(province)

    provinces_by_region = {k: sorted(list(v)) for k, v in provinces_by_region.items()}
    cities_by_province = {k: sorted(list(v)) for k, v in cities_by_province.items()}

    for city, arr in list(barangays_by_city.items()):
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

    print('Writing', OUTFILE)
    with open(OUTFILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print('Done. Regions:', len(data['regions']), 'Provinces mappings:', sum(len(v) for v in data['provinces_by_region'].values()), 'Cities:', len(data['cities_by_province']), 'Barangay city keys:', len(data['barangays_by_city']))


if __name__ == '__main__':
    main()
