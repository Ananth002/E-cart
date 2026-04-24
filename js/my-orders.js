const ORDER_HISTORY_KEY = "shopcart-order-history-v1";

function readOrderHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDER_HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function bindInvoiceActions(history) {
  document.querySelectorAll("[data-download-invoice]").forEach(button => {
    button.addEventListener("click", async () => {
      const order = history.find(entry => entry.orderId === button.dataset.downloadInvoice);
      // downloadInvoice is now globally available via script.js
      if (order) await downloadInvoice(order);
    });
  });
}

function renderOrderHistoryPage() {
  const wrap = document.getElementById("orderHistoryList");
  if (!wrap) return;

  const history = readOrderHistory();

  if (!history.length) {
    wrap.innerHTML = `
      <div class="history-empty">
        <p>No orders placed yet.</p>
        <span>Place an order from the shop page and it will appear here.</span>
      </div>
    `;
    return;
  }

  wrap.innerHTML = history.map(order => {
    const items = Array.isArray(order.items) ? order.items : [];
    const itemCount = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const preview = items.slice(0, 3).map(item => item.name).join(", ");
    const paymentLabel = order.paymentMethodLabel || "Saved Order";

    return `
      <article class="history-card">
        <div class="history-top">
          <div>
            <p class="history-id">${order.orderId || "Order"}</p>
            <p class="history-date">${order.date || "Date unavailable"}</p>
          </div>
          <p class="history-total">${formatOrderMoney(order.total || 0)}</p>
        </div>
        <div class="history-meta">
          <span class="history-chip">${paymentLabel}</span>
          <span>${itemCount} item${itemCount === 1 ? "" : "s"}</span>
        </div>
        <p class="history-items">${preview || "No item details saved"}</p>
        <div class="history-actions">
          <button class="btn btn-outline" type="button" data-download-invoice="${order.orderId}">Download Invoice</button>
        </div>
      </article>
    `;
  }).join("");

  bindInvoiceActions(history);
}

document.addEventListener("DOMContentLoaded", () => {
  renderOrderHistoryPage();
});