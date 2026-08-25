import db from "./db.js";

export let currentViewMode = "visual";
let lastShelfData = null;

export function setViewMode(mode) {
  currentViewMode = mode;
  if (lastShelfData) {
    renderShelfContent(
      lastShelfData.raktarNev,
      lastShelfData.sorNev,
      lastShelfData.allvanyNev,
      lastShelfData.polcok,
      lastShelfData.dobozok,
    );
  }
}

export async function renderRunningMeters() {
  try {
    let osszesPolc = await db.polcok.toArray();
    let teljesKapacitasFm = osszesPolc.reduce((sum, polc) => sum + (Number(polc.hosszFolyometer) || 0), 0);

    let osszesDoboz = await db.dobozok.toArray();
    let osszesFoglaltFm = osszesDoboz.reduce((sum, doboz) => sum + (Number(doboz.hosszFolyometer) || 0.12), 0);

    let globalPercent = 0;
    if (teljesKapacitasFm > 0) {
      globalPercent = Math.round((osszesFoglaltFm / teljesKapacitasFm) * 100);
    }

    const subtitleEl = document.getElementById("global-stats-subtitle");
    const progressBarEl = document.getElementById("global-progress-bar");
    const percentBadgeEl = document.getElementById("global-percent-badge");

    if (subtitleEl) {
      subtitleEl.textContent = `Teljes állomány: ${osszesFoglaltFm.toFixed(2)} fm / ${teljesKapacitasFm.toFixed(2)} fm (Összesen ${osszesDoboz.length} doboz)`;
    }

    if (progressBarEl && percentBadgeEl) {
      progressBarEl.style.width = `${globalPercent}%`;
      progressBarEl.setAttribute("aria-valuenow", globalPercent);
      progressBarEl.textContent = `${globalPercent}%`;

      percentBadgeEl.textContent = `${globalPercent}%`;

      let statusClass = "bg-success";
      if (globalPercent >= 85) {
        statusClass = "bg-danger";
      } else if (globalPercent >= 60) {
        statusClass = "bg-warning text-dark";
      }

      progressBarEl.className = `progress-bar ${statusClass}`;
      percentBadgeEl.className = `badge fs-6 ${statusClass}`;
    }
  } catch (error) {
    console.error("Hiba az összesített statisztika kiszámításakor:", error);
  }
}

export function renderStorageTree(raktarak) {
  const storageTree = document.getElementById("storage-tree");

  if (!storageTree) return;

  storageTree.innerHTML = "";

  raktarak.forEach((raktar) => {
    const li = document.createElement("li");
    li.className = "tree-item mb-2 p-2 rounded list_style_type_none";
    li.style.cursor = "pointer";
    li.dataset.raktarid = raktar.id;
    li.innerHTML = `<i class="bi bi-door-closed-fill text-warning me-2"></i><span class="fw-bold">${raktar.nev}</span>`;
    li.addEventListener("click", () => {
      document
        .querySelectorAll("#storage-tree .tree-item")
        .forEach((item) => item.classList.remove("bg-secondary", "text-white"));
      li.classList.add("bg-secondary", "text-white");
      renderDetailedTree(raktar.id, raktar.nev);
      updateWarehouseRunningMeters(raktar.id, raktar.nev);
    });
    storageTree.appendChild(li);
  });
}

