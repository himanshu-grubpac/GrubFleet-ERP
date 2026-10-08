import { randomUUID } from 'crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

export type DraftLeaseContractResponse = {
  id: string;
  contractNumber: string;
  rawStatus: string;
};

export type CreateDraftLeaseContractOptions = {
  organizationId: string;
  token: string;
  /** Omit for wizard entry without client; never send empty string. */
  clientId?: string;
  /** When true and clientId omitted, creates a fleet client first. */
  ensureClient?: boolean;
  clientLabel?: string;
};

export async function createFleetClientForIntegrationTest(
  app: INestApplication<App>,
  organizationId: string,
  token: string,
  label: string,
): Promise<string> {
  const suffix = `${label}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const clientRes = await request(app.getHttpServer())
    .post('/api/v1/fleet-leasing/clients')
    .set('Authorization', `Bearer ${token}`)
    .set('x-organization-id', organizationId)
    .send({
      organizationId,
      companyName: `${label} ${suffix}`,
      pointsOfContact: [
        {
          name: `${label} POC`,
          contactNumber: '+919999999996',
          email: `${label.toLowerCase().replace(/\s+/g, '-')}-${suffix}@example.com`,
          isPrimary: true,
        },
      ],
    })
    .expect((res) => expect([200, 201]).toContain(res.status));
  return (clientRes.body as { id: string }).id;
}

export async function createDraftLeaseContract(
  app: INestApplication<App>,
  options: CreateDraftLeaseContractOptions,
): Promise<DraftLeaseContractResponse> {
  let clientId = options.clientId;
  if (!clientId && options.ensureClient) {
    clientId = await createFleetClientForIntegrationTest(
      app,
      options.organizationId,
      options.token,
      options.clientLabel ?? 'Draft lease client',
    );
  }

  const body: { organizationId: string; clientId?: string } = {
    organizationId: options.organizationId,
  };
  if (clientId) {
    body.clientId = clientId;
  }

  const res = await request(app.getHttpServer())
    .post('/api/v1/fleet-leasing/lease-contracts')
    .set('Authorization', `Bearer ${options.token}`)
    .set('x-organization-id', options.organizationId)
    .send(body);

  if (![200, 201].includes(res.status)) {
    throw new Error(
      `createDraftLeaseContract failed ${res.status}: ${JSON.stringify(res.body)}`,
    );
  }

  return res.body as DraftLeaseContractResponse;
}
