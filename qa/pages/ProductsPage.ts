import { type Locator, type Page } from '@playwright/test';

export class ProductsPage {
  readonly page: Page;
  readonly title: Locator;
  readonly cartBadge: Locator;
  readonly openMenuButton: Locator;
  readonly logoutSidebarLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByTestId('title');
    this.cartBadge = page.getByTestId('shopping-cart-badge');
    this.openMenuButton = page.getByRole('button', { name: 'Open Menu' });
    this.logoutSidebarLink = page.getByTestId('logout-sidebar-link');
  }

  async addProductToCart(itemTestId = 'add-to-cart-sauce-labs-backpack'): Promise<void> {
    await this.page.getByTestId(itemTestId).click();
  }

  async removeProductFromCart(itemTestId = 'remove-sauce-labs-backpack'): Promise<void> {
    await this.page.getByTestId(itemTestId).click();
  }

  async logout(): Promise<void> {
    await this.openMenuButton.click();
    await this.logoutSidebarLink.waitFor({ state: 'visible' });
    await this.logoutSidebarLink.click();
  }
}
