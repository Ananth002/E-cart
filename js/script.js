
const CATEGORY_META = {
  mobile: { name: "Mobile", teaser: "Smartphones for daily use" },
  dress: { name: "Dress", teaser: "Everyday and occasion dresses" },
  headphone: { name: "Headphone", teaser: "Wireless and studio audio picks" },
  laptop: { name: "Laptop", teaser: "Work and study laptops" },
  shoes: { name: "Shoes", teaser: "Street-ready and comfort shoes" },
  book: { name: "Book", teaser: "Popular reads and journals" },
  watch: { name: "Watch", teaser: "A convertible strap" },
};


let PRODUCTS = [];
let CATEGORY_SUMMARY = [];
let PRICE_LIMITS = { min: Number.POSITIVE_INFINITY, max: 0 };

const catalogState = {
  category: "all",
  sort: "newest",
  search: "",
  favoritesOnly: false,
  minPrice: 0,
  maxPrice: 0,
  trackMin: 0,
  trackMax: 0,
  view: "grid",
};

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INR_NUMBER_FORMATTER = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

function formatPrice(amountInInr) {
  return INR_FORMATTER.format(amountInInr);
}

function formatPriceInputValue(amountInInr) {
  return INR_NUMBER_FORMATTER.format(Math.round(amountInInr));
}

function formatPriceHint(amountInInr) {
  return `\u20B9${formatPriceInputValue(amountInInr)}`;
}

function getCategoryLabel(categoryId) {
  if (categoryId === "all") return "all products";
  return CATEGORY_META[categoryId]?.name || "all products";
}

function getProductsForCategory(categoryId = catalogState.category) {
  if (categoryId === "all") return PRODUCTS;
  return PRODUCTS.filter(product => product.category === categoryId);
}

function getPriceLimitsForCategory(categoryId = catalogState.category) {
  return { ...PRICE_LIMITS };
}

function resetPriceRangeToDefault(categoryId = catalogState.category) {
  const limits = getPriceLimitsForCategory(categoryId);
  catalogState.minPrice = limits.min;
  catalogState.maxPrice = limits.max;
  catalogState.trackMin = limits.min;
  catalogState.trackMax = limits.max;
}

function getSortedProducts(products) {
  const sorted = [...products];

  switch (catalogState.sort) {
    case "price-low":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "price-high":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "newest":
      sorted.sort((a, b) => b.index - a.index);
      break;
    case "name":
    default:
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  return sorted;
}


const FAVORITES_KEY = "shopcart-favorites-v1";
const favorites = {
  items: new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")),
  save() {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(this.items)));
    renderFavoriteBadge();
    syncFavoriteToggle();
  },
  has(id) {
    return this.items.has(id);
  },
  toggle(id) {
    if (this.items.has(id)) this.items.delete(id);
    else this.items.add(id);
    this.save();
  },
  count() {
    return this.items.size;
  },
};

function getFilteredProducts() {
  const searchTerm = catalogState.search.trim().toLowerCase();

  return getSortedProducts(
    PRODUCTS.filter(product => {
      const matchesCategory = catalogState.category === "all" || product.category === catalogState.category;
      const matchesFavorite = !catalogState.favoritesOnly || favorites.has(product.id);
      const matchesPrice = product.price >= catalogState.minPrice && product.price <= catalogState.maxPrice;
      const matchesSearch = !searchTerm || [
        product.name,
        product.desc,
        product.brand,
        product.vendor,
        CATEGORY_META[product.category]?.name || "",
      ].some(value => value.toLowerCase().includes(searchTerm));

      return matchesCategory && matchesFavorite && matchesPrice && matchesSearch;
    })
  );
}

function getSearchRecommendations() {
  const query = catalogState.search.trim().toLowerCase();
  const recommendationPool = getSortedProducts(PRODUCTS);
  if (!query) return recommendationPool.slice(0, 6);

  return recommendationPool.filter(product => (
    product.name.toLowerCase().includes(query) ||
    product.brand.toLowerCase().includes(query) ||
    product.vendor.toLowerCase().includes(query)
  )).slice(0, 6);
}


