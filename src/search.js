import db from "./db.js";

let resultContainer = document.getElementById("search-results-container");

export function initSearch() {
const searchBtn = document.getElementById("search-btn");
const searchInput = document.getElementById("global-search");
const resetBtn = document.getElementById("reset-btn");
const selectedRaktar = document.getElementById("raktarSelect");

  if (searchBtn) {
    searchBtn.addEventListener("click", executeSearch);
  }

  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        executeSearch();
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
      }
      if (selectedRaktar) {
        selectedRaktar.value = "";
      }

      if (resultContainer) {
        resultContainer.innerHTML = "";
      }
    });
  }
}

async function executeSearch() {
  const query = document
    .getElementById("global-search")
    .value.toLowerCase()
    .trim();

    const selectedRaktar = document.getElementById("raktarSelect")?.value || "";

  try {
    // 1. Összes doboz beolvasása az IndexedDB-ből (Dexie)
    const mindazDoboz = await db.dobozok.toArray();

    // 2. Szűrés végrehajtása
    const talalatok = mindazDoboz.filter((doboz) => {
      // Szöveges egyezés (fondszám, megnevezés, dobozszám)
      const matchesQuery =
        !query ||
        (doboz.fondszam &&
          doboz.fondszam.toString().toLowerCase().includes(query)) ||
        (doboz.megnevezes && doboz.megnevezes.toLowerCase().includes(query)) ||
        (doboz.dobozszam && doboz.dobozszam.toString().includes(query));

      // Raktár szűrés ("0" vagy üres string esetén az összes raktárban keres)
      const matchesRaktar =
        !selectedRaktar ||
        selectedRaktar === "0" ||
        doboz.raktarId === Number(selectedRaktar);

      return matchesQuery && matchesRaktar;
    });

    // 3. Eredmények kirajzolása
    renderSearchResults(talalatok);
  } catch (error) {
    console.error("Hiba a keresés során:", error);
  }
}

function renderSearchResults(talalatok) {
  // Ha még nincs jelen a találati konténer, hozzuk létre a kereső gomb alatt
  if (!resultContainer) {
    resultContainer = document.createElement("div");
    resultContainer.id = "search-results-container";
    resultContainer.className = "mt-4 mb-4";

    const searchBtn = document.getElementById("search-btn");
    searchBtn.parentNode.insertBefore(resultContainer, searchBtn.nextSibling);
  }

  // Ha nincs találat
  if (talalatok.length === 0) {
    resultContainer.innerHTML = `
      <div class="alert alert-warning text-center" role="alert">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>Nincs a keresési feltételeknek megfelelő doboz.
      </div>
    `;
    return;
  }

  // Táblázat felépítése
  let html = `
    <div class="card shadow-sm border-0">
      <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0"><i class="bi bi-search me-2"></i>Keresési találatok (${talalatok.length} db)</h5>
        <button class="btn btn-sm btn-outline-light" id="close-search-results"><i class="bi bi-x-lg"></i> Bezárás</button>
      </div>
      <div class="table-responsive">
        <table class="table table-hover table-striped align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Fondszám</th>
              <th>Dobozszám</th>
              <th>Megnevezés</th>
              <th>Évkör</th>
              <th>Státusz</th>
              <th>Folyóméter</th>
              <th>Művelet</th>
            </tr>
          </thead>
          <tbody>
  `;

  talalatok.forEach((d) => {
    html += `
      <tr>
        <td class="fw-bold text-primary">${d.fondszam || "-"}. fond</td>
        <td>${d.dobozszam || "-"}</td>
        <td>${d.megnevezes || "Nincs megnevezés"}</td>
        <td>${d.evkor || "-"}</td>
        <td>
          <span class="badge ${d.statusz === "raktarban" ? "bg-success" : "bg-warning text-dark"}">
            ${d.statusz || "Ismeretlen"}
          </span>
        </td>
        <td>${d.folyometer ? d.folyometer + " fm" : "-"}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary show-box-location" data-box-id="${d.id}">
            <i class="bi bi-geo-alt-fill me-1"></i>Megjelenítés
          </button>
        </td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  resultContainer.innerHTML = html;

  document
    .getElementById("close-search-results")
    .addEventListener("click", () => {
      resultContainer.innerHTML = "";
    });
}
