let stocks = [];

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("partMachine").value = window.IMMS.getContext().machineId || "";
  document.getElementById("add-part-form")?.addEventListener("submit", addStock);
  document.getElementById("sort-by-category")?.addEventListener("change", renderStocks);
  document.getElementById("sort-by-stock-status")?.addEventListener("change", renderStocks);
  document.getElementById("export-stock-btn")?.addEventListener("click", exportStockPdf);
  await loadStocks();
});

async function loadStocks() {
  const { machineId } = window.IMMS.getContext();
  const sb = await window.IMMS.getClient();
  let query = sb.from("stocks").select("*").order("name");
  if (machineId) query = query.eq("machine_id", machineId);
  const { data, error } = await query;
  if (error) return window.IMMS.notify(error.message, "error");
  stocks = data || [];
  renderStocks();
}

function isStockOut(s) {
  return Number(s.quantity) <= 0;
}

function isStockLow(s) {
  return Number(s.quantity) > 0 && Number(s.quantity) <= Number(s.minimum_quantity);
}

function computeStatus(s) {
  if (isStockOut(s)) return "out";
  if (isStockLow(s)) return "critical";
  return "normal";
}

function renderStocks() {
  const tbody = document.getElementById("inventory-table-body");
  const category = document.getElementById("sort-by-category")?.value || "all";
  const statusFilter = document.getElementById("sort-by-stock-status")?.value || "all";

  let rows = stocks;
  if (category !== "all") rows = rows.filter(s => s.category === category);
  if (statusFilter !== "all") rows = rows.filter(s => computeStatus(s) === statusFilter);

  tbody.innerHTML = rows.map(s => {
    const st = computeStatus(s);
    const statusColor = st === "out" ? "#e74c3c" : st === "critical" ? "#f39c12" : "#27ae60";
    return `
      <tr>
        <td>${window.IMMS.escapeHtml(s.name)}</td>
        <td>${window.IMMS.escapeHtml(s.reference || "")}</td>
        <td>${window.IMMS.escapeHtml(s.category || "")}</td>
        <td class="qty-cell">
          <div class="stock-controls">
            <button class="qty-minus-btn" onclick="updateQty('${s.id}', -1)">−</button>
            <span class="qty-value">${s.quantity}</span>
            <button class="qty-plus-btn" onclick="updateQty('${s.id}', 1)">+</button>
          </div>
        </td>
        <td>${s.minimum_quantity}</td>
        <td>${window.IMMS.escapeHtml(s.location || "")}</td>
        <td>${s.unit_price ? `$${Number(s.unit_price).toFixed(2)}` : ""}</td>
        <td><span class="stock-status" style="background:${statusColor}22;color:${statusColor}">${st}</span></td>
        <td><button onclick="deleteStock('${s.id}')" style="background:#e74c3c;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;">×</button></td>
      </tr>`;
  }).join("") || '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--muted)">No stock found.</td></tr>';

  renderKpis(rows);
  renderLowStock(rows);
  renderCategories(rows);
}

async function updateQty(id, delta) {
  const sb = await window.IMMS.getClient();
  const s = stocks.find(x => x.id === id);
  if (!s) return;
  const newQty = Math.max(0, Number(s.quantity) + delta);
  const { error } = await sb.from("stocks").update({ quantity: newQty }).eq("id", id);
  if (error) return window.IMMS.notify(error.message, "error");
  await loadStocks();
}

async function deleteStock(id) {
  if (!confirm("Delete this stock item?")) return;
  const sb = await window.IMMS.getClient();
  const { error } = await sb.from("stocks").delete().eq("id", id);
  if (error) return window.IMMS.notify(error.message, "error");
  await loadStocks();
}

function renderKpis(rows) {
  document.getElementById("stock-kpi-grid").innerHTML = `
    <div class="stock-kpi-box"><span>Total Parts</span><h1>${rows.length}</h1></div>
    <div class="stock-kpi-box"><span>Total Units</span><h1>${rows.reduce((a, s) => a + Number(s.quantity || 0), 0)}</h1></div>
    <div class="stock-kpi-box"><span>Critical</span><h1>${rows.filter(s => computeStatus(s) === "critical").length}</h1></div>
    <div class="stock-kpi-box"><span>Out of Stock</span><h1>${rows.filter(s => computeStatus(s) === "out").length}</h1></div>`;
}

function renderLowStock(rows) {
  const critical = rows.filter(s => computeStatus(s) !== "normal");
  document.getElementById("low-stock-list").innerHTML = critical.length
    ? critical.map(s => `
      <div class="low-stock-item">
        <div class="low-stock-info"><h4>${window.IMMS.escapeHtml(s.name)}</h4><span>${window.IMMS.escapeHtml(s.reference || "")}</span></div>
        <span class="low-stock-qty">${s.quantity}</span>
      </div>`).join("")
    : '<p class="empty-state">All stock levels are normal.</p>';
}

function renderCategories(rows) {
  const cats = {};
  rows.forEach(s => {
    const cat = s.category || "Other";
    cats[cat] = (cats[cat] || 0) + 1;
  });
  const total = rows.length || 1;
  document.getElementById("category-list").innerHTML = Object.entries(cats).map(([name, count]) => `
    <div class="category-item">
      <div class="category-header"><h4>${window.IMMS.escapeHtml(name)}</h4><span>${count}</span></div>
      <div class="category-progress"><div class="category-progress-bar" style="width:${(count / total) * 100}%"></div></div>
    </div>`).join("") || '<p class="empty-state">No categories yet.</p>';
}

async function addStock(e) {
  e.preventDefault();
  const sb = await window.IMMS.getClient();
  const machine_id = document.getElementById("partMachine").value || window.IMMS.getContext().machineId;
  const payload = {
    machine_id: machine_id || null,
    name: document.getElementById("partName").value.trim(),
    reference: document.getElementById("partReference").value.trim() || null,
    category: document.getElementById("partCategory").value || null,
    quantity: Number(document.getElementById("partQuantity").value || 0),
    minimum_quantity: Number(document.getElementById("partMinStock").value || 0),
    location: document.getElementById("partLocation").value.trim() || null,
    unit_price: document.getElementById("partPrice").value ? Number(document.getElementById("partPrice").value) : null,
    supplier: document.getElementById("partSupplier").value.trim() || null
  };
  if (!payload.name) return window.IMMS.notify("Part name is required.", "error");
  const { error } = await sb.from("stocks").insert(payload);
  if (error) return window.IMMS.notify(error.message, "error");
  e.target.reset();
  document.getElementById("partMachine").value = machine_id || "";
  await loadStocks();
  window.IMMS.notify("Part added.", "success");
}

function exportStockPdf() {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) return window.IMMS.notify("PDF library not loaded.", "error");
  const doc = new jsPDF();
  doc.text("Inventory Report", 14, 16);
  const rows = document.querySelectorAll("#inventory-table-body tr");
  const body = Array.from(rows).map(tr => {
    const tds = tr.querySelectorAll("td");
    return Array.from(tds).slice(0, 8).map(td => td.textContent.trim());
  });
  doc.autoTable({
    startY: 24,
    head: [["Part", "Reference", "Category", "Qty", "Min", "Location", "Price", "Status"]],
    body
  });
  doc.save("inventory-report.pdf");
}
