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
      lastShelfData.egysegek,
    );
  }
}

export async function renderRunningMeters() {
  try {
    let osszesPolc = await db.polcok.toArray();
    let teljesKapacitasFm = osszesPolc.reduce(
      (sum, polc) => sum + (Number(polc.hosszFolyometer) || 0),
      0,
    );

    let osszesEgyseg = await db.egysegek.toArray();
    let osszesFoglaltFm = osszesEgyseg.reduce(
      (sum, egyseg) => sum + (Number(egyseg.folyometer) || 0.12),
      0,
    );

    let globalPercent = 0;
    if (teljesKapacitasFm > 0) {
      globalPercent = Math.round((osszesFoglaltFm / teljesKapacitasFm) * 100);
    }

    const subtitleEl = document.getElementById("global-stats-subtitle");
    const progressBarEl = document.getElementById("global-progress-bar");
    const percentBadgeEl = document.getElementById("global-percent-badge");

    if (subtitleEl) {
      subtitleEl.textContent = `Teljes állomány: ${osszesFoglaltFm.toFixed(2)} fm / ${teljesKapacitasFm.toFixed(2)} fm (Összesen ${osszesEgyseg.length} egység)`;
    }

    if (progressBarEl && percentBadgeEl) {
      progressBarEl.style.width = `${globalPercent}%`;
      progressBarEl.setAttribute("aria-valuenow", globalPercent);
      progressBarEl.textContent = `${globalPercent}%`;

      percentBadgeEl.textContent = `${globalPercent}%`;

      let statusClass = "bg-success";
      if (globalPercent >= 85) {
        statusClass = "bg-danger";
      } else if (globalPercent >= 50) {
        statusClass = "bg-warning text-dark";
      }

      progressBarEl.className = `progress-bar progress-bar-striped progress-bar-animated ${statusClass}`;
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
          sorok: {},
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
              <ul class="collapse list-unstyled ms-4 ps-2 border-start" id="room-${safeRaktarId}-collapse" data-bs-parent=".warehouse-tree">
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
                  <ul class="collapse list-unstyled ms-4 ps-2 border-start" id="${sorId}-collapse" data-bs-parent="room-${safeRaktarId}-collapse">
            `;

            Object.keys(raktarData.sorok[sorKulcs])
              .sort()
              .forEach((allvanyKulcs) => {
                const safeAllvanyKulcs = String(allvanyKulcs).replace(
                  /[^a-zA-Z0-9]/g,
                  "_",
                );
                const allvanyId = `allvany-${safeRaktarId}-${safeSorKulcs}-${safeAllvanyKulcs}`;

                html += `
                  <li class="tree-item rack-item mt-2">
                      <div class="tree-header d-flex align-items-center rack-link" data-raktarid="${raktarId}" data-raktarnev="${raktarData.nev}" data-sor="${sorKulcs}" data-allvany="${allvanyKulcs}">
                        <div data-bs-toggle="collapse" data-bs-target="#${allvanyId}-collapse">
                            <i class="bi bi-chevron-down toggle-icon me-2 text-muted"></i>
                            <i class="bi bi-grid-3x3 text-success me-2"></i>
                            <span class="fw-semibold">${allvanyKulcs} állvány</span>
                        </div>
                      </div>
                      <ul class="collapse list-unstyled ms-4 ps-2 border-start" id="${allvanyId}-collapse" data-bs-parent="${sorId}-collapse">
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

    const firstRoom = detailedTreeContainer.querySelector(".room .collapse");
    if (firstRoom) firstRoom.classList.add("show");

    detailedTreeContainer.onclick = async function (e) {
      const headerTrigger = e.target.closest(
        '[data-bs-toggle="collapse"], .rack-link',
      );

      if (headerTrigger) {
        const toggleSubEl = headerTrigger.hasAttribute("data-bs-toggle")
          ? headerTrigger
          : headerTrigger.querySelector('[data-bs-toggle="collapse"]');

        if (toggleSubEl) {
          const targetId = toggleSubEl.getAttribute("data-bs-target");
          const currentCollapse = document.querySelector(targetId);

          if (currentCollapse && typeof bootstrap !== "undefined") {
            const parentList = headerTrigger.closest("ul");
            if (parentList) {
              const siblingCollapses = parentList.querySelectorAll(
                ":scope > li > .collapse.show",
              );
              siblingCollapses.forEach((openEl) => {
                if (openEl !== currentCollapse) {
                  const bsCollapse = bootstrap.Collapse.getOrCreateInstance(
                    openEl,
                    { toggle: false },
                  );
                  bsCollapse.hide();
                }
              });
            }
          }
        }
      }

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

        const egysegek = await db.egysegek
          .where("polcId")
          .anyOf(polcIdTomb)
          .toArray();

        renderShelfContent(rNev, sKulcs, aKulcs, polcok, egysegek);

        const isCollapseTrigger = e.target.closest(
          '[data-bs-toggle="collapse"]',
        );

        if (!isCollapseTrigger) {
          const triggerEl = rackLink.querySelector(
            '[data-bs-toggle="collapse"]',
          );
          if (triggerEl) {
            const targetId = triggerEl.getAttribute("data-bs-target");
            const collapseEl = document.querySelector(targetId);
            if (collapseEl && typeof bootstrap !== "undefined") {
              const bsCollapse = bootstrap.Collapse.getOrCreateInstance(
                collapseEl,
                { toggle: false },
              );
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
    const [osszesPolc, osszesEgyseg] = await Promise.all([
      db.polcok.toArray(),
      db.egysegek.toArray(),
    ]);

    const raktarMap = new Map();

    osszesPolc.forEach((polc) => {
      if (!raktarMap.has(polc.raktarId)) {
        raktarMap.set(polc.raktarId, {
          id: polc.raktarId,
          nev: `${polc.raktarId}. sz. Központi Raktár`,
          osszesKapacitasFm: 0,
          foglaltFm: 0,
          egysegSzam: 0,
        });
      }
      const r = raktarMap.get(polc.raktarId);
      r.osszesKapacitasFm += Number(polc.hosszFolyometer) || 0;
    });

    osszesEgyseg.forEach((egyseg) => {
      if (raktarMap.has(egyseg.raktarId)) {
        const r = raktarMap.get(egyseg.raktarId);
        r.foglaltFm += Number(egyseg.folyometer) || 0.12;
        r.egysegSzam += 1;
        if (egyseg.raktarNev) {
          r.nev = egyseg.raktarNev;
        }
      }
    });

    let html = `
      <div class="card-body">
        <h5 class="fw-bold mb-3 text-dark">
          <i class="bi bi-building me-2 text-primary"></i>Raktári Telítettségi Áttekintés
        </h5>
        <div class="row g-3">
    `;

    raktarMap.forEach((raktar) => {
      const szazalek =
        raktar.osszesKapacitasFm > 0
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
              <br>(${raktar.egysegSzam} db egység)
            </p>
            <div class="progress" style="height: 12px;">
              <div 
                class="progress-bar progress-bar-striped progress-bar-animated ${statusClass}" 
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
    const osszesEgyseg = await db.egysegek
      .where("raktarId")
      .equals(raktarId)
      .toArray();
    const foglaltFm = osszesEgyseg.reduce(
      (sum, egyseg) => sum + (egyseg.folyometer || 0),
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
  egysegek,
) {
  lastShelfData = { raktarNev, sorNev, allvanyNev, polcok, egysegek };

  const contentContainer = document.querySelector(".shelf-content");
  if (!contentContainer) return;

  const shelfTitle = document.getElementById("shelf-title");
  const shelfSubtitle = document.getElementById("shelf-subtitle");
  const shelfsSum = document.getElementById("shelfs");
  const shelfBoxes = document.getElementById("shelf-boxes");
  if (shelfTitle) shelfTitle.textContent = `${raktarNev}`;
  if (shelfSubtitle)
    shelfSubtitle.innerHTML = `<i class="bi bi-grid-3x3-gap-fill mt-2 me-2"></i>${sorNev} / ${allvanyNev} állvány`;
  if (shelfsSum)
    shelfsSum.innerHTML = `<i class="bi bi-bookshelf mt-2"></i> Összesen ${polcok.length} polc`;
  if (shelfBoxes)
    shelfBoxes.innerHTML = `<i class="bi bi-box mt-2"></i> Összesen ${egysegek.length} egység`;

  if (currentViewMode === "visual") {
    contentContainer.innerHTML = renderVisualShelfHTML(polcok, egysegek);
  } else {
    contentContainer.innerHTML = renderTableShelfHTML(polcok, egysegek);
  }
}

export function renderFondjegyzekHTML(fondjegyzek) {
  const container = document.getElementById("fondjegyzek_content");
  if (!container) return;

  if (!fondjegyzek || fondjegyzek.length === 0) {
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

function renderVisualShelfHTML(polcok, egysegek) {
  const rendezettPolcok = [...polcok].sort((a, b) => b.polcSzint - a.polcSzint);
  let html = `<div class="visual-rack d-flex flex-column gap-3">`;

  rendezettPolcok.forEach((polc) => {
    const polcEgysegek = egysegek.filter((e) => e.polcId === polc.id);
    const foglaltFm = polcEgysegek.reduce((sum, egyseg) => {
      return sum + (Number(egyseg.folyometer) || 0.12);
    }, 0).toFixed(2);
    const maxFm = Number(polc.hosszFolyometer) || 0;
    const vanSzabadHely = foglaltFm < polc.hosszFolyometer;

    html += `
      <div class="shelf-layer bg-light p-3 rounded-3 border shadow-sm">
        <div class="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
          <h6 class="m-0 fw-bold text-secondary">
            <i class="bi bi-layers-fill me-1 text-primary"></i> ${polc.polcSzint}. polc
          </h6>
          <span class="badge ${polcEgysegek.length ? "bg-danger" : "bg-success"}">
            ${polcEgysegek.length} egység (${foglaltFm} fm / ${polc.hosszFolyometer} fm)
          </span>
        </div>

        <div class="d-flex flex-wrap gap-2 align-items-stretch">
    `;

        if (polcEgysegek.length > 0) {
          polcEgysegek.forEach((egyseg) => {

          let bgClass = "";
          let iconClass = "";

          switch (egyseg.statusz) {
            case "Raktárban":
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
          <div class="archive-box ${bgClass} p-2 rounded border d-flex flex-column justify-content-between shadow-sm pointer" style="min-width: 120px; flex: 0 1 auto"
               data-id="${egyseg.id}">
            <div class="d-flex justify-content-between align-items-center">
              <span class="badge bg-dark extra-small me-1">${egyseg.egysegSzam}. ${egyseg.egysegTipus}</span>
              <i class="bi ${iconClass} fs-6"></i>
            </div>
            <div class="fw-bold text-truncate small" title="${egyseg.fondszam}. fond">${egyseg.fondszam}. fond</div>
            <div class="text-muted extra-small" style="font-size: 0.7rem;">${egyseg.evkor || ""}</div>
          </div>
        `;
        });
       }
       
       if (vanSzabadHely) {
        html += `
        <div class="add-box-card p-2 rounded border border-dash d-flex flex-column align-items-center justify-content-center text-primary pointer shadow-sm bg-white"
             onclick="window.ujEgysegHozzaadasaModal('${polc.id}')"
             style="min-width: 120px; min-height: 75px; flex: 0 1 auto; cursor: pointer; border-style: dashed !important;">
          <i class="bi bi-plus-circle-fill fs-4 mb-1 text-primary"></i>
          <span class="fw-bold extra-small text-center" style="font-size: 0.75rem;">Új egység</span>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  });

  html += `</div>`;
  return html;
}

function renderTableShelfHTML(polcok, egysegek) {
  if (!egysegek || egysegek.length === 0) {
    return `<div class="alert alert-info">Ezen az állványon jelenleg nincsenek egységek.</div>`;
  }

  let html = `
    <div class="table-responsive bg-white rounded shadow-sm border text-center">
      <table class="table table-hover align-middle mb-0">
        <thead class="table-dark">
          <tr>
            <th class="border">Polcszint</th>
            <th class="border">Fondszám</th>
            <th class="border">Egységszám</th>
            <th class="border">Állagszám</th>
            <th class="border">Évkör</th>
            <th class="border">Státusz</th>
          </tr>
        </thead>
        <tbody>
  `;

  const rendezettEgysegek = [...egysegek].sort(
    (a, b) => a.polcId - b.polcId || a.egysegSzam - b.egysegSzam,
  );

  rendezettEgysegek.forEach((egyseg) => {
    const polc = polcok.find((p) => p.id === egyseg.polcId);
    const polcSzint = polc ? `${polc.polcSzint}. polc` : "-";

    if (egyseg) {
      let isOut = "";

      switch (egyseg.statusz) {
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
        <tr class="archive-box pointer" data-egysegszam="${egyseg.egysegSzam}" style="cursor: pointer;">
          <td class="border"><span class="badge bg-secondary-subtle text-dark">${polcSzint}</span></td>
          <td class="border">${egyseg.fondszam}. fond</td>
          <td class="border"><strong class="text-primary">${egyseg.egysegSzam}. egység</strong></td>
          <td class="border">${egyseg.allagszam || "-"}. állag</td>
          <td class="border">${egyseg.evkor || "-"}</td>
          <td class="border">
            <span class="badge ${isOut}">
              ${egyseg.statusz}
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

export function renderDataDetails(egyseg, polc) {
  console.log("Megnyitás erre az ID-ra:", egyseg.id, "Típusa:", typeof egyseg.id);
  const kiemeltEgysegadat = document.getElementById("data_highlight");
  const takarasDiv = document.getElementById("takaras");

  kiemeltEgysegadat.innerHTML = `
    <i class="bi bi-x-circle fs-3 pt-1 ps-5 infoicon pointer"></i>
    <h1>${egyseg.megnevezes}</h1>
    <hr>
    <h2>${egyseg.fondszam}. ${egyseg.allagszam}. ${egyseg.egysegSzam}. ${egyseg.egysegTipus}</h2>
    <h2>Évkör: ${egyseg.evkor}</h2>
    <hr>
    <h2>Terjedelem: ${egyseg.folyometer} fm</h2>
    <hr>
    <h3>Raktári helye:<br> ${egyseg.raktarNev} <br>
    ${egyseg.allvanyId} állvány <br> ${polc.polcSzint}. polc</h3>
    <hr>
    <h4>Jelenlegi státusza: ${egyseg.statusz}</h4>
    <hr>
    <div class="row">
      <div class="col">
        <button type="button" class="btn btn-warning btn-lg" id="dataChange" onClick="window.egysegSzerkesztoMegnyitasa(${egyseg.id})"><i class="bi bi-pencil"></i> Módosítás</button>
      </div>
      <div class="col">
        <button type="button" class="btn btn-warning btn-lg" id="dataTransfer" onClick="window.egysegAthelyezoMegnyitasa(${egyseg.id})"><i class="bi bi-arrows-move"></i> Áthelyezés</button>
      </div>
    </div>
  `;
  kiemeltEgysegadat.classList.remove("display_none", "opacity_0");
  takarasDiv.classList.remove("display_none", "opacity_0");
  kiemeltEgysegadat.classList.add("display_block", "opacity_1");
  takarasDiv.classList.add("display_block", "opacity_1");

  const closeIcon = kiemeltEgysegadat.querySelector(".infoicon");
  closeIcon.addEventListener("click", () => {
    kiemeltEgysegadat.classList.remove("opacity_1");
    takarasDiv.classList.remove("opacity_1");
    kiemeltEgysegadat.classList.add("opacity_0");
    takarasDiv.classList.add("opacity_0");
    setTimeout(() => {
      kiemeltEgysegadat.classList.remove("display_block");
      takarasDiv.classList.remove("display_block");
      kiemeltEgysegadat.classList.add("display_none");
      takarasDiv.classList.add("display_none");
    }, 300);
  });
}

export async function egysegSzerkesztoMegnyitasa(egysegId) {
    const egyseg = await db.egysegek.get(egysegId);
    if (!egyseg) {
        console.error('A megadott egység nem található:', egysegId);
        return;
    }

    document.getElementById('editEgysegId').value = egyseg.id;
    document.getElementById('editFondNev').value = egyseg.megnevezes;
    document.getElementById('editFondSzam').value = egyseg.fondszam;
    document.getElementById('editFondAllag').value = egyseg.allagszam;
    document.getElementById('editEgysegSzam').value = egyseg.egysegSzam;
    document.getElementById('editFolyometer').value = egyseg.folyometer;
    document.getElementById('editStatusz').value = egyseg.statusz;
    document.getElementById('editMegjegyzes').value = egyseg.megjegyzes || '';

    const modalElem = document.getElementById('egysegSzerkesztoModal');
    const szerkesztoModal = new bootstrap.Modal(modalElem);
    szerkesztoModal.show();
}

export async function egysegMentesEsemeny() {
  const egysegId = Number(document.getElementById('editEgysegId').value);
  const ujFondNev = document.getElementById('editFondNev').value;
  const ujFondSzam = document.getElementById('editFondSzam').value;
  const ujAllagSzam = document.getElementById('editFondAllag').value;
  const ujEgysegSzam = Number(document.getElementById('editEgysegSzam').value);
  const ujFolyometer = Number(document.getElementById('editFolyometer').value);
  const ujStatusz = document.getElementById('editStatusz').value;
  const ujMegjegyzes = document.getElementById('editMegjegyzes').value;

  try {
    await db.egysegek.update(egysegId, {
      megnevezes: ujFondNev,
      fondszam: ujFondSzam,
      allagszam: ujAllagSzam,
      egysegSzam: ujEgysegSzam,
      folyometer: ujFolyometer,
      statusz: ujStatusz,
      megjegyzes: ujMegjegyzes
    });

    console.log(`Egység (${egysegId}) sikeresen frissítve!`);

    const kiemelt = document.getElementById("data_highlight");
    const takaras = document.getElementById("takaras");
    if (kiemelt) kiemelt.classList.add("display_none");
    if (takaras) takaras.classList.add("display_none");

    const modalElem = document.getElementById('egysegSzerkesztoModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElem);
    if (modalInstance) modalInstance.hide();

    await frissitPolckep();

    await exportJSON();

  } catch (err) {
    console.error("Hiba a mentés során:", err);
  }
}

window.ujEgysegHozzaadasaModal = async function ujEgysegHozzaadasaModal(polcId) {
  console.log("Kattintott polcId:", polcId, typeof polcId);
  try {

  const polc = await db.polcok.get(polcId);
  if (!polc) {
    console.error('A ${polcId} azonosítójú polc nem található!');
    return;
  }

  const raktarId = Number(polc.raktarId);
  let raktarNev = "";

  if (raktarId === 1) {
    raktarNev = "I. sz. Központi Raktár"
  } else if (raktarId === 2) {
    raktarNev = "II. sz. Központi Raktár"
  } else if (raktarId === 3) {
    raktarNev = "III. sz. Központi Raktár"
  } else {
    raktarNev = "Ismeretlen raktár"
  }

  const raktar = await db.raktarak.get(polc.raktarId);

  document.getElementById("ujEgysegPolcId").value = polcId;
  document.getElementById("ujEgysegRaktarId").value = raktar ? raktar.id : (polc.raktarId || "");
  document.getElementById("ujEgysegRaktarNev").value = raktarNev;
  const allvanyErtek = polc.allvany || polc.allvanyId || "";
  document.getElementById("ujEgysegAllvanyId").value = allvanyErtek;

  const modalElem = document.getElementById("egysegHozzaadasModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalElem);
  modal.show();
  } catch (error) {
    console.error("Hiba a modál megnyitásakor:", error);
  }
}

export async function egysegHozzaadasEsemeny() {
  
  const fondszamVal = document.getElementById("ujFondSzam").value.trim();
  const egysegSzamVal = document.getElementById("ujEgysegSzam").value.trim();
  const egysegTipusVal = document.getElementById("ujEgysegTipus").value;
  const folyometerVal = parseFloat(document.getElementById("ujFolyometer").value);
  const statuszVal = document.getElementById("ujStatusz").value;
  

  /*if (!fondszamVal || !egysegSzamVal || !egysegTipusVal || !folyometerVal || !statuszVal) {
    alert("A következő mezők kitöltése kötelező: fondszám, egységszám, egységtípus, folyóméter, státusz megadása!");
    return;
  }*/

  const egysegAdat = {
    id: Date.now(),
    
    /*type="hidden"*/
    // Automatikusan kitöltött mezők:
    polcId: document.getElementById("ujEgysegPolcId").value,
    raktarId: Number(document.getElementById("ujEgysegRaktarId").value),
    raktarNev: document.getElementById("ujEgysegRaktarNev").value,
    allvanyId: document.getElementById("ujEgysegAllvanyId").value,

    // Felhasználó által kitöltött mezők:
    megnevezes: document.getElementById('ujFondNev').value.trim(),
    fondszam: fondszamVal,
    allagszam: document.getElementById("ujFondAllag").value.trim(),
    egysegSzam: Number(egysegSzamVal),
    egysegTipus: egysegTipusVal,
    evkor: document.getElementById("ujEvkor").value.trim(),
    folyometer: folyometerVal,
    statusz: statuszVal,
    megjegyzes: document.getElementById("ujMegjegyzes").value.trim(),
    
    // Alapértelmezett kezdőértékek:
    kolcsonzoSzemely: "",
    kivetelDatuma: ""
  };

  try {
    await db.egysegek.put(egysegAdat);

    const modalElem = document.getElementById("egysegHozzaadasModal");
    const modal = bootstrap.Modal.getInstance(modalElem);
    if (modal) modal.hide();

    const form = document.getElementById("egysegHozzaadasModal");
    
    /*if (form)
    form.reset();*/

    await frissitPolckep();
    await renderRunningMeters();

    await exportJSON();
  } catch (error) {
    console.error("Hiba történt az új egység mentése során:", error);
  }

}

function getRaktarNevById(raktarId) {
  const numId = Number(raktarId);
  if (numId === 1) return "I. sz. Központi Raktár";
  if (numId === 2) return "II. sz. Központi Raktár";
  if (numId === 3) return "III. sz. Központi Raktár";
  return `${numId}. sz. Központi Raktár`;
}

export async function egysegAthelyezoMegnyitasa(egysegId) {
  const egyseg = await db.egysegek.get(Number(egysegId));
  if (!egyseg) {
    console.error("Nem található a megadott egység:", egysegId);
    return;
  }

  document.getElementById("athelyEgysegId").value = egyseg.id;
  document.getElementById("athelyPolcId").value = egyseg.polcId || "";

  const polcok = await db.polcok.toArray();
  const egyediRaktarak = new Map();

  polcok.forEach((p) => {
    if (p.raktarId != null) {
      const numRaktarId = Number(p.raktarId);

      if (!egyediRaktarak.has(numRaktarId)) {
        egyediRaktarak.set(numRaktarId, getRaktarNevById(numRaktarId));
      }
    }
  });

  const selectRaktar = document.getElementById("editRaktar");
  const selectAllvany = document.getElementById("editAllvany");
  const selectPolc = document.getElementById("editPolc");

  selectRaktar.innerHTML = '<option value="">-- Válassz raktárt --</option>';
  
  egyediRaktarak.forEach((nev, id) => {
    selectRaktar.innerHTML += `<option value="${id}">${nev}</option>`;
  });

  selectAllvany.innerHTML = '<option value="">-- Előbb válassz raktárt --</option>';
  selectAllvany.disabled = true;

  selectPolc.innerHTML = '<option value="">-- Előbb válassz állványt --</option>';
  selectPolc.disabled = true;

  const modalElem = document.getElementById("egysegAthelyezoModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalElem);
  modal.show();
}

export async function egysegAthelyezesEsemeny() {
  const egysegId = Number(document.getElementById("athelyEgysegId").value);
  const ujPolcId = document.getElementById("editPolc").value;

  if (!ujPolcId) {
    alert("Kérlek válaszd ki a célpolcot!");
    return;
  }

  try {
    const ujPolc = await db.polcok.get(ujPolcId);
    const ujRaktarNev = getRaktarNevById(ujPolc.raktarId);

    await db.egysegek.update(egysegId, {
      polcId: ujPolc.id,
      allvanyId: ujPolc.allvany,
      raktarId: ujPolc.raktarId,
      raktarNev: ujRaktarNev
    });

    console.log(`Egység (${egysegId}) áthelyezve ide: ${ujPolc.id}, ${ujPolc.allvany}, ${ujPolc.raktarId}, ${ujRaktarNev}`);

    const kiemelt = document.getElementById("data_highlight");
    const takaras = document.getElementById("takaras");
    if (kiemelt) kiemelt.classList.add("display_none");
    if (takaras) takaras.classList.add("display_none");

    const modalElem = document.getElementById("egysegAthelyezoModal");
    const modalInstance = bootstrap.Modal.getInstance(modalElem);
    if (modalInstance) modalInstance.hide();

    await frissitPolckep();
    await renderRunningMeters();
    await exportJSON();
  } catch (err) {
    console.error("Hiba az áthelyezés során:", err);
  }
}

export function initAthelyezoEsemenyek() {
  const selectRaktar = document.getElementById("editRaktar");
  const selectAllvany = document.getElementById("editAllvany");

  if (!selectRaktar || !selectAllvany) return;

  selectRaktar.addEventListener("change", async (e) => {
    const raktarId = Number(e.target.value);
    const selectPolc = document.getElementById("editPolc");

    selectPolc.innerHTML = '<option value="">-- Előbb válassz állványt --</option>';
    selectPolc.disabled = true;

    if (!raktarId) {
      selectAllvany.innerHTML = '<option value="">-- Előbb válassz raktárt --</option>';
      selectAllvany.disabled = true;
      return;
    }

    const polcok = await db.polcok.where("raktarId").equals(raktarId).toArray();
    const allvanyok = [...new Set(polcok.map((p) => p.allvany))];

    selectAllvany.innerHTML = '<option value="">-- Válassz állványt --</option>';
    allvanyok.forEach((a) => {
      selectAllvany.innerHTML += `<option value="${a}">${a}. állvány</option>`;
    });
    selectAllvany.disabled = false;
  });

  selectAllvany.addEventListener("change", async (e) => {
    const raktarId = Number(document.getElementById("editRaktar").value);
    const allvany = e.target.value;
    const selectPolc = document.getElementById("editPolc");

    if (!allvany) {
      selectPolc.innerHTML = '<option value="">-- Előbb válassz állványt --</option>';
      selectPolc.disabled = true;
      return;
    }

    const polcok = await db.polcok
      .where("raktarId")
      .equals(raktarId)
      .filter((p) => p.allvany === allvany)
      .toArray();

    selectPolc.innerHTML = '<option value="">-- Válassz polcot --</option>';
    polcok.forEach((p) => {
      selectPolc.innerHTML += `<option value="${p.id}">${p.sor} - ${p.polcSzint}. polcszint</option>`;
    });
    selectPolc.disabled = false;
  });
}
async function exportJSON() {
  const mindenEgyseg = await db.egysegek.toArray();
  const jsonString = JSON.stringify(mindenEgyseg, null, 2);
  
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = "egysegek.json";
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function frissitPolckep() {
  if (lastShelfData) {
    const frissEgysegek = await db.egysegek
      .where("polcId")
      .anyOf(lastShelfData.polcok.map(p => p.id))
      .toArray();
    
    renderShelfContent(
      lastShelfData.raktarNev,
      lastShelfData.sorNev,
      lastShelfData.allvanyNev,
      lastShelfData.polcok,
      frissEgysegek
    );
  }
}

window.egysegSzerkesztoMegnyitasa = egysegSzerkesztoMegnyitasa;
window.egysegMentesEsemeny = egysegMentesEsemeny;
window.egysegHozzaadasEsemeny = egysegHozzaadasEsemeny;
window.egysegAthelyezoMegnyitasa = egysegAthelyezoMegnyitasa;
window.egysegAthelyezesEsemeny = egysegAthelyezesEsemeny;