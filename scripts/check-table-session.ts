import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

import ts from 'typescript';

import type * as TableSessionModule from '../src/lib/tableSession';

const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};
const source = ts.transpileModule(
  fs.readFileSync(new URL('../src/lib/tableSession.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const localStorage = storage();
const tab = () => {
  const context = { exports: {}, window: {}, localStorage, sessionStorage: storage() };
  vm.runInNewContext(source, context);
  return context.exports as typeof TableSessionModule;
};
const adminTab = tab();
localStorage.setItem('access_token', 'existing-admin-login');
assert.equal(adminTab.getTableSessionToken(), null);
adminTab.setTableSessionToken('old-customer');
adminTab.storeCart([
  {
    menu_id: 'menu',
    menu_price_id: 'old-customer-item',
    menu_name: 'Old',
    menu_name_en: 'Old',
    price_type: 'default',
    unit_price: 100,
    quantity: 1,
  },
]);
adminTab.setAdminSessionToken('explicit-admin-entry');
assert.equal(adminTab.getTableSessionToken(), 'explicit-admin-entry');
assert.equal(adminTab.getStoredCart().length, 0);
assert.equal(localStorage.getItem(adminTab.TABLE_SESSION_TOKEN_KEY), null);
adminTab.storeCart([
  {
    menu_id: 'menu',
    menu_price_id: 'admin-item',
    menu_name: 'Admin',
    menu_name_en: 'Admin',
    price_type: 'default',
    unit_price: 100,
    quantity: 1,
  },
]);
assert.equal(adminTab.getStoredCart()[0].menu_price_id, 'admin-item');
const customerTab = tab();
assert.equal(customerTab.getTableSessionToken(), null);
assert.equal(customerTab.getStoredCart().length, 0);
customerTab.setTableSessionToken('new-customer');
customerTab.storeCart([
  {
    menu_id: 'menu',
    menu_price_id: 'customer-item',
    menu_name: 'Customer',
    menu_name_en: 'Customer',
    price_type: 'default',
    unit_price: 100,
    quantity: 1,
  },
]);
assert.equal(adminTab.getStoredCart()[0].menu_price_id, 'admin-item');
assert.equal(customerTab.getStoredCart()[0].menu_price_id, 'customer-item');
const adminCart = adminTab.getStoredCart();
const customerCart = customerTab.getStoredCart();
assert.equal(adminTab.clearCustomerSession('explicit-admin-entry'), true);
assert.equal(adminTab.clearCustomerSession('explicit-admin-entry'), false);
assert.equal(customerTab.getTableSessionToken(), 'new-customer');
assert.equal(customerTab.getStoredCart()[0].menu_price_id, 'customer-item');
adminTab.setAdminSessionToken('reentered-admin');
adminTab.storeCart(adminCart);
assert.equal(adminTab.clearCustomerSession('explicit-admin-entry'), false);
assert.equal(adminTab.getTableSessionToken(), 'reentered-admin');
customerTab.setTableSessionToken('another-customer');
customerTab.storeCart(customerCart);
customerTab.clearCustomerSession('another-customer');
assert.equal(customerTab.getTableSessionToken(), null);
assert.equal(customerTab.getStoredCart().length, 0);
assert.equal(adminTab.getTableSessionToken(), 'reentered-admin');
assert.equal(adminTab.getStoredCart()[0].menu_price_id, 'admin-item');
adminTab.clearCustomerSession();
assert.equal(adminTab.getTableSessionToken(), null);
assert.equal(adminTab.getStoredCart().length, 0);
adminTab.setTableSessionToken('normal-entry');
assert.equal(adminTab.getTableSessionToken(), 'normal-entry');
assert.equal(adminTab.clearCustomerSession('reentered-admin'), false);
assert.equal(adminTab.getTableSessionToken(), 'normal-entry');
adminTab.setAdminSessionToken('second-admin-entry');
assert.equal(adminTab.getStoredCart().length, 0);
adminTab.clearCustomerSession();
assert.equal(adminTab.getTableSessionToken(), null);
assert.equal(adminTab.getStoredCart().length, 0);
localStorage.setItem(adminTab.CART_STORAGE_KEY, '{broken');
assert.equal(adminTab.getStoredCart().length, 0);
console.log('PASS explicit entry, isolated carts and expiry, normal entry, reset, invalid cart');
