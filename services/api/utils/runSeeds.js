const seedPricingConfig = require('../scripts/seedPricingConfig');
const seedMatchingConfig = require('../scripts/seedMatchingConfig');
const seedAdmin = require('../scripts/seedAdmin');

const SEEDS = [
  ['pricingConfig', seedPricingConfig],
  ['matchingConfig', seedMatchingConfig],
  ['admin', seedAdmin],
];

async function runSeeds() {
  for (const [name, fn] of SEEDS) {
    try {
      await fn();
    } catch (err) {
      // one seed failing must not block boot or the others
      console.error(`[seed] ${name} failed:`, err);
    }
  }
}

module.exports = runSeeds;