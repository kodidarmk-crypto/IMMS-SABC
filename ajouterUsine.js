document.addEventListener("DOMContentLoaded", () => {
  setupImageDropZone("imageDropZone", "usineImage", "imageLabel");
  document.querySelector(".add-usine-form").addEventListener("submit", addUsine);
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

async function uploadImage(sb, file, folder) {
  if (!file) return null;
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await sb.storage.from("images").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

async function addUsine(e) {
  e.preventDefault();
  const sb = await window.IMMS.getClient();
  const imageFile = document.getElementById("usineImage").files[0];

  try {
    const image_url = await uploadImage(sb, imageFile, "usines");
    const payload = {
      name: document.getElementById("usineNom").value.trim(),
      city: document.getElementById("usineVille").value.trim(),
      responsable: document.getElementById("usineResponsable").value.trim(),
      sector: document.getElementById("usineSecteur").value.trim(),
      creation_date: document.getElementById("usineDate").value || null,
      image_url,
      status: "active"
    };
    if (!payload.name) throw new Error("Factory name is required.");

    const { error } = await sb.from("usines").insert(payload);
    if (error) throw error;
    window.location.href = "Usines.html";
  } catch (error) {
    window.IMMS.notify(error.message, "error");
  }
}