const CART_KEY = "shopcart-cart-v1";
const cart = {
  items: JSON.parse(localStorage.getItem(CART_KEY) || "[]"),
  save() {
    localStorage.setItem(CART_KEY, JSON.stringify(this.items));
    renderCartBadge();
    renderDrawer();
  },
  add(product, qty = 1) {
    const existing = this.items.find(item => item.id === product.id);
    if (existing) existing.qty += qty;
    else {
      this.items.push({
        id: product.id,
        name: product.name,
        desc: product.desc,
        price: product.price,
        img: product.img,
        qty,
      });
    }
    this.save();
    showToast(`${product.name} added to cart`);
  },
  remove(id) {
    this.items = this.items.filter(item => item.id !== id);
    this.save();
  },
  setQty(id, qty) {
    const item = this.items.find(entry => entry.id === id);
    if (!item) return;
    item.qty = Math.max(1, qty);
    this.save();
  },
  clear() {
    this.items = [];
    this.save();
  },
  count() {
    return this.items.reduce((sum, item) => sum + item.qty, 0);
  },
  subtotal() {
    return this.items.reduce((sum, item) => sum + item.qty * item.price, 0);
  },
};


function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove("show"), 2200);
}


function renderCategoryControls() {
  const categories = [
    { id: "all", name: "All products", count: PRODUCTS.length },
    ...CATEGORY_SUMMARY,
  ];

  const categoriesMenu = document.getElementById("categoriesMenu");
  if (categoriesMenu) {
    categoriesMenu.innerHTML = categories
      .filter(category => category.id !== "all")
      .map(category => `
        <button class="dropdown-item ${catalogState.category === category.id ? "active" : ""}" type="button" data-category="${category.id}">
          <span>${category.name}</span>
          <small>${category.count} items</small>
        </button>
      `).join("");
  }

  const mobileCategoryLinks = document.getElementById("mobileCategoryLinks");
  if (mobileCategoryLinks) {
    mobileCategoryLinks.innerHTML = categories
      .filter(category => category.id !== "all")
      .map(category => `
        <button class="mobile-category-link ${catalogState.category === category.id ? "active" : ""}" type="button" data-category="${category.id}">
          <span>${category.name}</span>
          <small>${category.count}</small>
        </button>
      `).join("");
  }
}


function syncPriceInputs() {
  const minInput = document.getElementById("minPriceRange");
  const maxInput = document.getElementById("maxPriceRange");
  

  if (minInput) {
    minInput.min = String(catalogState.trackMin);
    minInput.max = String(catalogState.trackMax);
    minInput.step = "1"; 
    minInput.value = String(catalogState.minPrice);
  }

  if (maxInput) {
    maxInput.min = String(catalogState.trackMin);
    maxInput.max = String(catalogState.trackMax);
    maxInput.step = "1"; 
    maxInput.value = String(catalogState.maxPrice);
  }


  const minNumberInput = document.getElementById("minPriceInput");
  const maxNumberInput = document.getElementById("maxPriceInput");
  if (minNumberInput && document.activeElement !== minNumberInput) {
    minNumberInput.value = formatPriceInputValue(catalogState.trackMin);
  }
  if (maxNumberInput && document.activeElement !== maxNumberInput) {
    maxNumberInput.value = formatPriceInputValue(catalogState.trackMax);
  }


  const clampedMin = Math.max(catalogState.trackMin, Math.min(catalogState.minPrice, catalogState.trackMax));
  const clampedMax = Math.max(catalogState.trackMin, Math.min(catalogState.maxPrice, catalogState.trackMax));


  const minHint = document.getElementById("minPriceHint");
  if (minHint) minHint.textContent = formatPriceHint(clampedMin);
  
  const maxHint = document.getElementById("maxPriceHint");
  if (maxHint) maxHint.textContent = formatPriceHint(clampedMax);


  const priceProgress = document.getElementById("priceProgress");
  const minTooltip = document.getElementById("minPriceTooltip");
  const maxTooltip = document.getElementById("maxPriceTooltip");

  if (priceProgress) {
    const range = catalogState.trackMax - catalogState.trackMin || 1;
    const minPercent = ((clampedMin - catalogState.trackMin) / range) * 100;
    const maxPercent = ((clampedMax - catalogState.trackMin) / range) * 100;
    
   
    priceProgress.style.left = `calc(10px + (100% - 20px) * ${minPercent / 100})`;
    priceProgress.style.width = `calc((100% - 20px) * ${Math.max(0, maxPercent - minPercent) / 100})`;

   
    if (minTooltip) {
      minTooltip.textContent = formatPriceHint(clampedMin);
      minTooltip.style.left = `calc(10px + (100% - 20px) * ${minPercent / 100})`;
    }
    if (maxTooltip) {
      maxTooltip.textContent = formatPriceHint(clampedMax);
      maxTooltip.style.left = `calc(10px + (100% - 20px) * ${maxPercent / 100})`;
    }
  }
}

