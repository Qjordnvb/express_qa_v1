// tests/search-add-to-cart.spec.ts
import { test, expect, Page } from '@playwright/test';
import { HeaderPage } from '../pages/HeaderPage';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
// No necesitaremos CartPage si vamos directo al checkout desde el toast,
// pero la dejamos por si queremos añadir un test que sí vaya a la página del carrito.
// import { CartPage } from '../pages/CartPage';

test.describe('Search, Filter, Add to Cart, and Direct Checkout Flow', () => {

  test('should allow searching, filtering, adding to cart, and proceeding to checkout from toast', async ({ page }: { page: Page }) => {
    const searchTerm = 'MacBook';
    const productToSelect = 'MacBook Air'; // Asegúrate que este producto esté disponible después del filtro

    const headerPage = new HeaderPage(page);
    const searchResultsPage = new SearchResultsPage(page);
    const productDetailPage = new ProductDetailPage(page);
    // const cartPage = new CartPage(page); // No la usamos en este flujo exacto

    // 1. Ir a la página principal
    await page.goto('/');
    console.log('Navegado a la página principal.');

    // 2. Buscar el producto
    await headerPage.searchProduct(searchTerm);
    await expect(page).toHaveURL(new RegExp(`search=${searchTerm}`));
    console.log(`Búsqueda de '${searchTerm}' completada.`);

    // 3. Aplicar filtro "In Stock"
    await searchResultsPage.applyInStockFilter();

    // 4. Seleccionar el producto "MacBook Air" de los resultados
    await searchResultsPage.selectProductByName(productToSelect);
    await expect(page).toHaveURL(new RegExp(`product/product&product_id=`));
    console.log(`Producto '${productToSelect}' seleccionado desde los resultados.`);

    // 5. En la página de detalle del producto, verificar título y añadir al carrito
    await productDetailPage.verifyProductTitle(productToSelect);

    await productDetailPage.clickAddToCart(); // Esto ahora espera el toast
    await productDetailPage.verifySuccessToastContainsProduct(productToSelect);

    // 6. IR AL CHECKOUT DESDE EL TOAST DE NOTIFICACIÓN
    await productDetailPage.clickCheckoutButtonInToast(); // <--- NUEVO MÉTODO EN USO

    // 7. Verificar que llegamos a la página de Checkout
    await expect(page).toHaveURL(new RegExp('route=checkout/checkout'));
    // El título de la página de checkout es también un <h1>

    console.log('Navegado a la página de Checkout. ¡Flujo completado!');

    // Opcional: Pausa final para inspección manual
    // await page.waitForTimeout(3000);
  });
});
