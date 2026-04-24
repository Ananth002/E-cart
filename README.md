# 🛒 Shopcart - Interactive E-Commerce Catalog

Shopcart is a fast, responsive, and data-driven product catalog designed for a smooth shopping experience. It features advanced filtering, a custom price range slider with floating tooltips, a persistent cart system, and an automated invoice generation tool.

## 🚀 Key Features

- **Dynamic JSON Architecture**: Products are decoupled from logic and managed via an external `products.json` file for easy maintenance.
- **Advanced Price Range Slider**: 
  - **Floating Tooltips**: Real-time price bubbles follow the slider thumbs.
  - **Dynamic Track Scaling**: Users can type custom values into input boxes to redefine the entire slider track range.
  - **Precision Control**: Optimized `step="1"` sliding for high-accuracy price selection.
- **Interactive Filtering**: Real-time filtering by category, search keywords, and price range.
- **Persistence Layer**: Favorites and Cart items are persisted using `localStorage`, ensuring data survives page refreshes.
- **Professional Invoice System**: 
  - **Live Preview**: An exact visual replica of the invoice appears on the checkout success screen.
  - **One-Click Download**: Export high-resolution PNG invoices directly from the browser using the `html-to-image` library.
- **Order History**: A dedicated dashboard to track previous purchases and retrieve past invoices.

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (Custom Properties & CSS Grid), Vanilla JavaScript (ES6+).
- **Data Format**: JSON.
- **Libraries**: [html-to-image](https://www.npmjs.com/package/html-to-image) for client-side image generation.

## 📂 Project Structure

```text
├── index.html
├── products.json       # Centralized product database (JSON)
├──style
    ├── main.css          # Design system, animations & slider styling
├──tab
    ├── checkout.html       # Checkout form, order processing & success view
    ├── my-orders.html      # User dashboard for order history
├──js
    ├── script.js           # Core engine (JSON Fetching, Filters, Shared Invoice logic)
    ├── checkout.js         # Form validation & checkout state management
    └── my-orders.js        # History rendering logic