function syncToolbarState() {
  document.querySelectorAll(".view-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.view === catalogState.view);
  });

  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) sortSelect.value = catalogState.sort;
}

function syncFavoriteToggle() {
  const button = document.getElementById("toggleFavorites");
  if (!button) return;
  button.classList.toggle("active", catalogState.favoritesOnly);
  button.setAttribute("aria-pressed", String(catalogState.favoritesOnly));
}

function renderSearchSuggestions(forceOpen = false) {
  const suggestionBox = document.getElementById("searchSuggestions");
  if (!suggestionBox) return;

  const searchTerm = catalogState.search.trim();
  if (!searchTerm && !forceOpen) {
    suggestionBox.hidden = true;
    suggestionBox.innerHTML = "";
    return;
  }

  const recommendations = getSearchRecommendations();
  if (!recommendations.length) {
    suggestionBox.hidden = true;
    suggestionBox.innerHTML = "";
    return;
  }

  suggestionBox.innerHTML = recommendations.map(product => `
    <button class="search-suggestion-item" type="button" data-product-id="${product.id}">
      <span class="search-suggestion-name">${product.name}</span>
      <small>${product.brand}</small>
    </button>
  `).join("");

  suggestionBox.hidden = false;
}

function hideSearchSuggestions() {
  const suggestionBox = document.getElementById("searchSuggestions");
  if (!suggestionBox) return;
  suggestionBox.hidden = true;
}

function applySearchValue(value) {
  catalogState.search = value;
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = value;
  renderProducts();
  renderSearchSuggestions();
}

function renderProducts() {
  const productGrid = document.getElementById("productGrid");
  if (!productGrid) return;

  const filteredProducts = getFilteredProducts();
  const categoryLabel = getCategoryLabel(catalogState.category);

  productGrid.classList.toggle("compact-view", catalogState.view === "compact");

  const resultCount = document.getElementById("resultCount");
  if (resultCount) resultCount.textContent = String(filteredProducts.length);

  const activeCategoryLabel = document.getElementById("activeCategoryLabel");
  if (activeCategoryLabel) activeCategoryLabel.textContent = categoryLabel.toLowerCase();

  const resultWord = document.getElementById("resultWord");
  if (resultWord) resultWord.textContent = filteredProducts.length === 1 ? "result" : "results";

  if (!filteredProducts.length) {
    productGrid.innerHTML = `
      <div class="empty-products">
        <h3>${catalogState.favoritesOnly ? "No favorite products yet" : "No products match your filters"}</h3>
        <p>${catalogState.favoritesOnly ? "Tap the heart on any product to add it to your favorite list." : "Try a different category, change the search, or widen the price range."}</p>
      </div>
    `;
    return;
  }

  productGrid.innerHTML = filteredProducts.map(product => `
    <article class="product">
      <div class="product-image">
        <img src="${product.img}" alt="${product.name}" loading="lazy" data-fit="${product.fit}" />
        <button class="fav-btn ${favorites.has(product.id) ? "active" : ""}" type="button" data-id="${product.id}" aria-label="Favorite product">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
      <p class="product-brand">${product.vendor}</p>
      <div class="product-head">
        <h3>${product.name}</h3>
        <p class="product-price">${formatPrice(product.price)}</p>
      </div>
      <p class="product-desc">${product.desc}</p>
      <button class="add-btn" type="button" data-id="${product.id}">Add to Cart</button>
    </article>
  `).join("");

  productGrid.querySelectorAll(".add-btn").forEach(button => {
    button.addEventListener("click", () => {
      const product = PRODUCTS.find(entry => entry.id === button.dataset.id);
      if (product) cart.add(product);
    });
  });

  productGrid.querySelectorAll(".fav-btn").forEach(button => {
    button.addEventListener("click", () => {
      const productId = button.dataset.id;
      const wasFavorite = favorites.has(productId);
      favorites.toggle(productId);
      showToast(wasFavorite ? "Removed from favorite" : "Added to favorite");
      renderProducts();
    });
  });
}

