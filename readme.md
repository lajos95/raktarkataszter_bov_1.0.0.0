# ArchívKataszter

Az **ArchívKataszter** egy modern, webes alapú levéltári raktárkataszter és leltárkezelő alkalmazás, amely kifejezetten levéltári iratanyagok, fondok és raktári egységek digitális nyilvántartására, vizuális kezelésére és statisztikai elemzésére lett tervezve.

## 🚀 Főbb jellemzők

* **Hierarchikus raktári struktúra:** Raktárak, sorok, állványok és polcszintek áttekinthető facsomóponti (tree) megjelenítése.
* **Kettős nézetmód (Vizuális és Táblázatos):**
  * **Vizuális polckép:** Dobozok / egységek színkódozott megjelenítése polcok szerint a fizikai elhelyezkedés szimulálásához.
  * **Táblázatos nézet:** Részletes, listás adatszűrés és áttekintés.
* **Intelligens kereső és szűrő:** Gyors keresés fondszám, állagszám vagy egységszám alapján.
* **Statisztikák és diagramok (Chart.js):**
  * Raktári telítettségi áttekintések és folyóméter (fm) alapú kalkulációk.
  * Fond- és méretmegoszlási vizuális diagramok.
* **Kliensoldali perzisztencia:** A böngészőn belüli nagy teljesítményű **Dexie.js / IndexedDB** adatbázis-kezelés biztosítja a gyors működést offline/lokális környezetben is.
* **Interaktív modális szerkesztők:** Egységek adatainak módosítása, státuszkezelése (pl. Raktárban, Kutatóteremben, Kölcsönzött) és polcok közötti áthelyezése.

## 🛠️ Technológiai stack

* **Frontend:** HTML5, CSS3, Bootstrap (reszponzív UI)
* **Logika:** Vanilla JavaScript (ES Modules)
* **Adatbázis:** IndexedDB (Dexie.js wrapperrel)
* **Grafikonok:** Chart.js

## 📂 Projekt struktúra

```text
├── css/                  # Stíluslapok
├── src/                  # JavaScript modulok
│   ├── app.js            # Fő belépési pont és inicializálás
│   ├── ui.js             # Vizuális komponensek és DOM renderelés
│   ├── db.js             # IndexedDB / Dexie adatbázis konfiguráció
│   ├── search.js         # Keresési logikák
│   └── charts.js         # Chart.js diagramok
├── data/                 # Alapértelmezett JSON adatok (polcok, egységek, fondjegyzék)
└── index.html            # Fő felület
```

## ⚙️ Használat és futtatás

Mivel az alkalmazás moduláris ES-modulokat (`import`/`export`) használ, a helyes működéshez ajánlott egy lokális fejlesztői szerver (például a VS Code *Live Server* kiegészítése) használata a fájlok közvetlen megnyitása (`file://`) helyett.

### 📂 Adatkezelés és Módosítások (Lokális mód)
Mivel az alkalmazás kliensoldalon (IndexedDB) dolgozik, a dobozok adatainak módosítása, áthelyezése vagy új egységek rögzítése után **a program automatikusan letölt egy frissített `egysegek.json` fájlt**[cite: 3]. 
* **Fontos lépés:** Ahhoz, hogy a módosítások érvényesüljenek a helyi mappastruktúrában, a letöltött fájllal **felül kell írni** a projekt `data/egysegek.json` fájlját a gyökérmappán belül.