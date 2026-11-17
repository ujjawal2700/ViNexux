# Urban city/town options

Source: [Office of the Registrar General & Census Commissioner, India — Basic Population Figures, Census 2011](https://censusindia.gov.in/nada/index.php/catalog/42559/download/46185/2011-IndiaStateDistSbDistTwn-0000.xlsx). Extracted 2026-11-16.

Only source rows with `Level = TOWN` and `TRU = Urban` are accepted. Rural records, outgrowth aggregates, numbered settlement names and names explicitly labelled Village are excluded. No population cutoff is used. The form does not offer free-text additions. Source town codes are retained in each file for auditing. Small fallback lists come from the same accepted urban records.

This is a 2011 urban directory, not a claim about every subsequent municipal notification. Telangana and Ladakh are assigned using the source district codes for the state/UT splits; the former Dadra/Nagar Haveli and Daman/Diu datasets are combined. Chittaurgarh is displayed as Chittorgarh, Greater Mumbai as Mumbai, Ahmadabad as Ahmedabad and Leh Ladakh as Leh, retaining source spellings as aliases. Urban city-part rows are consolidated under their city name.

Rebuild with `python3 scripts/build-india-place-data.py /path/2011-IndiaStateDistSbDistTwn-0000.xlsx`.

Input SHA-256: `da487f7a1181fd9f43ccf354a8b5864ffca5920fc82b5183d644d483445cb380`

7,692 city/town names across 36 states and union territories.
