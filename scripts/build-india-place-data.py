"""Extract urban city/town options from the official Census of India workbook.
Usage: python3 scripts/build-india-place-data.py /path/2011-IndiaStateDistSbDistTwn-0000.xlsx
No population threshold or rural gazetteer records are used.
"""
import hashlib
import json
import re
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

root = Path(__file__).resolve().parents[1]
workbook = Path(sys.argv[1])
source_url = 'https://censusindia.gov.in/nada/index.php/catalog/42559/download/46185/2011-IndiaStateDistSbDistTwn-0000.xlsx'
state_names = dict(zip(range(1, 36), [
    'Jammu and Kashmir', 'Himachal Pradesh', 'Punjab', 'Chandigarh', 'Uttarakhand', 'Haryana', 'Delhi', 'Rajasthan',
    'Uttar Pradesh', 'Bihar', 'Sikkim', 'Arunachal Pradesh', 'Nagaland', 'Manipur', 'Mizoram', 'Tripura', 'Meghalaya',
    'Assam', 'West Bengal', 'Jharkhand', 'Odisha', 'Chhattisgarh', 'Madhya Pradesh', 'Gujarat',
    'Dadra and Nagar Haveli and Daman and Diu', 'Dadra and Nagar Haveli and Daman and Diu', 'Maharashtra',
    'Andhra Pradesh', 'Karnataka', 'Goa', 'Lakshadweep', 'Kerala', 'Tamil Nadu', 'Puducherry', 'Andaman and Nicobar Islands',
]))
places = {state: {} for state in {*state_names.values(), 'Telangana', 'Ladakh'}}
# Display familiar spellings while retaining the source spelling as a search alias.
display_names = {'Chittaurgarh': 'Chittorgarh', 'Greater Mumbai': 'Mumbai', 'Ahmadabad': 'Ahmedabad', 'Leh Ladakh': 'Leh'}
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with ZipFile(workbook) as archive:
    strings = [''.join(item.itertext()) for item in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('s:si', ns)]
    for _, row in ET.iterparse(archive.open('xl/worksheets/sheet1.xml'), events=('end',)):
        if row.tag != '{' + ns['s'] + '}row':
            continue
        values = {}
        for cell in row:
            column = re.sub(r'\d', '', cell.get('r', ''))
            if column not in {'A', 'B', 'D', 'G', 'H', 'I', 'K'}:
                continue
            value = cell.find('s:v', ns)
            if value is not None:
                values[column] = strings[int(value.text)] if cell.get('t') == 's' else value.text
        row.clear()
        if values.get('G') != 'TOWN' or values.get('I') != 'Urban':
            continue
        state_code = int(values['A'])
        state = state_names[state_code]
        # Map the 2011 district codes to today's state/UT selectors.
        if state_code == 1 and values['B'] in {'003', '004'}:
            state = 'Ladakh'
        if state_code == 28 and 532 <= int(values['B']) <= 541:
            state = 'Telangana'
        raw_name = values['H'].strip()
        # Exclude outgrowth aggregates; urban city-part rows consolidate by name.
        if '+ OG' in raw_name or '(OG)' in raw_name:
            continue
        name = re.sub(r'\s*\([^()]*\)', '', raw_name).strip()
        # Numbered colonies and entries explicitly labelled Village are not city options.
        if not name or not name[0].isalpha() or re.search(r'\bvillage\b', name, re.I):
            continue
        name = display_names.get(name, name)
        population = int(values.get('K', '0'))
        previous = places[state].get(name)
        if previous is None or population > previous['population']:
            places[state][name] = {'population': population, 'code': values['D'], 'source_name': raw_name}

manifest, fallbacks = {}, {}
directory = root / 'frontend/public/data/india-places'
directory.mkdir(parents=True, exist_ok=True)
for state, cities in sorted(places.items()):
    slug = re.sub('[^a-z0-9]+', '-', state.lower()).strip('-')
    aliases = {name: [re.sub(r'\s*\([^()]*\)', '', record['source_name']).strip()] for name, record in cities.items() if re.sub(r'\s*\([^()]*\)', '', record['source_name']).strip() != name}
    data = {'state': state, 'classification': 'urban', 'names': sorted(cities), 'aliases': aliases,
            'urbanCodes': {name: record['code'] for name, record in sorted(cities.items())}}
    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n'
    (directory / f'{slug}.json').write_text(payload)
    manifest[state] = {'file': slug + '.json', 'version': hashlib.sha256(payload.encode()).hexdigest()[:12], 'count': len(cities)}
    fallbacks[state] = sorted(sorted(cities, key=lambda name: (-cities[name]['population'], name))[:30])
(root / 'frontend/src/data/indiaPlacesManifest.js').write_text('// Generated from Census of India urban town records.\nexport const INDIA_PLACE_FILES = ' + json.dumps(manifest, indent=2) + ';\n')
(root / 'frontend/src/data/indiaCityFallbacks.js').write_text('// Generated from the same Census urban records; no rural fallback names.\nexport const INDIA_CITY_FALLBACKS = ' + json.dumps(fallbacks, ensure_ascii=False, indent=2) + ';\n')
(directory / 'README.md').write_text(f'''# Urban city/town options\n\nSource: [Office of the Registrar General & Census Commissioner, India — Basic Population Figures, Census 2011]({source_url}). Extracted {date.today().isoformat()}.\n\nOnly source rows with `Level = TOWN` and `TRU = Urban` are accepted. Rural records, outgrowth aggregates, numbered settlement names and names explicitly labelled Village are excluded. No population cutoff is used. The form does not offer free-text additions. Source town codes are retained in each file for auditing. Small fallback lists come from the same accepted urban records.\n\nThis is a 2011 urban directory, not a claim about every subsequent municipal notification. Telangana and Ladakh are assigned using the source district codes for the state/UT splits; the former Dadra/Nagar Haveli and Daman/Diu datasets are combined. Chittaurgarh is displayed as Chittorgarh, Greater Mumbai as Mumbai, Ahmadabad as Ahmedabad and Leh Ladakh as Leh, retaining source spellings as aliases. Urban city-part rows are consolidated under their city name.\n\nRebuild with `python3 scripts/build-india-place-data.py /path/2011-IndiaStateDistSbDistTwn-0000.xlsx`.\n\nInput SHA-256: `{hashlib.sha256(workbook.read_bytes()).hexdigest()}`\n\n{sum(v['count'] for v in manifest.values()):,} city/town names across {len(manifest)} states and union territories.\n''')
print(json.dumps({'states': len(manifest), 'names': sum(v['count'] for v in manifest.values()), 'rajasthan': manifest['Rajasthan']}))