export async function renderDetailedTree() {
  const detailedTreeContainer = document.querySelector(".warehouse-tree");
  if (!detailedTreeContainer) return;

  try {
    const osszesPolc = await db.polcok.toArray();

    const faStruktura = {};

    osszesPolc.forEach((polc) => {
      const rId = polc.raktarId;
      const rNev = polc.raktarNev || `${rId}. sz. Központi Raktár`;
      const s = polc.sor;
      const a = polc.allvany;

      if (!faStruktura[rId]) {
        faStruktura[rId] = {
          nev: rNev,
          sorok: {}
        };
      }
      if (!faStruktura[rId].sorok[s]) {
        faStruktura[rId].sorok[s] = {};
      }
      if (!faStruktura[rId].sorok[s][a]) {
        faStruktura[rId].sorok[s][a] = [];
      }

      faStruktura[rId].sorok[s][a].push(polc);
    });

    let html = "";

    Object.keys(faStruktura)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((raktarId) => {
        const raktarData = faStruktura[raktarId];
        const safeRaktarId = String(raktarId).replace(/[^a-zA-Z0-9]/g, "_");

        html += `
          <li class="tree-item room mb-2">
              <div class="tree-header d-flex align-items-center" data-bs-toggle="collapse" data-bs-target="#room-${safeRaktarId}-collapse" style="cursor: pointer;">
                  <i class="bi bi-chevron-down toggle-icon me-2 text-muted"></i>
                  <i class="bi bi-door-closed-fill text-warning me-2"></i>
                  <span class="fw-bold">${raktarData.nev}</span>
              </div>
              <ul class="collapse list-unstyled ms-4 ps-2 border-start" id="room-${safeRaktarId}-collapse">
        `;

        Object.keys(raktarData.sorok)
          .sort()
          .forEach((sorKulcs) => {
            const safeSorKulcs = String(sorKulcs).replace(/[^a-zA-Z0-9]/g, "_");
            const sorId = `sor-${safeRaktarId}-${safeSorKulcs}`;

            html += `
              <li class="tree-item row-item mt-2">
                  <div class="tree-header d-flex align-items-center" data-bs-toggle="collapse" data-bs-target="#${sorId}-collapse" style="cursor: pointer;">
                      <i class="bi bi-chevron-down toggle-icon me-2 text-muted"></i>
                      <i class="bi bi-reception-4 text-primary me-2"></i>
                      <span>${sorKulcs}</span>
                  </div>
                  <ul class="collapse list-unstyled ms-4 ps-2 border-start" id="${sorId}-collapse">
            `;

            Object.keys(raktarData.sorok[sorKulcs])
              .sort()
              .forEach((allvanyKulcs) => {
                const safeAllvanyKulcs = String(allvanyKulcs).replace(/[^a-zA-Z0-9]/g, "_");
                const allvanyId = `allvany-${safeRaktarId}-${safeSorKulcs}-${safeAllvanyKulcs}`;

                html += `
                  <li class="tree-item rack-item mt-2">
                      <div class="tree-header d-flex align-items-center rack-link" data-raktarid="${raktarId}" data-raktarnev="${raktarData.nev}" data-sor="${sorKulcs}" data-allvany="${allvanyKulcs}">
                        <div data-bs-toggle="collapse" data-bs-target="#${allvanyId}-collapse">
                            <i class="bi bi-chevron-down toggle-icon me-2 text-muted"></i>
                            <i class="bi bi-grid-3x3 text-success me-2"></i>
                            <span class="fw-semibold">${allvanyKulcs}</span>
                        </div>
                      </div>
                      <ul class="collapse list-unstyled ms-4 ps-2 border-start" id="${allvanyId}-collapse">
                `;

                raktarData.sorok[sorKulcs][allvanyKulcs]
                  .sort((a, b) => a.polcSzint - b.polcSzint)
                  .forEach((polc) => {
                    html += `
                      <li class="tree-item shelf-item mt-1 py-1 px-2 rounded tree-link" data-polcid="${polc.id}">
                          <i class="bi bi-layers text-secondary me-2"></i>
                          <span>${polc.polcSzint}. polc (${polc.hosszFolyometer} fm)</span>
                      </li>
                    `;
                  });

                html += `</ul></li>`;
              });

            html += `</ul></li>`;
          });

        html += `</ul></li>`;
      });

    detailedTreeContainer.innerHTML = html;

    const firstRoom = detailedTreeContainer.querySelector('.room .collapse');
    if (firstRoom) firstRoom.classList.add('show');

    detailedTreeContainer.onclick = async function (e) {
      const shelfLink = e.target.closest(".tree-link");
      if (shelfLink) {
        e.stopPropagation();

        detailedTreeContainer
          .querySelectorAll(".rack-link, .tree-link")
          .forEach((el) => {
            el.classList.remove("bg-primary-subtle", "fw-bold", "text-primary");
          });

        shelfLink.classList.add("bg-primary-subtle", "fw-bold", "text-primary");

        const polcId = shelfLink.dataset.polcid;
        console.log("-> Polcszint sikeresen kiválasztva! Polc ID:", polcId);
        return;
      }

      const rackLink = e.target.closest(".rack-link");
      if (rackLink) {
        detailedTreeContainer
          .querySelectorAll(".rack-link, .tree-link")
          .forEach((el) => {
            el.classList.remove("bg-primary-subtle", "fw-bold", "text-primary");
          });

        rackLink.classList.add("bg-primary-subtle", "fw-bold");

        const rId = rackLink.dataset.raktarid;
        const rNev = rackLink.dataset.raktarnev;
        const sKulcs = rackLink.dataset.sor;
        const aKulcs = rackLink.dataset.allvany;

        const polcok = await db.polcok
          .where({ raktarId: Number(rId) || rId, sor: sKulcs, allvany: aKulcs })
          .toArray();

        const polcIdTomb = polcok.map((p) => p.id);

        const dobozok = await db.dobozok
          .where("polcId")
          .anyOf(polcIdTomb)
          .toArray();

        renderShelfContent(rNev, sKulcs, aKulcs, polcok, dobozok);

        const isCollapseTrigger = e.target.closest('[data-bs-toggle="collapse"]');

        if (!isCollapseTrigger) {
          const triggerEl = rackLink.querySelector('[data-bs-toggle="collapse"]');
          if (triggerEl) {
            const targetId = triggerEl.getAttribute("data-bs-target");
            const collapseEl = document.querySelector(targetId);
            if (collapseEl && typeof bootstrap !== "undefined") {
              const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false });
              bsCollapse.toggle();
            }
          }
        }
      }
    };
  } catch (error) {
    console.error("Hiba történt a részletes fa kirajzolásakor:", error);
  }
}

