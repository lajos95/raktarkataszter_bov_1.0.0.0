import db from "./db.js";

let resultContainer = document.getElementById("search-results-container");

let currentSearchResults = [];

export function initSearch() {
const searchBtn = document.getElementById("search-btn");
const searchInput = document.getElementById("global-search");
const resetBtn = document.getElementById("reset-btn");
const selectedRaktar = document.getElementById("raktarSelect");
const statusCheckboxes = document.querySelectorAll('#kataszter input[type="checkbox"]');

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

  statusCheckboxes.forEach((cb) => {
    cb.addEventListener("change", applyFiltersAndRender);
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
      }
      if (selectedRaktar) {
        selectedRaktar.value = "";
      }
      
      statusCheckboxes.forEach((cb) => (cb.checked = false));

      currentSearchResults = [];
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

    if (!query && (selectedRaktar === "")) {
    currentSearchResults = [];
    if (resultContainer) {
      resultContainer.innerHTML = `
        <div class="alert alert-info text-center mt-3" role="alert">
          <i class="bi bi-info-circle me-2"></i>Kérlek adj meg egy keresőszót és válassz raktárat!
        </div>
      `;
    }
    return;
  }

  try {
    const mindenEgyseg = await db.egysegek.toArray();

    currentSearchResults = mindenEgyseg.filter((egyseg) => {
      const matchesQuery =
        !query ||
        (egyseg.fondszam &&
          egyseg.fondszam.toString().toLowerCase().includes(query)) ||
        (egyseg.megnevezes && egyseg.megnevezes.toLowerCase().includes(query)) ||
        (egyseg.egysegSzam && egyseg.egysegSzam.toString().includes(query));

      const matchesRaktar =
        selectedRaktar === "0" ||
        egyseg.raktarId === Number(selectedRaktar);

      return matchesQuery && matchesRaktar;
    });

    applyFiltersAndRender();

  } catch (error) {
    console.error("Hiba a keresés során:", error);
  }
}

function applyFiltersAndRender() {
  if (!currentSearchResults || currentSearchResults.length === 0) {
    return;
  }

  const checkedStatuses = Array.from(document.querySelectorAll('#kataszter input[type="checkbox"]:checked')).map((cb) => cb.value.toLowerCase());

  const szurtTalalatok = currentSearchResults.filter((egyseg) => {
    const egysegStatus = (egyseg.statusz || "").toLowerCase();
    return (
      checkedStatuses.length === 0 || checkedStatuses.includes(egysegStatus)
    )
  });

  renderSearchResults(szurtTalalatok);
}

function renderSearchResults(talalatok) {
  if (!resultContainer) {
    resultContainer = document.createElement("div");
    resultContainer.id = "search-results-container";
    resultContainer.className = "mt-4 mb-4";

    const searchBtn = document.getElementById("search-btn");
    searchBtn.parentNode.insertBefore(resultContainer, searchBtn.nextSibling);
  }

  if (talalatok.length === 0) {
    resultContainer.innerHTML = `
      <div class="alert alert-warning text-center" role="alert">
        <i class="bi bi-collection-fill me-2"></i>Nincs a keresési feltételeknek megfelelő egység.
      </div>
    `;
    return;
  }

  let html = `
    <div class="card shadow-sm border-0">
      <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0"><i class="bi bi-collection me-2"></i>Keresési találatok (${talalatok.length} db)</h5>
        <button class="btn btn-sm btn-outline-light" id="close-search-results"><i class="bi bi-x-lg"></i> Bezárás</button>
      </div>
      <div class="table-responsive">
        <table class="table table-hover table-striped align-middle mb-0">
          <thead>
            <tr class="text-center">
              <th class="table-warning border">Fondszám</th>
              <th class="table-warning border">Egységszám</th>
              <th class="table-warning border">Megnevezés</th>
              <th class="table-warning border">Évkör</th>
              <th class="table-warning border">Státusz</th>
              <th class="table-warning border">Folyóméter</th>
              <th class="table-warning border">Művelet</th>
            </tr>
          </thead>
          <tbody>
  `;

  talalatok.forEach((e) => {

    if (e) {
      let isOut = "";

      switch (e.statusz) {
        case "raktarban":
        default:
          isOut = "bg-warning-subtle text-dark";
          break;
        case "Kiemelve":
          isOut = "bg-info text-white";
          break;
        case "Kölcsönzött":
          isOut = "bg-danger-subtle text-danger";
          break;
        case "Kutatóteremben":
          isOut = "bg-success text-white";
          break;
      }

    html += `
      <tr class="text-center">
        <td class="fw-bold text-primary border">${e.fondszam || "-"}. fond</td>
        <td class="border">${e.egysegSzam || "-"}</td>
        <td class="border">${e.megnevezes || "Nincs megnevezés"}</td>
        <td class="border">${e.evkor || "-"}</td>
        <td class="border">
          <span class="badge ${isOut}">
          ${e.statusz}
          </span>
        </td>
        <td class="border">${e.folyometer ? e.folyometer + " fm" : "-"}</td>
        <td class="border">
          <button class="btn btn-sm btn-outline-primary show-box-location" data-box-id="${e.id}">
            <i class="bi bi-geo-alt-fill me-1"></i>Megjelenítés
          </button>
        </td>
      </tr>
    `;
    }
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
