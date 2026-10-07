import {
  flattenEditLogsToChangeHistoryRows,
  collectChangeHistoryReferenceIds,
} from './contract-change-history.presentation.util';

describe('contract-change-history.presentation.util', () => {
  it('flattens edit log changedFields into table rows', () => {
    const createdAt = new Date('2026-01-15T10:00:00.000Z');
    const rows = flattenEditLogsToChangeHistoryRows(
      [
        {
          id: 'log-1',
          actorUserId: 'user-1',
          changedFields: [
            {
              field: 'description',
              previousValue: 'Before',
              newValue: 'After',
            },
          ],
          createdAt,
        },
      ],
      new Map([['user-1', 'Alex Admin']]),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      fieldLabel: 'Description',
      fromValue: 'Before',
      toValue: 'After',
      changedBy: 'Alex Admin',
      changedAt: createdAt.toISOString(),
    });
  });

  it('maps clientId UUIDs to client display names', () => {
    const clientId = '11111111-1111-4111-8111-111111111111';
    const rows = flattenEditLogsToChangeHistoryRows(
      [
        {
          id: 'log-2',
          actorUserId: null,
          changedFields: [
            {
              field: 'clientId',
              previousValue: null,
              newValue: clientId,
            },
          ],
          createdAt: new Date('2026-01-16T00:00:00.000Z'),
        },
      ],
      new Map(),
      {
        clientNamesById: new Map([[clientId, 'Acme Fleet Ltd']]),
        vehicleLabelsById: new Map(),
      },
    );

    expect(rows[0]?.fromValue).toBe('—');
    expect(rows[0]?.toValue).toBe('Acme Fleet Ltd');
    expect(rows[0]?.toValue).not.toBe(clientId);
  });

  it('collectChangeHistoryReferenceIds gathers client and vehicle ids', () => {
    const clientId = '22222222-2222-4222-8222-222222222222';
    const vehicleId = '33333333-3333-4333-8333-333333333333';
    const ids = collectChangeHistoryReferenceIds([
      {
        changedFields: [
          {
            field: 'clientId',
            previousValue: null,
            newValue: clientId,
          },
          {
            field: 'vehicleIds',
            previousValue: [],
            newValue: [vehicleId],
          },
        ],
      },
    ]);

    expect(ids.clientIds).toEqual([clientId]);
    expect(ids.vehicleIds).toEqual([vehicleId]);
  });

  it('formats billing frequency and security deposit for display', () => {
    const rows = flattenEditLogsToChangeHistoryRows(
      [
        {
          id: 'log-3',
          actorUserId: null,
          changedFields: [
            {
              field: 'billingFrequency',
              previousValue: 'monthly',
              newValue: 'quarterly',
            },
            {
              field: 'securityDeposit',
              previousValue: '1000.00',
              newValue: '2500.50',
            },
          ],
          createdAt: new Date('2026-01-17T00:00:00.000Z'),
        },
      ],
      new Map(),
    );

    expect(rows[0]?.fromValue).toBe('Monthly');
    expect(rows[0]?.toValue).toBe('Quarterly');
    expect(rows[1]?.fromValue).toBe('Rs. 1,000');
    expect(rows[1]?.toValue).toBe('Rs. 2,500.5');
  });
});
