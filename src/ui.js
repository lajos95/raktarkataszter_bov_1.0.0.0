import db from "./db.js";

export function renderStorageTree(raktarak) {
  const storageTree = document.getElementById("storage-tree");

  if (!storageTree) return;

  storageTree.innerHTML = "";

  raktarak.forEach((raktar) => {
    const li = document.createElement("li");
    li.className = "tree-item mb-2 p-2 rounded";
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

export async function renderDetailedTree(raktarId, raktarNev) {
  const detailedTreeContainer = document.querySelector(".warehouse-tree");
  if (!detailedTreeContainer) return;

  try {
    const osszesPolc = await db.polcok
      .where("raktarId")
      .equals(raktarId)
      .toArray();

    const faStruktura = {};

    osszesPolc.forEach((polc) => {
      const s = polc.sor;
      const a = polc.allvany;

      if (!faStruktura[s]) {
        faStruktura[s] = {};
      }
      if (!faStruktura[s][a]) {
        faStruktura[s][a] = [];
      }
      faStruktura[s][a].push(polc);
    });

    const safeRaktarId = String(raktarId).replace(/[^a-zA-Z0-9]/g, "_");

    let html = `
      <li class="tree-item room mb-2">
          <div class="tree-header d-flex align-items-center" data-bs-toggle="collapse" data-bs-target="#room-${safeRaktarId}-collapse" style="cursor: pointer;">
              <i class="bi bi-chevron-down toggle-icon me-2 text-muted"></i>
              <i class="bi bi-door-closed-fill text-warning me-2"></i>
              <span class="fw-bold">${raktarNev}</span>
          </div>
          <ul class="collapse list-unstyled ms-4 ps-2 border-start" id="room-${safeRaktarId}-collapse">
    `;

    Object.keys(faStruktura)
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

        Object.keys(faStruktura[sorKulcs])
          .sort()
          .forEach((allvanyKulcs) => {
            const safeAllvanyKulcs = String(allvanyKulcs).replace(
              /[^a-zA-Z0-9]/g,
              "_",
            );
            const allvanyId = `allvany-${safeRaktarId}-${safeSorKulcs}-${safeAllvanyKulcs}`;
            html += `
          <li class="tree-item rack-item mt-2">
              <div class="tree-header d-flex align-items-center rack-link" data-raktarid="${raktarId}" data-sor="${sorKulcs}" data-allvany="${allvanyKulcs}">
              <div data-bs-toggle="collapse" data-bs-target="#${allvanyId}-collapse">
                  <i class="bi bi-chevron-down toggle-icon me-2 text-muted"></i>
                  <i class="bi bi-grid-3x3 text-success me-2"></i>
                  <span class="fw-semibold">${allvanyKulcs}</span>
              </div>
              </div>
              <ul class="collapse list-unstyled ms-4 ps-2 border-start" id="${allvanyId}-collapse">
        `;

            faStruktura[sorKulcs][allvanyKulcs]
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

    detailedTreeContainer.innerHTML = html;

    detailedTreeContainer.onclick = async function (e) {
      const shelfLink = e.target.closest(".tree-link");
      if (shelfLink) {
        e.stopPropagation();

        detailedTreeContainer.querySelectorAll(".rack-link, .tree-link").forEach((el) => {
          el.classList.remove("bg-primary-subtle", "fw-bold", "text-primary");
        });

        shelfLink.classList.add("bg-primary-subtle", "fw-bold", "text-primary");

        const polcId = shelfLink.dataset.polcid;
        console.log("-> Polcszint sikeresen kiválasztva! Polc ID:", polcId);
        
        return;
      }

      const rackLink = e.target.closest(".rack-link");
      if (rackLink) {
        rackLink.classList.add("bg-primary.subtle", "fw-bold");

        const rId = rackLink.dataset.raktarid;
        const sKulcs = rackLink.dataset.sor;
        const aKulcs = rackLink.dataset.allvany;

        const polcok = await db.polcok.where({ raktarId: Number(rId) || rId, sor: sKulcs, allvany: aKulcs }).toArray();
        
        const polcIdTomb = polcok.map(p => p.id);

        const dobozok = await db.dobozok.where("polcId").anyOf(polcIdTomb).toArray();

        renderShelfContent(raktarNev, sKulcs, aKulcs, polcok, dobozok);

        const isCollapseTrigger = e.target.closest('[data-bs-toggle="collapse"]');

        detailedTreeContainer.querySelectorAll(".rack-link, .tree-link").forEach((el) => {
          el.classList.remove("bg-primary-subtle", "fw-bold", "text-primary");
        });

        rackLink.classList.add("bg-primary-subtle", "fw-bold");

        const adatok = {
          raktarId: rackLink.dataset.raktarid,
          sor: rackLink.dataset.sor,
          allvany: rackLink.dataset.allvany
        };

        console.log("-> Állvány sikeresen kiválasztva!", adatok);

        if (!isCollapseTrigger) {
          const triggerEl = rackLink.querySelector('[data-bs-toggle="collapse"]');
          if (triggerEl) {
            const targetId = triggerEl.getAttribute('data-bs-target');
            const collapseEl = document.querySelector(targetId);
            if (collapseEl && typeof bootstrap !== 'undefined') {
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

export function renderFloorPlan(
  raktarId,
  raktarNev,
  telitettseg = 0,
  foglalt = 0,
  max = 0,
) {
  let statuszSzin = "";
  let statuszSzoveg = "";

  if (telitettseg >= 80) {
    statuszSzin = "bg-danger";
    statuszSzoveg = "Kevés/nincs szabad hely";
  } else if (telitettseg >= 50) {
    statuszSzin = "bg-warning";
    statuszSzoveg = "Raktár több, mint a fele telített";
  } else {
    statuszSzin = "bg-success text-white";
    statuszSzoveg = "Sok szabad hely";
  }

  const floorPlanContainer = document.querySelector(
    ".card.bg-light.mb-4.shadow-sm",
  );

  if (floorPlanContainer) {
    floorPlanContainer.innerHTML = `
            <div class="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                <h6 class="mb-0"><i class="bi bi-map-fill me-2"></i>A kiválasztott raktár telítettsége</h6>
                <span class="badge bg-dark">Kiválasztva: ${raktarId}. sz. Központi Raktár</span>
            </div>
            <div class="card-body">
                <div class="floor-plan d-flex gap-3 p-3 bg-white border rounded justify-content-center flex-wrap">
                    <div class="room-block p-3 border border-2 border-primary rounded text-center bg-primary-subtle position-relative" style="width: 250px;">
                        <div class="fw-bold text-primary mb-2">
                            <i class="bi bi-door-closed-fill fs-4 d-block mb-1"></i>
                            ${raktarNev}
                        </div>
                        <div class="small fw-semibold text-secondary mb-2">Foglalt: ${foglalt.toFixed(2)} / ${max.toFixed(2)} fm</div>
                        <div class="progress" style="height: 15px;">
                            <div class="progress-bar ${statuszSzin.includes("text-dark") ? "bg-warning text-dark" : statuszSzin}" role="progressbar" style="width: ${telitettseg}%;" aria-valuenow="${telitettseg}" aria-valuemin="0" aria-valuemax="100">${telitettseg}%</div>
                        </div>
                        <span class="badge ${statuszSzin} mt-2" style="font-size: 0.7rem;">${statuszSzoveg}</span>
                    </div>
                </div>
            </div>
        `;
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

export function renderShelfContent(raktarNev, sorNev, allvanyNev, polcok, dobozok) {
  const contentContainer = document.querySelector(".shelf-content");
  if (!contentContainer) return;

  let html = `
    <div class="d-flex justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb mb-0">
                <li class="breadcrumb-item">${raktarNev}</li>
                <li class="breadcrumb-item">${sorNev}.</li>
                <li class="breadcrumb-item active" aria-current="page">${allvanyNev}</li>
            </ol>
        </nav>
    </div>
    
    <div class="visual-rack bg-dark p-4 rounded shadow-sm">
  `;

  const rendezettPolcok = [...polcok].sort((a, b) => b.polcSzint - a.polcSzint);

  rendezettPolcok.forEach((polc) => {
    const polcDobozok = dobozok.filter((d) => d.polcId === polc.id);

    html += `
    <div class="shelf-layer mb-4">
          <div class="shelf-title text-light small mb-1">${polc.polcSzint}. Polc</div>
          <div class="shelf-grid bg-secondary p-2 rounded d-flex gap-2 flex-wrap" style="min-height: 100px;">
    `;

    polcDobozok.forEach((doboz) => {
      const isOut = doboz.statusz === "Kiemelve" || doboz.statusz === "Kölcsönzött" || doboz.statusz === "Kutatóteremben";
      const bgClass = isOut ? "bg-info text-white" : "bg-warning text-dark";
      const iconClass = isOut ? "bi-person-bounding-box" : "bi-box-seam-fill";
      const labelSuffix = isOut ? " (KI)" : "";

      html += `
      <div class="archive-box ${bgClass} p-2 rounded text-center d-flex flex-column justify-content-between shadow" data-dobozszam="${doboz.dobozszam}">
            <i class="bi ${iconClass} fs-3"></i>
            <span class="fw-bold" style="font-size: 0.75rem;">${doboz.fondszam}.</span>
            <span class="fw-bold" style="font-size: 0.75rem;">${doboz.dobozszam}. doboz ${labelSuffix}</span>
        </div>
      `;
      });

      html += `
          </div>
          <div class="shelf-wood text-dark-emphasis fw-bold text-center py-1 rounded-bottom shadow-sm" style="font-size: 0.8rem; background-color: #d7ccc8 !important; border-bottom: 5px solid #8d6e63;">
      </div>
    `;

      html += `</div>`;
      contentContainer.innerHTML = html;
    });

}

export function renderBoxDetails (doboz, polc) {
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
  `
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
  })
}
