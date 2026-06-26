document.addEventListener("DOMContentLoaded", async () => {
  await loadFactories();
  setupImageDropZone("imageDropZone", "MachineImage", "imageLabel");
  document.getElementById("UsineMachine")?.addEventListener("change", e => loadChaines(e.target.value));
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
      label.textContent = e.dataTransfer.files[0].name;
    }
  });
  fileInput.addEventListener("change", e => {
    label.textContent = e.target.files[0]?.name || "Click to upload or drag and drop";
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
  let select = document.getElementById("MachineChaine");
  if (!select) {
    const group = document.createElement("div");
    group.className = "form-group-addMachine";
    group.innerHTML = '<label>Production line</label><select id="MachineChaine"><option value="">Select a production line</option></select>';
    document.querySelector(".form-grid-addMachine").appendChild(group);
    select = document.getElementById("MachineChaine");
  }
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
  try {
    const usine_id = document.getElementById("UsineMachine").value;
    const chaine_id = document.getElementById("MachineChaine")?.value || window.IMMS.getContext().chaineId;
    const payload = {
      name: document.getElementById("MachineName").value.trim(),
      usine_id,
      chaine_id,
      type: document.getElementById("MachineType").value.trim(),
      manufacturer: document.getElementById("MachineManufacturer").value.trim(),
      responsable: document.getElementById("MachineResponsable").value.trim(),
      image_url: await uploadImage(sb, document.getElementById("MachineImage").files[0]),
      status: "running"
    };
    if (!payload.name || !payload.usine_id || !payload.chaine_id) throw new Error("Machine name, factory and production line are required.");
    const { error } = await sb.from("machines").insert(payload);
    if (error) throw error;
    window.IMMS.setContext("selectedUsine", usine_id);
    window.IMMS.setContext("selectedChaine", chaine_id);
    window.location.href = "machines.html";
  } catch (error) {
    window.IMMS.notify(error.message, "error");
  }
}