export async function renderFloorPlan() {
  const container = document.getElementById("warehouse-occupancy-card");
  if (!container) return;

  try {
    // 1. Összes polc és doboz lekérése az IndexedDB-ből
    const [osszesPolc, osszesDoboz] = await Promise.all([
      db.polcok.toArray(),
      db.dobozok.toArray()
    ]);

    // 2. Raktárak azonosítása és nevének gyűjtése
    const raktarMap = new Map();

    osszesPolc.forEach((polc) => {
      if (!raktarMap.has(polc.raktarId)) {
        raktarMap.set(polc.raktarId, {
          id: polc.raktarId,
          nev: `${polc.raktarId}. sz. Központi Raktár`,
          osszesKapacitasFm: 0,
          foglaltFm: 0,
          dobozSzam: 0
        });
      }
      const r = raktarMap.get(polc.raktarId);
      r.osszesKapacitasFm += Number(polc.hosszFolyometer) || 0;
    });

    // Dobozok összegzése raktár szerint
    osszesDoboz.forEach((doboz) => {
      if (raktarMap.has(doboz.raktarId)) {
        const r = raktarMap.get(doboz.raktarId);
        r.foglaltFm += Number(doboz.folyometer) || 0.12;
        r.dobozSzam += 1;
        if (doboz.raktarNev) {
          r.nev = doboz.raktarNev; // frissítés pontos névre, ha elérhető
        }
      }
    });

    // 3. HTML tartalom összeállítása az összes raktárra
    let html = `
      <div class="card-body">
        <h5 class="fw-bold mb-3 text-dark">
          <i class="bi bi-building me-2 text-primary"></i>Raktári Telítettségi Áttekintés
        </h5>
        <div class="row g-3">
    `;

    raktarMap.forEach((raktar) => {
      const szazalek = raktar.osszesKapacitasFm > 0 
        ? Math.round((raktar.foglaltFm / raktar.osszesKapacitasFm) * 100) 
        : 0;

      let statusClass = "bg-success";
      if (szazalek >= 85) {
        statusClass = "bg-danger";
      } else if (szazalek >= 50) {
        statusClass = "bg-warning text-dark";
      }

      html += `
        <div class="col-12 col-md-6 col-xl-4">
          <div class="border rounded p-3 bg-white shadow-sm h-100">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="fw-bold m-0 text-truncate">${raktar.nev}</h6>
              <span class="badge ${statusClass}">${szazalek}%</span>
            </div>
            <p class="small text-muted mb-2">
              Foglalt: <strong>${raktar.foglaltFm.toFixed(2)} fm</strong> / ${raktar.osszesKapacitasFm.toFixed(2)} fm 
              <br>(${raktar.dobozSzam} db doboz)
            </p>
            <div class="progress" style="height: 12px;">
              <div 
                class="progress-bar ${statusClass}" 
                role="progressbar" 
                style="width: ${szazalek}%" 
                aria-valuenow="${szazalek}" 
                aria-valuemin="0" 
                aria-valuemax="100">
              </div>
            </div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error("Hiba a raktári telítettség megjelenítésekor:", error);
  }
}

export async function updateWarehouseRunningMeters(raktarId, raktarNev) {
  try {
    const raktarPolcok = await db.polcok
      .where("raktarId")
      .equals(raktarId)
      .toArray();
    const maxKapacitasFm = raktarPolcok.reduce(
      (sum, polc) => sum + (polc.hosszFolyometer || 0),
      0,
    );
    const osszesDoboz = await db.dobozok
      .where("raktarId")
      .equals(raktarId)
      .toArray();
    const foglaltFm = osszesDoboz.reduce(
      (sum, doboz) => sum + (doboz.folyometer || 0),
      0,
    );
    let telitettsegPercent = 0;
    if (maxKapacitasFm > 0) {
      telitettsegPercent = Math.round((foglaltFm / maxKapacitasFm) * 100);
    }
    renderFloorPlan(
      raktarId,
      raktarNev,
      telitettsegPercent,
      foglaltFm,
      maxKapacitasFm,
    );
  } catch (error) {
    console.error(
      "Hiba történt a raktár futó métereinek frissítésekor:",
      error,
    );
  }
}

export function renderShelfContent(
  raktarNev,
  sorNev,
  allvanyNev,
  polcok,
  dobozok,
) {
  lastShelfData = { raktarNev, sorNev, allvanyNev, polcok, dobozok };

  const contentContainer = document.querySelector(".shelf-content");
  if (!contentContainer) return;

  const shelfTitle = document.getElementById("shelf-title");
  const shelfSubtitle = document.getElementById("shelf-subtitle");
  const shelfsSum = document.getElementById("shelfs");
  const shelfBoxes = document.getElementById("shelf-boxes");
  if (shelfTitle)
    shelfTitle.textContent = `${raktarNev}`;
  if (shelfSubtitle)
    shelfSubtitle.innerHTML = `<i class="bi bi-grid-3x3-gap-fill mt-2 me-2"></i>${sorNev} / ${allvanyNev}`;
  if (shelfsSum)
    shelfsSum.innerHTML = `<i class="bi bi-bookshelf mt-2"></i> Összesen ${polcok.length} polc`;
  if (shelfBoxes)
    shelfBoxes.innerHTML = `<i class="bi bi-box mt-2"></i> Összesen ${dobozok.length} doboz`;

  if (currentViewMode === "visual") {
    contentContainer.innerHTML = renderVisualShelfHTML(polcok, dobozok);
  } else {
    contentContainer.innerHTML = renderTableShelfHTML(polcok, dobozok);
  }
}

export function renderFondjegyzekHTML(fondjegyzek) {
  const container = document.getElementById("fondjegyzek_content");
  if(!container) return;

  if(!fondjegyzek || fondjegyzek.length === 0) {
    container.innerHTML = `<div class="alert alert-info">Nincsenek megjeleníthető fondok.</div>`;
    return;
  }

  let html = `
    <div class="table-responsive bg-white rounded shadow-sm border p-3">
      <table class="table table-hover align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>Fondszám</th>
            <th>Fondnév</th>
            <th>Évkör</th>
            <th>Folyóméter</th>
          </tr>
        </thead>
        <tbody>
  `;

  fondjegyzek.forEach((fond) => {
    html += `
      <tr>
        <td><span class="badge bg-primary fs-6">${fond.fondszam}. fond</span></td>
        <td class="fw-bold">${fond.megnevezes || "Nincs megadva"}</td>
        <td>${fond.evkor}</td>
        <td>${fond.folyometer} fm</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

function renderVisualShelfHTML(polcok, dobozok) {
  const rendezettPolcok = [...polcok].sort((a, b) => b.polcSzint - a.polcSzint);
  let html = `<div class="visual-rack d-flex flex-column gap-4">`;

  rendezettPolcok.forEach((polc) => {
    const polcDobozok = dobozok.filter((d) => d.polcId === polc.id);
    const maxKapacitas = 12;
    const foglaltFm = (polcDobozok.length * 0.12).toFixed(2);

    html += `
      <div class="shelf-layer bg-light p-3 rounded-3 border shadow-sm">
        <div class="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
          <h6 class="m-0 fw-bold text-secondary">
            <i class="bi bi-layers-fill me-1 text-primary"></i> ${polc.polcSzint}. polc
          </h6>
          <span class="badge ${polcDobozok.length === maxKapacitas ? "bg-danger" : "bg-success"}">
            ${polcDobozok.length} / ${maxKapacitas} doboz (${foglaltFm} / 1.44 fm)
          </span>
        </div>

        <div class="shelf-grid-12 d-grid gap-2" style="grid-template-columns: repeat(4, 1fr);">
    `;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {

        const slotIndex = (col * 3) + (3 - row - 1);
        const doboz = polcDobozok[slotIndex];

        if (doboz) {
          let bgClass = "";
          let iconClass = "";

          switch (doboz.statusz) {
            case "raktarban":
              default:
                bgClass = "bg-warning-subtle text-dark border-warning";
                iconClass = "bi-box-seam-fill text-warning";
                break;
            case "Kiemelve":
                bgClass = "bg-info text-white border-info";
                iconClass = "bi-person-bounding-box text-white";
                break;
            case "Kutatóteremben":
                bgClass = "bg-success text-white border-secondary-subtle";
                iconClass = "bi-book-fill text-dark";
                break;
            case "Kölcsönzött":
                bgClass = "bg-danger-subtle text-danger border-danger";
                iconClass = "bi-arrow-right-square-fill text-danger";
                break;
          }

          html += `
          <div class="archive-box ${bgClass} p-2 rounded border d-flex flex-column justify-content-between shadow-sm pointer" 
               data-dobozszam="${doboz.dobozszam}">
            <div class="d-flex justify-content-between align-items-center">
              <span class="badge bg-dark extra-small">${doboz.dobozszam}. doboz</span>
              <i class="bi ${iconClass} fs-6"></i>
            </div>
            <div class="fw-bold text-truncate small" title="${doboz.fondszam}. fond">${doboz.fondszam}. fond</div>
            <div class="text-muted extra-small" style="font-size: 0.7rem;">${doboz.evkor || ""}</div>
          </div>
        `;
        } else {
          html += `
          <div class="empty-slot p-2 rounded d-flex flex-column align-items-center justify-content-center text-muted">
            <i class="bi bi-plus-circle text-black-50 mb-1"></i>
            <span style="font-size: 0.65rem;">Szabad hely (${slotIndex + 1} / 12)</span>
          </div>
        `;
        }
      }
    }

      html += `
        </div>
      </div>
    `;
    
  });

  html += `</div>`;
  return html;
}

function renderTableShelfHTML(polcok, dobozok) {
  if (!dobozok || dobozok.length === 0) {
    return `<div class="alert alert-info">Ezen az állványon jelenleg nincsenek dobozok.</div>`;
  }

  let html = `
    <div class="table-responsive bg-white rounded shadow-sm border text-center">
      <table class="table table-hover align-middle mb-0">
        <thead class="table-dark">
          <tr>
            <th class="border">Polcszint</th>
            <th class="border">Dobozszám</th>
            <th class="border">Fondszám</th>
            <th class="border">Állagszám</th>
            <th class="border">Évkör</th>
            <th class="border">Státusz</th>
          </tr>
        </thead>
        <tbody>
  `;

  const rendezettDobozok = [...dobozok].sort(
    (a, b) => a.polcId - b.polcId || a.dobozszam - b.dobozszam,
  );

  rendezettDobozok.forEach((doboz) => {
    const polc = polcok.find((p) => p.id === doboz.polcId);
    const polcSzint = polc ? `${polc.polcSzint}. polc` : "-";
    
    if (doboz) {
      let isOut = "";

      switch (doboz.statusz) {
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
        <tr class="archive-box pointer" data-dobozszam="${doboz.dobozszam}" style="cursor: pointer;">
          <td class="border"><span class="badge bg-secondary-subtle text-dark">${polcSzint}</span></td>
          <td class="border"><strong class="text-primary">${doboz.dobozszam}. doboz</strong></td>
          <td class="border">${doboz.fondszam}. fond</td>
          <td class="border">${doboz.allagszam || "-"}. állag</td>
          <td class="border">${doboz.evkor || "-"}</td>
          <td class="border">
            <span class="badge ${isOut}">
              ${doboz.statusz}
            </span>
          </td>
        </tr>
      `;
    }
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

export function renderBoxDetails(doboz, polc) {
  const kiemeltDobozadat = document.getElementById("data_highlight");
  const takarasDiv = document.getElementById("takaras");

  kiemeltDobozadat.innerHTML = `
    <i class="bi bi-x-circle fs-3 pt-1 ps-5 infoicon pointer"></i>
    <h1>${doboz.megnevezes}</h1>
    <h2>${doboz.fondszam}. ${doboz.allagszam}. ${doboz.dobozszam}. doboz</h2>
    <h2>Évkör: ${doboz.evkor}</h2>
    <h3>Raktári helye:<br> ${doboz.raktarNev} <br>
    ${doboz.allvanyId} állvány <br> ${polc.polcSzint}. polc</h3>
    <h4>Jelenlegi státusza: ${doboz.statusz}</h4>
  `;
  kiemeltDobozadat.classList.remove("display_none", "opacity_0");
  takarasDiv.classList.remove("display_none", "opacity_0");
  kiemeltDobozadat.classList.add("display_block", "opacity_1");
  takarasDiv.classList.add("display_block", "opacity_1");

  const closeIcon = kiemeltDobozadat.querySelector(".infoicon");
  closeIcon.addEventListener("click", () => {
    kiemeltDobozadat.classList.remove("opacity_1");
    takarasDiv.classList.remove("opacity_1");
    kiemeltDobozadat.classList.add("opacity_0");
    takarasDiv.classList.add("opacity_0");
    setTimeout(() => {
      kiemeltDobozadat.classList.remove("display_block");
      takarasDiv.classList.remove("display_block");
      kiemeltDobozadat.classList.add("display_none");
      takarasDiv.classList.add("display_none");
    }, 300);
  });
}
