document.addEventListener("DOMContentLoaded", async () => {
  await loadAmdec();
});

async function loadAmdec() {
  const { machineId } = window.IMMS.getContext();
  if (!machineId) {
    document.querySelector(".amdec-body").innerHTML = '<p class="empty-state">Open a machine first to view its AMDEC.</p>';
    return;
  }

  const sb = await window.IMMS.getClient();
  
  // Get AMDEC entries for the machine
  const { data: entries, error } = await sb
    .from("amdec_entries")
    .select("*, machine_components(name)")
    .eq("machine_id", machineId)
    .order("criticality", { ascending: false });

  if (error) return window.IMMS.notify(error.message, "error");

  const container = document.querySelector(".amdec-body");
  if (!entries || entries.length === 0) {
    container.innerHTML = `
      <div class="AMDEC">
        <div class="amdec-header">
          <div class="amdec-title-group">
            <h1>AMDEC Analysis</h1>
            <p>Failure Mode, Effects & Criticality Analysis — No entries yet. Add components and failures to generate AMDEC data.</p>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // Calculate statistics
  const total = entries.length;
  const avgCriticality = Math.round(entries.reduce((s, e) => s + (e.criticality || 0), 0) / total);
  const highRisk = entries.filter(e => e.criticality >= 64).length;

  container.innerHTML = `
    <div class="AMDEC">
      <div class="amdec-header">
        <div class="amdec-title-group">
          <h1>AMDEC Analysis</h1>
          <p>Failure Mode, Effects & Criticality Analysis</p>
        </div>
        <div style="display:flex;gap:24px;">
          <div style="text-align:center"><strong style="font-size:1.2rem;color:var(--red)">${total}</strong><br><span style="font-size:0.8rem;color:var(--muted)">Entries</span></div>
          <div style="text-align:center"><strong style="font-size:1.2rem;color:var(--red)">${avgCriticality}</strong><br><span style="font-size:0.8rem;color:var(--muted)">Avg RPN</span></div>
          <div style="text-align:center"><strong style="font-size:1.2rem;color:var(--red)">${highRisk}</strong><br><span style="font-size:0.8rem;color:var(--muted)">High Risk</span></div>
        </div>
      </div>

      <div class="amdec-legend">
        <div class="legend-card low"><div class="legend-color"></div><div class="legend-content"><h3>Low</h3><small>1 – 27</small></div></div>
        <div class="legend-card medium"><div class="legend-color"></div><div class="legend-content"><h3>Medium</h3><small>28 – 63</small></div></div>
        <div class="legend-card high"><div class="legend-color"></div><div class="legend-content"><h3>High</h3><small>64 – 99</small></div></div>
        <div class="legend-card critical"><div class="legend-color"></div><div class="legend-content"><h3>Critical</h3><small>100 – 125</small></div></div>
      </div>

      <div class="amdec-table-container">
        <table class="amdec-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Failure Mode</th>
              <th>Causes</th>
              <th>Effects</th>
              <th>F</th>
              <th>G</th>
              <th>D</th>
              <th>RPN</th>
              <th>Intervention</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(e => {
              const rpn = e.criticality || (e.frequency * e.gravity * e.detection);
              const riskClass = rpn >= 100 ? 'critical-risk' : rpn >= 64 ? 'high-risk' : rpn >= 28 ? 'medium-risk' : 'low-risk';
              const riskLabel = rpn >= 100 ? 'CRITICAL' : rpn >= 64 ? 'HIGH' : rpn >= 28 ? 'MEDIUM' : 'LOW';
              return `
                <tr>
                  <td><div class="element-group"><strong>${window.IMMS.escapeHtml(e.machine_components?.name || e.element_name)}</strong></div></td>
                  <td><div class="failure-mode-box"><div class="failure-mode-icon">!</div><div class="failure-mode-content"><p>${window.IMMS.escapeHtml(e.failure_mode || "N/A")}</p></div></div></td>
                  <td><div class="list-box"><div class="list-item"><div class="list-dot"></div><p>${window.IMMS.escapeHtml(e.causes || "N/A")}</p></div></div></td>
                  <td><div class="list-box"><div class="list-item"><div class="list-dot"></div><p>${window.IMMS.escapeHtml(e.effects || "N/A")}</p></div></div></td>
                  <td style="text-align:center">${e.frequency}</td>
                  <td style="text-align:center">${e.gravity}</td>
                  <td style="text-align:center">${e.detection}</td>
                  <td><div class="criticality-box ${riskClass}"><div class="criticality-value">${rpn}</div><div class="criticality-level">${riskLabel}</div></div></td>
                  <td><div class="intervention-box intervention-${riskLabel.toLowerCase()}">${window.IMMS.escapeHtml(e.intervention_type || "Monitor")}</div></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <div class="amdec-actions">
        <button class="export-pdf-btn" onclick="exportAmdecPdf()">📄 Export PDF</button>
      </div>
    </div>
  `;
}

function exportAmdecPdf() {
  if (typeof window.jspdf === 'undefined' && typeof jspdf === 'undefined') {
    window.IMMS.notify("PDF library not loaded.", "error");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(16);
  doc.text("AMDEC Analysis - IMMS SABC", 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  
  // Get table data from DOM
  const rows = [];
  document.querySelectorAll(".amdec-table tbody tr").forEach(tr => {
    const cells = tr.querySelectorAll("td");
    if (cells.length >= 9) {
      rows.push([
        cells[0].textContent.trim(),
        cells[1].textContent.trim().replace("!", "").trim(),
        cells[2].textContent.trim(),
        cells[3].textContent.trim(),
        cells[4].textContent.trim(),
        cells[5].textContent.trim(),
        cells[6].textContent.trim(),
        cells[7].textContent.trim().split(/\n/)[0],
        cells[8].textContent.trim()
      ]);
    }
  });
  
  if (rows.length && doc.autoTable) {
    doc.autoTable({
      head: [["Component", "Failure Mode", "Causes", "Effects", "F", "G", "D", "RPN", "Intervention"]],
      body: rows,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [192, 57, 43] }
    });
  }
  
  doc.save("AMDEC_Analysis.pdf");
  window.IMMS.notify("PDF exported successfully.", "success");
}