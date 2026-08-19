import db from "./db.js";
import { renderStorageTree, renderFloorPlan, renderDetailedTree, updateWarehouseRunningMeters, renderBoxDetails, setViewMode,
  currentViewMode, renderRunningMeters, renderFondjegyzekHTML } from "./ui.js";
import { renderFondDistributionChart, renderFondMeterDistributionChart } from "./charts.js";

async function AdatBetoltes() {
  await db.dobozok.clear();
  await db.polcok.clear();
  await db.fondjegyzek.clear();
  const dobozSzam = await db.dobozok.count();
  const polcSzam = await db.polcok.count();
  const fondJegyzek = await db.fondjegyzek.count();

  if (dobozSzam === 0) {
    try {
      const response = await fetch("./data/dobozok.json");

      if (!response.ok) {
        throw new Error(
          `Nem sikerült beolvasni a JSON fájlt: ${response.statusText}!`,
        );
      }

      const dobozAdatok = await response.json();
      await db.dobozok.bulkAdd(dobozAdatok);
      console.log(
        `${dobozAdatok.length} db egység sikeresen beolvasva a JSON fájlból!`,
      );
    } catch (error) {
      console.error("Hiba történt a JSON beolvasása közben:", error);
    }
  } else {
    console.log(`A kataszter aktív. ${dobozSzam} db egység van betöltve.`);
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
          `Nem sikerült beolvasni a JSON fájlt: ${response3.statusText}!`,
        );
      }
      const fondAdatok = await response3.json();
      await db.fondjegyzek.bulkAdd(fondAdatok);
      console.log(`${fondAdatok.length} db fondjegyzék elem beolvasva!`);
    } catch (error) {
      console.error("Hiba a fondjegyzék JSON beolvasása közben:", error);
    }
  }

  const osszesDoboz = await db.dobozok.toArray();
  const raktarak = [];
  const latottRaktarak = new Set();

  osszesDoboz.forEach((doboz) => {
    if (!latottRaktarak.has(doboz.raktarId)) {
      latottRaktarak.add(doboz.raktarId);
      const storageName =
        doboz.raktarNev || `${doboz.raktarId}. sz. Központi Raktár`;
      raktarak.push({
        id: doboz.raktarId,
        nev: storageName,
      });
    }
  });
  renderStorageTree(raktarak);
  renderFondDistributionChart('fondDobozChart');
  renderFondMeterDistributionChart('fondMeterChart');
  await updateWarehouseRunningMeters(raktarak[0].id, raktarak[0].nev);
  await renderDetailedTree(raktarak[0].id, raktarak[0].nev);
  await renderRunningMeters();
}

async function initApp() {
  initNavigationListeners();
  initBoxClickListener();
  initViewToggleListeners();
  try {
    await AdatBetoltes();

    console.log("Alkalmazás sikeresen elindult!");
  } catch (error) {
    console.error("Hiba történt az alkalmazás indításakor:", error);
  }
}

function initBoxClickListener() {
  const shelfContent = document.querySelector(".shelf-content");
  shelfContent.addEventListener("click", async (e) => {
    const dobozElem = e.target.closest(".archive-box");
    if (!dobozElem) return;

    const keresettDoboz = Number(dobozElem.dataset.dobozszam);

    try {
      const doboz = await db.dobozok.where("dobozszam").equals(keresettDoboz).first();
      if (!doboz) return;

      const polc = await db.polcok.where("id").equals(doboz.polcId).first();
      renderBoxDetails(doboz, polc);
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
