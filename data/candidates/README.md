Agent-generated guides awaiting human review land here via: npm run guide:generate -- "<app>"

The JSON and audit files are gitignored on purpose: a candidate is promoted to data/guides/ only after a human diff (npm run guide:generate -- "<app>" --promote).