function renderCatalog() {
  renderCategoryControls();
  renderFavoriteBadge();
  syncFavoriteToggle();
  syncPriceInputs();
  syncToolbarState();
  renderProducts();
}

function resetCatalogFilters() {
  catalogState.category = "all";
  catalogState.sort = "newest";
  catalogState.search = "";
  catalogState.favoritesOnly = false;
  catalogState.view = "grid";
  resetPriceRangeToDefault("all");

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";

  hideSearchSuggestions();
  renderCatalog();
}

function resetToAllProducts(shouldScroll = true) {
  resetCatalogFilters();
  closeMenus();

  if (shouldScroll) {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}


function injectDrawer() {
  const root = document.getElementById("cartRoot");
  if (!root) return;

  root.innerHTML = `
    <div class="overlay" id="overlay"></div>
    <aside class="drawer" id="drawer" role="dialog" aria-label="Shopping cart" tabindex="-1">
      <div class="drawer-head">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Your Cart <span class="count" id="drawerCount">(0)</span>
        </h2>
        <button class="close-btn" id="closeCart" type="button" aria-label="Close cart">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div id="drawerBody"></div>
    </aside>
  `;

  document.getElementById("overlay")?.addEventListener("click", closeDrawer);
  document.getElementById("closeCart")?.addEventListener("click", closeDrawer);
}

function openDrawer() {
  if (!document.getElementById("drawer")) injectDrawer();
  document.body.classList.add("drawer-open");
  document.getElementById("overlay")?.classList.add("open");
  document.getElementById("drawer")?.classList.add("open");
  document.getElementById("drawer")?.focus();
}

function closeDrawer() {
  document.body.classList.remove("drawer-open");
  document.getElementById("overlay")?.classList.remove("open");
  document.getElementById("drawer")?.classList.remove("open");
}

function renderDrawer() {
  const body = document.getElementById("drawerBody");
  const count = cart.count();
  const drawerCount = document.getElementById("drawerCount");
  if (drawerCount) drawerCount.textContent = `(${count})`;
  if (!body) return;

  if (cart.items.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <div>
          <div class="icon-circle">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
          <p class="t">Your cart is empty</p>
          <p class="s">Browse products and add your favorites.</p>
          <button class="btn btn-primary" type="button" style="margin-top:20px" onclick="closeDrawer()">Continue shopping</button>
        </div>
      </div>
    `;
    return;
  }

  body.innerHTML = `
    <div class="cart-items">
      ${cart.items.map(item => `
        <div class="cart-item">
          <div class="cart-thumb"><img src="${item.img}" alt="${item.name}" /></div>
          <div class="cart-item-body">
            <div class="cart-item-top">
              <h3>${item.name}</h3>
              <button class="remove-btn" type="button" data-remove="${item.id}" aria-label="Remove">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </button>
            </div>
            <p class="cart-item-desc">${item.desc || ""}</p>
            <div class="cart-item-row">
              <div class="qty">
                <button type="button" data-dec="${item.id}" aria-label="Decrease quantity"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
                <span>${item.qty}</span>
                <button type="button" data-inc="${item.id}" aria-label="Increase quantity"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
              </div>
              <span class="cart-item-total">${formatPrice(item.price * item.qty)}</span>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
    <div class="drawer-foot">
      <div class="summary-row"><span class="muted">Subtotal</span><span>${formatPrice(cart.subtotal())}</span></div>
      <div class="summary-row"><span class="muted">Shipping</span><span class="free">Free</span></div>
      <div class="summary-total"><span>Total</span><span>${formatPrice(cart.subtotal())}</span></div>
      <a href="tab/checkout.html" class="btn btn-primary btn-block">
        Checkout
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </a>
    </div>
  `;

  body.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", () => cart.remove(button.dataset.remove));
  });

  body.querySelectorAll("[data-inc]").forEach(button => {
    button.addEventListener("click", () => {
      const item = cart.items.find(entry => entry.id === button.dataset.inc);
      if (item) cart.setQty(item.id, item.qty + 1);
    });
  });

  body.querySelectorAll("[data-dec]").forEach(button => {
    button.addEventListener("click", () => {
      const item = cart.items.find(entry => entry.id === button.dataset.dec);
      if (item) cart.setQty(item.id, item.qty - 1);
    });
  });
}

function renderCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;
  const count = cart.count();
  badge.textContent = String(count);
  badge.style.display = count > 0 ? "grid" : "none";
}

function renderFavoriteBadge() {
  const badge = document.getElementById("favoriteBadge");
  if (!badge) return;
  const count = favorites.count();
  badge.textContent = String(count);
  badge.style.display = count > 0 ? "grid" : "none";
}


function toggleCategoryMenu(forceOpen) {
  const dropdown = document.getElementById("categoriesDropdown");
  const toggle = document.getElementById("categoriesToggle");
  if (!dropdown || !toggle) return;

  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !dropdown.classList.contains("open");
  dropdown.classList.toggle("open", shouldOpen);
  toggle.setAttribute("aria-expanded", String(shouldOpen));
}

function closeMenus() {
  toggleCategoryMenu(false);
  document.getElementById("mobileMenu")?.classList.remove("open");
}

function selectCategory(categoryId, shouldScroll = false) {
  catalogState.category = categoryId;
  resetPriceRangeToDefault(categoryId);
  renderCatalog();
  closeMenus();

  if (shouldScroll) {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function updateScrollTopButton() {
  const button = document.getElementById("scrollTopBtn");
  if (!button) return;
  button.classList.toggle("show", window.scrollY > 280);
}


document.addEventListener("DOMContentLoaded", () => {

  fetch('products.json')
    .then(response => response.json())
    .then(data => {
      PRODUCTS = data;
      
     
      PRODUCTS.forEach((product, index) => {
        product.index = index;
      });

      CATEGORY_SUMMARY = Object.entries(CATEGORY_META).map(([id, meta]) => ({
        id,
        name: meta.name,
        teaser: meta.teaser,
        count: PRODUCTS.filter(product => product.category === id).length,
      }));

      PRICE_LIMITS = PRODUCTS.reduce((acc, product) => ({
        min: Math.min(acc.min, product.price),
        max: Math.max(acc.max, product.price),
      }), { min: Number.POSITIVE_INFINITY, max: 0 });

   
      catalogState.minPrice = PRICE_LIMITS.min;
      catalogState.maxPrice = PRICE_LIMITS.max;
      catalogState.trackMin = PRICE_LIMITS.min;
      catalogState.trackMax = PRICE_LIMITS.max;

   
      injectDrawer();
      renderCartBadge();
      renderFavoriteBadge();
      renderDrawer();

      if (document.getElementById("productGrid")) {
        renderCatalog();
      }
    })
    .catch(error => {
      console.error("Error loading products:", error);
      const grid = document.getElementById("productGrid");
      if (grid) grid.innerHTML = `<p style="text-align:center; padding:40px; color:var(--muted-fg);">Failed to load products. Please make sure you are running a local development server.</p>`;
    });

  
  function bindEditablePriceInput(inputId, isMin) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const applyCustomTrackLimit = () => {
      let parsedValue = parseInt(input.value.replace(/\D/g, ""), 10);
      const fallbackLimits = getPriceLimitsForCategory();

      if (isNaN(parsedValue)) {
        parsedValue = isMin ? fallbackLimits.min : fallbackLimits.max;
      }

      if (isMin) {
        catalogState.trackMin = Math.min(parsedValue, catalogState.trackMax - 1);
        catalogState.minPrice = catalogState.trackMin;
      } else {
        catalogState.trackMax = Math.max(parsedValue, catalogState.trackMin + 1);
        catalogState.maxPrice = catalogState.trackMax;
      }

      syncPriceInputs();
      renderProducts();
    };

    input.addEventListener("change", applyCustomTrackLimit);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur(); 
      }
    });
  }

  bindEditablePriceInput("minPriceInput", true);
  bindEditablePriceInput("maxPriceInput", false);


  document.getElementById("minPriceRange")?.addEventListener("input", event => {
    const value = Number(event.target.value);
    catalogState.minPrice = Math.max(catalogState.trackMin, Math.min(value, catalogState.maxPrice));
    syncPriceInputs();
    renderProducts();
  });

  document.getElementById("maxPriceRange")?.addEventListener("input", event => {
    const value = Number(event.target.value);
    catalogState.maxPrice = Math.min(catalogState.trackMax, Math.max(value, catalogState.minPrice));
    syncPriceInputs();
    renderProducts();
  });

  
  document.getElementById("toggleFavorites")?.addEventListener("click", () => {
    catalogState.favoritesOnly = !catalogState.favoritesOnly;
    renderCatalog();
  });

  document.getElementById("openCart")?.addEventListener("click", openDrawer);

  document.getElementById("menuBtn")?.addEventListener("click", () => {
    document.getElementById("mobileMenu")?.classList.toggle("open");
  });

  document.getElementById("categoriesToggle")?.addEventListener("click", () => {
    toggleCategoryMenu();
  });

  document.getElementById("categoriesMenu")?.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    selectCategory(button.dataset.category, true);
  });

  document.getElementById("mobileCategoryLinks")?.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    selectCategory(button.dataset.category, true);
  });

  document.getElementById("sortSelect")?.addEventListener("change", event => {
    catalogState.sort = event.target.value;
    renderCatalog();
  });

  document.querySelectorAll("[data-all-products-link]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      resetToAllProducts(true);
    });
  });

  document.getElementById("searchInput")?.addEventListener("focus", () => {
    renderSearchSuggestions(true);
  });

  document.getElementById("searchInput")?.addEventListener("input", event => {
    applySearchValue(event.target.value);
  });

  document.getElementById("searchInput")?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      renderProducts();
      hideSearchSuggestions();
    }
  });

  document.getElementById("searchSuggestions")?.addEventListener("click", event => {
    const button = event.target.closest("[data-product-id]");
    if (!button) return;
    const product = PRODUCTS.find(entry => entry.id === button.dataset.productId);
    if (!product) return;
    applySearchValue(product.name);
    hideSearchSuggestions();
  });

  document.getElementById("resetFilters")?.addEventListener("click", resetCatalogFilters);
  document.getElementById("resetPriceRange")?.addEventListener("click", () => {
    resetPriceRangeToDefault();
    syncPriceInputs();
    renderProducts();
  });

  document.querySelectorAll(".view-btn").forEach(button => {
    button.addEventListener("click", () => {
      catalogState.view = button.dataset.view;
      syncToolbarState();
      renderProducts();
    });
  });

  document.getElementById("scrollTopBtn")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.addEventListener("click", event => {
    const dropdown = document.getElementById("categoriesDropdown");
    if (dropdown && !dropdown.contains(event.target)) {
      toggleCategoryMenu(false);
    }

    const searchWrap = document.querySelector(".search-wrap");
    if (searchWrap && !searchWrap.contains(event.target)) {
      hideSearchSuggestions();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeDrawer();
      closeMenus();
      hideSearchSuggestions();
    }
  });

  window.addEventListener("scroll", updateScrollTopButton, { passive: true });
  updateScrollTopButton();
});



