  let hasFetched = false;

  if (typeof Shopify === 'undefined') var Shopify = {};
    Shopify.formatMoney = Shopify.formatMoney || function(cents, format) {
    let value = (cents / 100).toFixed(2);
    return `$${value}`; // Replace with your desired currency format
  };

  document.addEventListener('DOMContentLoaded', () => {
    const cartDrawerElement = document.querySelector('cart-drawer');

    if (!cartDrawerElement) {
      console.error('<cart-drawer> not found');
      return;
    }

    // Observer to detect when the drawer becomes visible
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        const classList = mutation.target.classList;

        // Drawer is open when it has 'active' and not 'is-closing'
        const isOpen = classList.contains('active') && !classList.contains('is-closing');

        if (mutation.attributeName === 'class' && isOpen) {
          if (!hasFetched) {
            console.log('Cart drawer opened, fetching related products...');
            fetchCartItems();
            hasFetched = true;
          }
        }

        // Reset flag when drawer is closed
        if (mutation.attributeName === 'class' && !isOpen) {
          hasFetched = false;
        }
      });
    });

    observer.observe(cartDrawerElement, { attributes: true });
  });


  // Open/Close Cart Drawer
  function openCartDrawer() {
    document.getElementById('CartDrawer').classList.remove('hidden');
    fetchCartItems();
  }

  // Format Money
  if (typeof Shopify === 'undefined') var Shopify = {};
  Shopify.formatMoney = Shopify.formatMoney || function(cents) {
    return '$' + (cents / 100).toFixed(2);
  };

  // Fetch Cart Items and Related Products
  

  function fetchCartItems() {

  fetch('/cart.js')
      .then(response => response.json())
      .then(cart => {
        fetchRelatedProducts(cart.items);
      });
    
  fetch('/?sections=cart-drawer')
    .then(res => res.json())
    .then(data => {
      const parser = new DOMParser();
      const html = parser.parseFromString(data['cart-drawer'], 'text/html');

      const newCartDrawer = html.querySelector('#CartDrawer');
      const currentCartDrawer = document.getElementById('CartDrawer');

      if (newCartDrawer && currentCartDrawer) {
        currentCartDrawer.innerHTML = newCartDrawer.innerHTML;
      }
    })
    .catch(err => {
      console.error('Failed to update cart drawer:', err);
    });
}

  // Fetch Related Products using Product ID
  function fetchRelatedProducts(cartItems) {
    if (!cartItems.length) return;

    const firstItem = cartItems[0];
    const productId = firstItem.product_id;

    // Step 1: Try Shopify's native recommendation API
    fetch(`/recommendations/products.json?product_id=${productId}&limit=4`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.products) && data.products.length > 0) {
          console.log('Using recommendations API');
          insertRelatedProductsHeading();
          renderRelatedProducts(data.products, cartItems);
        } else {
          // Step 2: Try matching by shared tags
          fetch(`/products/${firstItem.handle}.js`)
            .then(res => res.json())
            .then(product => {
              const tags = product.tags;
              if (tags && tags.length > 0) {
                let tryNextTag = function(index) {
                  if (index >= tags.length) return fetchBestSellers(cartItems);
                  const tag = tags[index];
                  console.log('Trying tag:', tag);

                  fetch(`/search/suggest.json?q=tag:${encodeURIComponent(tag)}&resources[type]=product`)
                    .then(res => res.json())
                    .then(result => {
                      const tagProducts = result.resources?.results?.products;
                      if (tagProducts && tagProducts.length > 0) {
                        console.log('Found tag-based matches');
                        insertRelatedProductsHeading();
                        renderRelatedProducts(tagProducts, cartItems);
                      } else {
                        tryNextTag(index + 1);
                      }
                    })
                    .catch(() => tryNextTag(index + 1));
                };

                tryNextTag(0);
              } else {
                fetchBestSellers(cartItems);
              }
            });
        }
      })
      .catch(err => {
        console.warn('Error in recommendations logic, falling back to best sellers:', err);
        fetchBestSellers(cartItems);
      });
  }

  // Fallback: Fetch Best Sellers
  function fetchBestSellers(cartItems) {
    fetch('/collections/all/products.json?sort_by=best-selling&limit=10')
      .then(res => res.json())
      .then(data => {
        console.log('Using best-selling fallback');
        if (data.products?.length > 0) {
          insertRelatedProductsHeading();
          renderRelatedProducts(data.products, cartItems);
        }
      });
  }

  // Render Related Products
  function renderRelatedProducts(products, cartItems) {
    const cartProductIds = cartItems.map(item => item.product_id);
    const wrapper = document.getElementById('related-products-list');

    if (!wrapper) {
      console.error('#related-products-list not found');
      return;
    }

    // Destroy Swiper if already initialized
    if (window.relatedSwiper) {
      window.relatedSwiper.destroy(true, true);
      window.relatedSwiper = null;
    }

    wrapper.innerHTML = '';

    const filteredProducts = products.filter(p => !cartProductIds.includes(p.id));
    if (filteredProducts.length === 0) return;

    filteredProducts.forEach(product => {
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      slide.innerHTML = `
        <div class="related-product">
          <a href="${product.url}">
            <img src="${product.featured_image}" alt="${product.title}">
          </a>
          <p>${product.title.length > 13 ? product.title.slice(0, 13) + '…' : product.title}</p>
          <p>${Shopify.formatMoney(product.price)}</p>
          <button onclick="setupAddToCart(this)" class="add-to-cart-btn" data-variant-id="${product.variants[0].id}">
            Add to cart
          </button>
        </div>
      `;
      wrapper.appendChild(slide);
    });

    setTimeout(() => {
      console.log('Initializing Swiper');
      window.relatedSwiper = new Swiper('.related-swiper', {
        slidesPerView: 2,
        spaceBetween: 16,
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        breakpoints: {
          640: { slidesPerView: 2 },
          768: { slidesPerView: 2 },
          1024: { slidesPerView: 2 },
        },
      });
    }, 50);
  }

  // Setup Add to Cart
  function setupAddToCart(button) {
  if (!button || button.disabled) return;

  let variantId = button.getAttribute('data-variant-id');
  if (!variantId) {
    console.error('Variant ID not found');
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Adding...';

  fetch('/cart.js')
    .then(res => res.json())
    .then(cart => {
      const updates = {};
      let variantFound = false;

      cart.items.forEach(item => {
        if (item.variant_id == variantId) {
          updates[item.key] = item.quantity + 1;
          variantFound = true;
        } else {
          updates[item.key] = item.quantity;
        }
      });

      if (!variantFound) {
        return fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: variantId, quantity: 1 })
        }).then(() => fetch('/cart.js')).then(res => res.json());
      }

      return fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      }).then(res => res.json());
    })
    .catch(error => {
      console.error('Error updating cart:', error);
    })
    .finally(() => {
      button.disabled = false;
      button.textContent = originalText;
      document.querySelector('cart-drawer').close();
      document.querySelector('cart-drawer').open();
    });

    
}

  function insertRelatedProductsHeading() {
  if (document.getElementById('related-products-heading')) return; // prevent duplicates

  const heading = document.createElement('h3');
  heading.id = 'related-products-heading';
  heading.textContent = 'Suggested products';
  heading.style.marginBottom = '15px';

  // Insert before the related products list or anywhere you like
  const target = document.getElementById('related-products-list');
  if (target && target.parentNode) {
    target.parentNode.insertBefore(heading, target);
  }
}


(function() {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const [resource, config] = args;

    // Detect if this is a cart update call
    const isCartUpdate = resource.includes('/cart/change') || resource.includes('/cart/add') || resource.includes('/cart/update');

    const response = await originalFetch.apply(this, args);

    if (isCartUpdate && response.ok) {
      // Delay slightly to ensure cart data has been updated
      response.clone().json().then(data => {
        console.log('Cart updated:', data);
        // You can trigger your own custom event here if needed
        const event = new CustomEvent('cart:updated', { detail: data });
        document.dispatchEvent(event);

        fetch('/cart.js')
        .then(response => response.json())
        .then(cart => {
          fetchRelatedProducts(cart.items);
        });
        
      });
    }

    return response;
  };
})();