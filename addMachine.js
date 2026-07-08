document.addEventListener("DOMContentLoaded", async () => {
  await loadFactories();
  setupImageDropZone("imageDropZone", "MachineImage", "imageLabel");
  document.getElementById("UsineMachine")?.addEventListener("change", e => {
    const usineId = e.target.value;
    loadChaines(usineId);
    window.IMMS.setContext("selectedUsine", usineId);
  });
  document.querySelector(".add-machine-form").addEventListener("submit", addMachine);
});

function setupImageDropZone(zoneId, inputId, labelId) {
  const dropZone = document.getElementById(zoneId);
  const fileInput = document.getElementById(inputId);
  const label = document.getElementById(labelId);
  if (!dropZone || !fileInput || !label) return;
  
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("is-dragover");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("is-dragover"));
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("is-dragover");
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      label.textContent = "📁 " + e.dataTransfer.files[0].name;
    }
  });
  fileInput.addEventListener("change", e => {
    label.textContent = e.target.files[0]?.name 
      ? "📁 " + e.target.files[0].name 
      : "📁 Click to upload or drag and drop";
  });
}

async function loadFactories() {
  const sb = await window.IMMS.getClient();
  const { usineId } = window.IMMS.getContext();
  const { data, error } = await sb.from("usines").select("id,name").order("name");
  if (error) return window.IMMS.notify(error.message, "error");
  const select = document.getElementById("UsineMachine");
  select.innerHTML = '<option value="">Select a factory</option>' + (data || [])
    .map(u => `<option value="${u.id}" ${u.id === usineId ? "selected" : ""}>${window.IMMS.escapeHtml(u.name)}</option>`)
    .join("");
  if (usineId) await loadChaines(usineId);
}

async function loadChaines(usineId) {
  const select = document.getElementById("MachineChaine");
  if (!select) return;
  select.innerHTML = '<option value="">Select a production line</option>';
  if (!usineId) return;
  const sb = await window.IMMS.getClient();
  const { chaineId } = window.IMMS.getContext();
  const { data, error } = await sb.from("chaines").select("id,name").eq("usine_id", usineId).order("name");
  if (error) return window.IMMS.notify(error.message, "error");
  select.innerHTML = '<option value="">Select a production line</option>' + (data || [])
    .map(c => `<option value="${c.id}" ${c.id === chaineId ? "selected" : ""}>${window.IMMS.escapeHtml(c.name)}</option>`)
    .join("");
}

async function uploadImage(sb, file) {
  if (!file) return null;
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
  const path = `machines/${crypto.randomUUID()}-${safeName}`;
  const { error } = await sb.storage.from("images").upload(path, file);
  if (error) throw error;
  return path;
}

async function addMachine(e) {
  e.preventDefault();
  const sb = await window.IMMS.getClient();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Adding...';
  
  try {
    const usine_id = document.getElementById("UsineMachine").value;
    const chaine_id = document.getElementById("MachineChaine")?.value;
    const name = document.getElementById("MachineName").value.trim();
    
    if (!name || !usine_id || !chaine_id) {
      throw new Error("Machine name, factory and production line are required.");
    }
    
    const payload = {
      name,
      usine_id,
      chaine_id,
      type: document.getElementById("MachineType").value.trim(),
      manufacturer: document.getElementById("MachineManufacturer").value.trim(),
      responsable: document.getElementById("MachineResponsable").value.trim(),
      image_url: await uploadImage(sb, document.getElementById("MachineImage").files[0]),
      status: "running"
    };
    
    const { error } = await sb.from("machines").insert(payload);
    if (error) throw error;
    
    window.IMMS.setContext("selectedUsine", usine_id);
    window.IMMS.setContext("selectedChaine", chaine_id);
    window.IMMS.notify("Machine added successfully!", "success");
    setTimeout(() => { window.location.href = "machines.html"; }, 800);
  } catch (error) {
    window.IMMS.notify(error.message, "error");
    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 5v14M5 12h14"/></svg> Add Machine';
  }
}