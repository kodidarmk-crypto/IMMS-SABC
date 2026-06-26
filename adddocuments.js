document.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".card_adddocuments_right form").addEventListener("submit", addDocument);
});

async function addDocument(e) {
  e.preventDefault();
  const { machineId } = window.IMMS.getContext();
  if (!machineId) return window.IMMS.notify("Open a machine first.", "error");

  const title = document.getElementById("documentTitle").value.trim();
  const description = document.getElementById("documentDescription").value.trim();
  const file = document.getElementById("documentFile").files[0];
  if (!title || !file) return window.IMMS.notify("Document title and file are required.", "error");

  try {
    const sb = await window.IMMS.getClient();
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
    const file_url = `${machineId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await sb.storage.from("documents").upload(file_url, file);
    if (uploadError) throw uploadError;

    const { error } = await sb.from("documents").insert({
      machine_id: machineId,
      title,
      category: description || "Technical document",
      file_url
    });
    if (error) throw error;
    window.location.href = "documents.html";
  } catch (error) {
    window.IMMS.notify(error.message, "error");
  }
}