function formatOrderMoney(amount) {
  return typeof formatPrice === "function" ? formatPrice(amount) : `\u20B9${Number(amount || 0).toFixed(2)}`;
}

function renderInvoiceCard(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const paymentLabel = order.paymentMethodLabel || "Saved Order";
  const subtotal = Number(order.sub || 0);
  const tax = Number(order.tax || 0);
  const total = Number(order.total || 0);
  const taxRate = subtotal > 0 ? Math.round((tax / subtotal) * 100) : 0;
  const shipTo = `${order.customer?.address || ""} ${order.customer?.city || ""} ${order.customer?.zip || ""}`.trim();

  return `
    <div class="invoice-sheet">
      <div class="invoice-sheet-head">
        <div class="invoice-brand-block">
          <span class="invoice-logo-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/></svg>
          </span>
          <div>
            <p class="invoice-brand">Shopcart</p>
            <p class="invoice-meta">shopcart.com | support@shopcart.com</p>
          </div>
        </div>
        <div class="invoice-order-meta">
          <p class="invoice-label">Invoice</p>
          <p class="invoice-order-id">${order.orderId || "Order"}</p>
          <p>${order.date || "Date unavailable"}</p>
        </div>
      </div>
      <div class="invoice-sections">
        <div class="invoice-panel invoice-contact-panel">
          <div>
            <p class="invoice-label">Billed To</p>
            <div class="invoice-customer">
              <p class="invoice-customer-name">${order.customer?.fullName || "Customer"}</p>
              <p>${order.customer?.email || ""}</p>
              <p>${order.customer?.phone || ""}</p>
            </div>
          </div>
          <div class="invoice-ship-block">
            <p class="invoice-label">Ship To</p>
            <div class="invoice-ship">
              <p>${shipTo || "Address unavailable"}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="invoice-items">
        <div class="invoice-items-head">
          <span>Item</span>
          <span>Qty</span>
          <span>Price</span>
          <span>Total</span>
        </div>
        ${items.map(item => `
          <div class="invoice-row invoice-item-row">
            <span>${item.name}</span>
            <span>x${item.qty}</span>
            <span>${formatOrderMoney(item.price)}</span>
            <span>${formatOrderMoney(item.price * item.qty)}</span>
          </div>
        `).join("")}
      </div>
      <div class="invoice-summary">
        <div class="invoice-row"><span>Payment</span><span>${paymentLabel}</span></div>
        <div class="invoice-row"><span>Subtotal</span><span>${formatOrderMoney(subtotal)}</span></div>
        <div class="invoice-row"><span>Tax (${taxRate}%)</span><span>${formatOrderMoney(tax)}</span></div>
        <div class="invoice-row"><span>Shipping</span><span class="invoice-free">Free</span></div>
        <div class="invoice-row total"><span>Total Paid</span><span>${formatOrderMoney(total)}</span></div>
      </div>
      <div class="invoice-foot">
        <p>Thank you for shopping with Shopcart. Keep this invoice for your records.</p>
      </div>
    </div>
  `;
}

async function downloadInvoice(order) {
  const capture = document.getElementById("invoiceCapture");
  if (!capture || !window.htmlToImage) {
    showToast("Invoice download is not available");
    return;
  }


  capture.innerHTML = renderInvoiceCard(order);

  try {
    const dataUrl = await window.htmlToImage.toPng(capture.firstElementChild, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
    });
    const anchor = document.createElement("a");
    anchor.download = `Shopcart-Invoice-${order.orderId || "order"}.png`;
    anchor.href = dataUrl;
    anchor.click();
    showToast("Invoice downloaded");
  } catch (error) {
    console.error(error);
    showToast("Could not generate invoice");
  }
}
