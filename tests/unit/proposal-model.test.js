const Proposal = require('../../server/models/Proposal');

describe('Proposal model validation', () => {
  test('requires targetEntityType, proposedChanges, submittedBy, companyId', () => {
    const p = new Proposal({});
    const err = p.validateSync();
    expect(err).toBeTruthy();
    const messages = Object.values(err.errors).map(e => e.path);
    expect(messages).toEqual(expect.arrayContaining(['targetEntityType', 'proposedChanges', 'submittedBy', 'companyId']));
  });

  test('accepts product create proposal with payload', () => {
    const p = new Proposal({
      companyId: '650000000000000000000001',
      targetEntityType: 'product',
      proposedChanges: {
        name: 'Test Product',
        sku: 'TP-001',
        pricing: { costPrice: 10, sellingPrice: 15 },
        inventory: { currentStock: 5, minStock: 1 },
        tax: { rate: 0.18, isInclusive: true },
      },
      submittedBy: '650000000000000000000002',
    });
    const err = p.validateSync();
    expect(err).toBeUndefined();
  });

  test('status defaults to pending', () => {
    const p = new Proposal({
      companyId: '650000000000000000000001',
      targetEntityType: 'product',
      proposedChanges: { name: 'X' },
      submittedBy: '650000000000000000000002',
    });
    expect(p.status).toBe('pending');
  });
});
