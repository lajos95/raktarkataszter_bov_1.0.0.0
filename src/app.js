import db from "./db.js";
import { renderStorageTree, renderFloorPlan, renderDetailedTree, updateWarehouseRunningMeters, renderDataDetails, setViewMode,
  currentViewMode, renderRunningMeters, renderFondjegyzekHTML, frissitPolckep, initAthelyezoEsemenyek } from "./ui.js";
import { renderFondDistributionChart, renderFondMeterDistributionChart } from "./charts.js";
import { initSearch } from "./search.js";

async function AdatBetoltes() {
  const polcSzam = await db.polcok.count();
  const fondJegyzek = await db.fondjegyzek.count();

    try {
      const response = await fetch("./data/egysegek.json", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(
          `Nem sikerült beolvasni a JSON fájlt: ${response.statusText}!`,
        );
      }

      const egysegAdatok = await response.json();
      await db.egysegek.clear();
      await db.egysegek.bulkAdd(egysegAdatok);
      console.log(
        `${egysegAdatok.length} db egység sikeresen beolvasva a JSON fájlból!`,
      );
    } catch (error) {
      console.error("Hiba történt a JSON beolvasása közben:", error);
    }

  if (polcSzam === 0) {
    try {
      const response2 = await fetch("./data/polcok.json");

      if (!response2.ok) {
        throw new Error(
          `Nem sikerült beolvasni a JSON fájlt: ${response2.statusText}!`,
        );
      }
      const polcAdatok = await response2.json();
      await db.polcok.bulkAdd(polcAdatok);
      console.log(
        `${polcAdatok.length} db egység sikeresen beolvasva a JSON fájlból!`,
      );
    } catch (error) {
      console.error("Hiba történt a JSON beolvasása közben:", error);
    }
  }

  if (fondJegyzek === 0) {
    try {
      const response3 = await fetch("./data/fondjegyzek.json");
      if (!response3.ok) {
        throw new Error(
          `HTTP hiba! Státusz: ${response3.status} (${response3.statusText}) - Nem található a fájl a ./data/fondjegyzek.json útvonalon.`,
        );
      }
      const fondAdatok = await response3.json();
      await db.fondjegyzek.bulkAdd(fondAdatok);
      console.log(`${fondAdatok.length} db fondjegyzék elem beolvasva!`);
    } catch (error) {
      console.error("Hiba a fondjegyzék JSON beolvasása közben:", error.message || error);
    }
  }

  const osszesEgyseg = await db.egysegek.toArray();
  const raktarak = [];
  const latottRaktarak = new Set();

  osszesEgyseg.forEach((egyseg) => {
    if (!latottRaktarak.has(egyseg.raktarId)) {
      latottRaktarak.add(egyseg.raktarId);
      const storageName =
        egyseg.raktarNev || `${egyseg.raktarId}. sz. Központi Raktár`;
      raktarak.push({
        id: egyseg.raktarId,
        nev: storageName,
      });
    }
  });
  renderStorageTree(raktarak);
  renderFondDistributionChart('fondDobozChart');
  renderFondMeterDistributionChart('fondMeterChart');
  await renderFloorPlan();
  if (raktarak.length > 0) {
    await updateWarehouseRunningMeters(raktarak[0].id, raktarak[0].nev);
    await renderDetailedTree();
  }
  await renderRunningMeters();
}

async function initApp() {
  initNavigationListeners();
  initBoxClickListener();
  initViewToggleListeners();
  initSearch();
  initAthelyezoEsemenyek();
  
  try {
    await AdatBetoltes();
    await frissitPolckep();
    console.log("Alkalmazás sikeresen elindult!");

    setInterval(async () => {
      await AdatBetoltes();
      await frissitPolckep();
      console.log("Adatbázis frissült!");
    }, 30000);

  } catch (error) {
    console.error("Hiba történt az alkalmazás indításakor:", error);
  }
}

function initBoxClickListener() {
  document.addEventListener("click", async (e) => {
    const egysegElem = e.target.closest(".archive-box");
    if (!egysegElem) return;

    const keresettEgyseg = Number(egysegElem.dataset.id);

    try {
      const egyseg = await db.egysegek.where("id").equals(keresettEgyseg).first();
      if (!egyseg) return;

      const polc = await db.polcok.where("id").equals(egyseg.polcId).first();
      renderDataDetails(egyseg, polc);
    } catch (error) {
      console.error("Hiba történt a doboz részletes adatainak lekérésekor:", error);
    }
  });
}

function initViewToggleListeners() {
  const btnVisual = document.getElementById("btn-view-visual");
  const btnTable = document.getElementById("btn-view-table");

  if (btnVisual && btnTable) {
    btnVisual.addEventListener("click", () => {
      if (currentViewMode === "visual") return;
      btnVisual.classList.add("active");
      btnTable.classList.remove("active");
      setViewMode("visual");
    });

    btnTable.addEventListener("click", () => {
      if (currentViewMode === "table") return;
      btnTable.classList.add("active");
      btnVisual.classList.remove("active");
      setViewMode("table");
    });
  }
}

function initNavigationListeners() {
  const targetElements = document.querySelectorAll("[data-target]");

  targetElements.forEach((element) => {
    element.addEventListener("click", async () => {
      const targetId = element.getAttribute("data-target");

      const views = [
        document.getElementById("landing"),
        document.getElementById("charts"),
        document.getElementById("kataszter"),
        document.getElementById("fondjegyzek")
      ];

      views.forEach((view) => {
        if (view) {
          view.classList.remove("display_block");
          view.classList.add("display_none");
        }
      });

      const targetView = document.getElementById(targetId);
      if (targetView) {
        targetView.classList.remove("display_none");
        targetView.classList.add("display_block");
      }

      if (targetId === "fondjegyzek") {
        try {
          const fondok = await db.fondjegyzek.toArray();
          renderFondjegyzekHTML(fondok);
        } catch (error) {
          console.error("Hiba a fondjegyzék betöltésekor:", error);
        }
      }
    })
  })
}

document.addEventListener("DOMContentLoaded", initApp);
