import db from "./db.js";

const chartInstances = {};

export async function renderDoughnutChart({
  canvasId,
  dataMap,
  titleText,
  unitText,
  backgroundColors
}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const labels = Object.keys(dataMap);
  const data = Object.values(dataMap);

  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  chartInstances[canvasId] = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: backgroundColors || [
            "#0d6efd", "#ffc107", "#198754", "#dc3545", "#0dcaf0", "#6c757d"
          ],
          //borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: titleText,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const value = context.raw || 0;
              return `${value} ${unitText}`;
            },
          },
        },
        
      },
    },
    
    
  });
}

export async function renderFondDistributionChart(canvasId) {
  try {
    const egysegek = await db.egysegek.toArray();
    const fondStats = {};

    egysegek.forEach((e) => {
      const fondNev = e.fondszam ? `${e.fondszam}. fond` : "Ismeretlen";
      fondStats[fondNev] = (fondStats[fondNev] || 0) + 1;
    });

    await renderDoughnutChart({
      canvasId: canvasId,
      dataMap: fondStats,
      titleText: "Állomány megoszlása egységszám szerint",
      unitText: "egység"
    });
  } catch (error) {
    console.error("Hiba a egység diagram kirajzolásakor:", error);
  }
}

export async function renderFondMeterDistributionChart(canvasId) {
  try {
    const egysegek = await db.egysegek.toArray();
    const meterStats = {};

    egysegek.forEach((e) => {
      const fondNev = e.fondszam ? `${e.fondszam}. fond` : "Ismeretlen";
      const fm = Number(e.folyometer) || 0; 
      meterStats[fondNev] = Number(((meterStats[fondNev] || 0) + fm).toFixed(2));
    });

    await renderDoughnutChart({
      canvasId: canvasId,
      dataMap: meterStats,
      titleText: "Állomány megoszlása folyóméter szerint",
      unitText: "fm"
    });
  } catch (error) {
    console.error("Hiba a folyóméter diagram kirajzolásakor:", error);
  }
}