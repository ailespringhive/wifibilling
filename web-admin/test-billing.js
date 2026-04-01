import { BillingService } from './src/services/billing.service.js';

async function run() {
  try {
    const res = await BillingService.generateMonthlyBilling('2026-04');
    console.log("Success! Results length:", res.length);
  } catch (e) {
    console.error("FAILED! Error:", e);
  }
}

run();
