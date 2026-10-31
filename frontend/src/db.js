import Dexie from 'dexie';

export const db = new Dexie('WifiPayDB');

db.version(1).stores({
  customers: 'id, name, status',
  syncQueue: '++id, customer_id, payment_date, for_month, amount, proof_image' // Payments waiting to sync
});
