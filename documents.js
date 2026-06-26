document.addEventListener("DOMContentLoaded", loadDocuments);

async function loadDocuments() {
  const { machineId } = window.IMMS.getContext();
  const container = document.getElementById("documents-list");
  if (!machineId) {
    container.innerHTML = '<p class="empty-state">Open a machine first.</p>';
    return;
  }

  const sb = await window.IMMS.getClient();
  const { data, error } = await sb.from("documents").select("*").eq("machine_id", machineId).order("created_at", { ascending: false });
  if (error) {
    container.innerHTML = `<p class="empty-state">${window.IMMS.escapeHtml(error.message)}</p>`;
    return;
  }

  container.innerHTML = (data || []).length ? data.map(doc => `
    <div class="document-card">
      <div>
        <h3>${window.IMMS.escapeHtml(doc.title)}</h3>
        <p>${window.IMMS.escapeHtml(doc.category || "Document")}</p>
      </div>
      <a class="open-machine-btn" href="${window.IMMS.publicUrl(doc.file_url, "documents")}" target="_blank" rel="noreferrer">Open</a>
    </div>`).join("") : '<p class="empty-state">No documents for this machine.</p>';
}
