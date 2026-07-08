const db = new Dexie("raktarkataszterDB");

db.version(2).stores({
  raktarak: "++id, megnevezes",
  dobozok:
    "++id, fondszam, allagszam, evkor, dobozszam, raktarId, allvanyId, polcId, statusz, megjegyzes",
  polcok: "id, raktarId, sor, allvany, polcSzint"
});

export default db;
