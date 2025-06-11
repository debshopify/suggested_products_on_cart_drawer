# Shopify suggested products on cart drawer

This suggested product on cart drawer is designed for shopify Dawn theme.
But it can be used for any theme on SHopify.

Please make sure that your cart drawer id is named as "CartDrawer".
If it is not then change your cart drawer id on suggested-products.js

Product fetching logic is one of the following:

i. Products from the same collection as the first item in the cart.
ii. Products with matching tags.
iii. Store-wide bestsellers (fallback).

Extract all the file and uploads on your shopify theme except cart-drawer.liquid
Add only the part of the cart-drawer file mentioned below


<!-- Add these css and js links on your cart-drawer liquid file -->
<!-- links Start -->
{{ 'suggested-products.css' | asset_url | stylesheet_tag }}
{{ 'swiper-bundle.min.css' | asset_url | stylesheet_tag }}
<script src="{{ 'suggested-products.js' | asset_url }}" defer="defer"></script>
<script src="{{ 'swiper-bundle.min.js' | asset_url }}" defer="defer"></script>
<!-- links end -->

<!-- Add this block before cart drawer subtotal or before cart-drawer-footer   -->

<div id="related-products" class="related-products-section" style="padding: 20px;">
    <div class="swiper related-swiper">
      <div class="swiper-wrapper" id="related-products-list">
        <!-- JS will inject product slides here -->
      </div>
        <!-- dot buttons go here -->
      <div class="swiper-pagination"></div>
    </div>
</div>
