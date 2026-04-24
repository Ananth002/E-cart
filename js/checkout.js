
const ORDER_HISTORY_KEY = "shopcart-order-history-v1";
const PAYMENT_METHODS = {
  card: {
    label: "Card",
    taxRate: 0.06,
    note: "Card payments use the standard secure checkout tax rate.",
  },
  upi: {
    label: "UPI",
    taxRate: 0.03,
    note: "UPI gives the lowest bill tax for faster direct payments.",
  },
  cash: {
    label: "Cash on Delivery",
    taxRate: 0.04,
    note: "Cash on delivery keeps billing simple with a reduced offline tax rate.",
  },
};

function $(id) { return document.getElementById(id); }
function fmt(n) { return typeof formatPrice === "function" ? formatPrice(n) : `\u20B9${n.toFixed(2)}`; }

function getPaymentMethod() {
  return document.querySelector('input[name="paymentMethod"]:checked')?.value || "card";
}

function getPaymentConfig(method = getPaymentMethod()) {
  return PAYMENT_METHODS[method] || PAYMENT_METHODS.card;
}

function getCheckoutTotals(method = getPaymentMethod()) {
  const config = getPaymentConfig(method);
  const subtotal = cart.subtotal();
  const tax = subtotal * config.taxRate;
  const total = subtotal + tax;

  return { subtotal, tax, total, method, config };
}

function formatPaymentMethodLabel(method = getPaymentMethod()) {
  return getPaymentConfig(method).label;
}

function getOrderHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDER_HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOrderHistory(order) {
  const history = getOrderHistory();
  history.unshift(order);
  localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(history.slice(0, 8)));
}

function formatOrderDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

function sanitizeDigits(value, limit) {
  return String(value).replace(/\D/g, "").slice(0, limit);
}

function formatCardNumber(value) {
  return sanitizeDigits(value, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value) {
  let digits = sanitizeDigits(value, 4);
  if (digits.length === 1 && Number(digits) > 1) digits = `0${digits}`;

  if (digits.length >= 2) {
    const month = Math.min(12, Math.max(1, Number(digits.slice(0, 2))));
    digits = `${String(month).padStart(2, "0")}${digits.slice(2)}`;
  }

  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
}

function updatePayLabel(total) {
  const payLabel = $("payLabel");
  if (!payLabel) return;
  const method = getPaymentMethod();
  const methodLabel = formatPaymentMethodLabel(method);
  payLabel.textContent = method === "cash" ? `Place Order ${fmt(total)}` : `Pay by ${methodLabel} ${fmt(total)}`;
}

function updatePaymentUI() {
  const method = getPaymentMethod();
  const config = getPaymentConfig(method);

  document.querySelectorAll(".payment-option").forEach(option => {
    const input = option.querySelector("input");
    option.classList.toggle("active", Boolean(input?.checked));
  });

  const cardFields = $("cardFields");
  const upiFields = $("upiFields");
  const cashFields = $("cashFields");

  if (cardFields) cardFields.hidden = method !== "card";
  if (upiFields) upiFields.hidden = method !== "upi";
  if (cashFields) cashFields.hidden = method !== "cash";

  document.querySelectorAll('[data-payment-field="card"]').forEach(field => {
    field.disabled = method !== "card";
    field.required = method === "card";
    field.setCustomValidity("");
  });

  document.querySelectorAll('[data-payment-field="upi"]').forEach(field => {
    field.disabled = method !== "upi";
    field.required = method === "upi";
    field.setCustomValidity("");
  });

  const paymentSummaryNote = $("paymentSummaryNote");
  if (paymentSummaryNote) {
    paymentSummaryNote.textContent = config.note;
  }

  renderSummary();
}

function bindSummaryActions(container) {
  container.querySelectorAll("[data-summary-inc]").forEach(button => {
    button.addEventListener("click", () => {
      const item = cart.items.find(entry => entry.id === button.dataset.summaryInc);
      if (item) cart.setQty(item.id, item.qty + 1);
    });
  });

  container.querySelectorAll("[data-summary-dec]").forEach(button => {
    button.addEventListener("click", () => {
      const item = cart.items.find(entry => entry.id === button.dataset.summaryDec);
      if (!item) return;
      if (item.qty === 1) cart.remove(item.id);
      else cart.setQty(item.id, item.qty - 1);
    });
  });

  container.querySelectorAll("[data-summary-remove]").forEach(button => {
    button.addEventListener("click", () => cart.remove(button.dataset.summaryRemove));
  });
}

function renderSummary() {
  const wrap = $("summaryItems");
  if (!wrap) return;

  if (cart.items.length === 0) {
    wrap.innerHTML = `<p style="font-size:14px;color:var(--muted-fg)">Your cart is empty. <a href="../index.html" style="color:var(--primary);text-decoration:underline">Browse products</a>.</p>`;
  } else {
    wrap.innerHTML = cart.items.map(item => `
      <div class="summary-item">
        <div class="thumb"><img src="${item.img}" alt="${item.name}"/></div>
        <div class="info">
          <p>${item.name}</p>
          <div class="summary-item-tools">
            <div class="qty summary-qty">
              <button type="button" data-summary-dec="${item.id}" aria-label="Decrease quantity">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <span>Qty ${item.qty}</span>
              <button type="button" data-summary-inc="${item.id}" aria-label="Increase quantity">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
            <button class="summary-remove-btn" type="button" data-summary-remove="${item.id}">Remove</button>
          </div>
        </div>
        <p class="price">${fmt(item.price * item.qty)}</p>
      </div>
    `).join("");

    bindSummaryActions(wrap);
  }

  const totals = getCheckoutTotals();
  $("paymentSummaryNote").textContent = totals.config.note;
  $("sumSub").textContent = fmt(totals.subtotal);
  $("sumTax").textContent = fmt(totals.tax);
  $("sumTotal").textContent = fmt(totals.total);
  $("sumPaymentMethod").textContent = totals.config.label;
  $("sumTaxLabel").textContent = `Tax (${Math.round(totals.config.taxRate * 100)}%)`;
  updatePayLabel(totals.total);
}

function validatePhoneAndZip(form) {
  const phone = form.elements.phone;
  const zip = form.elements.zip;

  phone.setCustomValidity("");
  zip.setCustomValidity("");

  if (sanitizeDigits(phone.value, 10).length !== 10) {
    phone.setCustomValidity("Enter a 10-digit phone number.");
    phone.reportValidity(); return false;
  }

  if (sanitizeDigits(zip.value, 6).length !== 6) {
    zip.setCustomValidity("Enter a 6-digit ZIP code.");
    zip.reportValidity(); return false;
  }

  return true;
}

function validateCardDetails(form) {
  const cardNumber = form.elements.cardNumber;
  const expiry = form.elements.expiry;
  const cvc = form.elements.cvc;

  cardNumber.setCustomValidity("");
  expiry.setCustomValidity("");
  cvc.setCustomValidity("");

  if (sanitizeDigits(cardNumber.value, 16).length !== 16) {
    cardNumber.setCustomValidity("Enter a valid 16-digit card number.");
    cardNumber.reportValidity(); return false;
  }

  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry.value)) {
    expiry.setCustomValidity("Enter expiry in MM/YY format.");
    expiry.reportValidity(); return false;
  }

  const [monthText, yearText] = expiry.value.split("/");
  const month = Number(monthText);
  const year = Number(`20${yearText}`);
  const now = new Date();
  const expiryDate = new Date(year, month, 0, 23, 59, 59);
  if (expiryDate < now) {
    expiry.setCustomValidity("Card expiry date has passed.");
    expiry.reportValidity(); return false;
  }

  const cvcLength = sanitizeDigits(cvc.value, 4).length;
  if (cvcLength < 3 || cvcLength > 4) {
    cvc.setCustomValidity("Enter a valid CVC.");
    cvc.reportValidity(); return false;
  }

  return true;
}

