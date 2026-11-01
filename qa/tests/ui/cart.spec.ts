import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { ProductsPage } from '../../pages/ProductsPage';

test.describe('Cart functionality', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
  });

  test('add one product to cart shows badge with count 1', async ({ page }) => {
    const productsPage = new ProductsPage(page);

    await expect(productsPage.cartBadge).toHaveCount(0);
    await productsPage.addProductToCart('add-to-cart-sauce-labs-backpack');

    await expect(productsPage.cartBadge).toBeVisible();
    await expect(productsPage.cartBadge).toHaveText('1');
  });

  test('remove product from cart makes badge disappear', async ({ page }) => {
    const productsPage = new ProductsPage(page);

    await productsPage.addProductToCart('add-to-cart-sauce-labs-backpack');
    await expect(productsPage.cartBadge).toHaveText('1');

    await productsPage.removeProductFromCart('remove-sauce-labs-backpack');
    await expect(productsPage.cartBadge).toHaveCount(0);
  });
});

