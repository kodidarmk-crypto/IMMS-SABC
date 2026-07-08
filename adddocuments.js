document.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".card-adddocuments form").addEventListener("submit", addDocument);
});

async function addDocument(e) {
  e.preventDefault();
  const { machineId } = window.IMMS.getContext();
  if (!machineId) return window.IMMS.notify("Open a machine first.", "error");

  const sb = await window.IMMS.getClient();
  const title = document.getElementById("documentTitle").value.trim();
  const file = document.getElementById("documentFile").files[0];
  if (!title || !file) return window.IMMS.notify("Title and file are required.", "error");

  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.querySelector(".btn-text").textContent = "Uploading...";
  btn.querySelector(".btn-loader").classList.add("active");

  try {
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
    const path = `documents/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await sb.storage.from("documents").upload(path, file);
    if (uploadError) throw uploadError;

    const { error: dbError } = await sb.from("documents").insert({
      machine_id: machineId,
      title,
      category: document.getElementById("documentDescription")?.value?.trim() || "General",
      file_url: path
    });
    if (dbError) throw dbError;

    window.IMMS.notify("Document added successfully.", "success");
    setTimeout(() => { window.location.href = "documents.html"; }, 800);
  } catch (error) {
    window.IMMS.notify(error.message, "error");
    btn.disabled = false;
    btn.querySelector(".btn-text").textContent = "Upload Document";
    btn.querySelector(".btn-loader").classList.remove("active");
  }
}