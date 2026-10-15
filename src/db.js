const db = new Dexie("raktarkataszterDB");

db.version(3).stores({
  raktarak: "++id, megnevezes",
  egysegek:
    "++id, egysegTipus, fondszam, allagszam, evkor, egysegSzam, raktarId, allvanyId, polcId, statusz, megjegyzes, folyometer",
  polcok: "id, raktarId, sor, allvany, polcSzint",
  fondjegyzek: "++id, fondszam, megnevezes, evkor, folyometer",
});

export default db;
