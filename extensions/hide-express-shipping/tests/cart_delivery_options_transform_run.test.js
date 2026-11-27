import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { cartDeliveryOptionsTransformRun } from '../src/index.js';

// Fixtures use the payload format of the fixtures in Shopify's function templates.
const fixturesDir = path.join(import.meta.dirname, 'fixtures');
const fixtures = fs.readdirSync(fixturesDir).filter((file) => file.endsWith('.json'));

describe('cart.delivery-options.transform.run', () => {
  test.each(fixtures)('%s', (file) => {
    const { payload } = JSON.parse(fs.readFileSync(path.join(fixturesDir, file), 'utf8'));
    expect(payload.target).toBe('cart.delivery-options.transform.run');
    expect(cartDeliveryOptionsTransformRun(payload.input)).toEqual(payload.output);
  });
});