function validateUpiDetails(form) {
  const upiId = form.elements.upiId;
  upiId.setCustomValidity("");
  const value = String(upiId.value).trim();

  if (!/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/i.test(value)) {
    upiId.setCustomValidity("Enter a valid UPI ID like name@upi.");
    upiId.reportValidity(); return false;
  }

  return true;
}

function validateCheckoutForm(form) {
  if (!form.reportValidity()) return false;
  if (!validatePhoneAndZip(form)) return false;

  const method = getPaymentMethod();
  if (method === "card" && !validateCardDetails(form)) return false;
  if (method === "upi" && !validateUpiDetails(form)) return false;

  return true;
}

function savePlacedOrder(formData) {
  const totals = getCheckoutTotals();
  const now = new Date();
  const orderId = "SC-" + Date.now().toString().slice(-8);
  const method = getPaymentMethod();
  const paymentMethodLabel = formatPaymentMethodLabel(method);
  const orderItems = cart.items.map(item => ({ ...item }));

  const orderRecord = {
    orderId,
    customer: formData,
    items: orderItems,
    sub: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    date: formatOrderDate(now),
    paymentMethod: method,
    paymentMethodLabel,
  };

  localStorage.setItem("shopcart-last-order", JSON.stringify(orderRecord));
  saveOrderHistory(orderRecord);

 
  return orderRecord;
}

function showSuccess(order) {
  $("checkoutView").style.display = "none";
  $("successView").style.display = "block";
  
  
  const previewWrap = $("invoicePreview");
  if (previewWrap) {
    previewWrap.innerHTML = renderInvoiceCard(order);
  }

  
  const downloadBtn = $("downloadInvoiceBtn");
  if (downloadBtn) {
    downloadBtn.onclick = () => downloadInvoice(order);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindInputFormatting() {
  document.querySelectorAll("[data-number-only]").forEach(input => {
    input.addEventListener("input", () => {
      const limit = Number(input.dataset.numberOnly || input.maxLength || 999);
      input.value = sanitizeDigits(input.value, limit);
      input.setCustomValidity("");
    });
  });

  document.querySelectorAll("[data-card-number]").forEach(input => {
    input.addEventListener("input", () => {
      input.value = formatCardNumber(input.value);
      input.setCustomValidity("");
    });
  });

  document.querySelectorAll("[data-expiry]").forEach(input => {
    input.addEventListener("input", () => {
      input.value = formatExpiry(input.value);
      input.setCustomValidity("");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderSummary();
  bindInputFormatting();
  updatePaymentUI();

  const originalSave = cart.save.bind(cart);
  cart.save = function() {
    originalSave();
    renderSummary();
  };

  document.querySelectorAll('input[name="paymentMethod"]').forEach(input => {
    input.addEventListener("change", updatePaymentUI);
  });

  $("checkoutForm")?.addEventListener("submit", event => {
    event.preventDefault();

    if (cart.items.length === 0) {
      showToast("Your cart is empty");
      return;
    }

    const form = event.currentTarget;
    if (!validateCheckoutForm(form)) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const orderRecord = savePlacedOrder(data); 
    cart.clear();
    showSuccess(orderRecord); 
  });
});