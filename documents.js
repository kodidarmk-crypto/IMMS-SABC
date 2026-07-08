document.addEventListener("DOMContentLoaded", async () => {
  await loadDocuments();
});

async function loadDocuments() {
  const { machineId } = window.IMMS.getContext();
  if (!machineId) {
    document.getElementById("documents-list").innerHTML = '<div class="empty-state">Open a machine first to view its documents.</div>';
    return;
  }

  const sb = await window.IMMS.getClient();
  const { data, error } = await sb
    .from("documents")
    .select("*")
    .eq("machine_id", machineId)
    .order("created_at", { ascending: false });

  if (error) return window.IMMS.notify(error.message, "error");

  const container = document.getElementById("documents-list");
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="empty-state">No documents for this machine.</div>';
    return;
  }

  container.innerHTML = data.map(doc => `
    <div class="document-card">
      <div class="document-left">
        <div class="document-icon">📄</div>
        <div class="document-file-info">
          <h2>${window.IMMS.escapeHtml(doc.title)}</h2>
          <p>${new Date(doc.created_at).toLocaleDateString()}</p>
        </div>
      </div>
      <div class="document-center">
        <h3>${window.IMMS.escapeHtml(doc.category || "General")}</h3>
      </div>
      <div class="document-right">
        <a href="${window.IMMS.publicUrl(doc.file_url, "documents")}" target="_blank" download>
          <button class="download-btn">⬇ Download</button>
        </a>
      </div>
    </div>
  `).join("");
}