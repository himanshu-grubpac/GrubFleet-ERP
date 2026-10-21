import { ConflictException } from '@nestjs/common';
import type { OrganisationClientPocDto } from '../dto/client-poc.dto';
import {
  ORG_CLIENT_POC_EMAIL_DUPLICATE_MESSAGE,
  ORG_CLIENT_POC_PHONE_DUPLICATE_MESSAGE,
  ORG_DRIVER_EMAIL_DUPLICATE_MESSAGE,
  ORG_DRIVER_PHONE_DUPLICATE_MESSAGE,
  ORG_EMPLOYEE_EMAIL_DUPLICATE_MESSAGE,
  ORG_EMPLOYEE_PHONE_DUPLICATE_MESSAGE,
  ORG_LOCATION_SITE_EMAIL_DUPLICATE_MESSAGE,
  ORG_LOCATION_SITE_PHONE_DUPLICATE_MESSAGE,
  ORG_SUPPLIER_EMAIL_DUPLICATE_MESSAGE,
  ORG_SUPPLIER_PHONE_DUPLICATE_MESSAGE,
} from '../constants/org-contact-uniqueness.constants';
import type { OrganisationRepository } from '../repositories/organisation.repository';
import {
  normalizeOrgContactEmail,
  normalizeOrgContactPhone,
} from './org-contact-normalize.util';

function throwIfDuplicate(existingId: string | null, message: string): void {
  if (existingId) {
    throw new ConflictException(message);
  }
}

export async function assertEmployeeContactUniqueInOrg(
  repo: OrganisationRepository,
  organizationId: string,
  params: {
    email?: string;
    phone?: string;
    excludeEmployeeId?: string;
  },
): Promise<void> {
  if (params.email) {
    const email = normalizeOrgContactEmail(params.email);
    const existingId = await repo.findEmployeeIdByCompanyEmailInOrg(
      organizationId,
      email,
      params.excludeEmployeeId,
    );
    throwIfDuplicate(existingId, ORG_EMPLOYEE_EMAIL_DUPLICATE_MESSAGE);
  }
  if (params.phone) {
    const phone = normalizeOrgContactPhone(params.phone);
    const existingId = await repo.findEmployeeIdByMobileInOrg(
      organizationId,
      phone,
      params.excludeEmployeeId,
    );
    throwIfDuplicate(existingId, ORG_EMPLOYEE_PHONE_DUPLICATE_MESSAGE);
  }
}

export async function assertSupplierContactUniqueInOrg(
  repo: OrganisationRepository,
  organizationId: string,
  params: {
    contactEmail?: string;
    contactPhone?: string;
    excludeSupplierId?: string;
  },
): Promise<void> {
  if (params.contactEmail) {
    const email = normalizeOrgContactEmail(params.contactEmail);
    const existingId = await repo.findSupplierIdByContactEmailInOrg(
      organizationId,
      email,
      params.excludeSupplierId,
    );
    throwIfDuplicate(existingId, ORG_SUPPLIER_EMAIL_DUPLICATE_MESSAGE);
  }
  if (params.contactPhone) {
    const phone = normalizeOrgContactPhone(params.contactPhone);
    const existingId = await repo.findSupplierIdByContactPhoneInOrg(
      organizationId,
      phone,
      params.excludeSupplierId,
    );
    throwIfDuplicate(existingId, ORG_SUPPLIER_PHONE_DUPLICATE_MESSAGE);
  }
}

export async function assertDriverContactUniqueInOrg(
  repo: OrganisationRepository,
  organizationId: string,
  params: {
    email?: string;
    phone?: string;
    excludeDriverId?: string;
  },
): Promise<void> {
  if (params.email) {
    const email = normalizeOrgContactEmail(params.email);
    const existingId = await repo.findDriverIdByEmailInOrg(
      organizationId,
      email,
      params.excludeDriverId,
    );
    throwIfDuplicate(existingId, ORG_DRIVER_EMAIL_DUPLICATE_MESSAGE);
  }
  if (params.phone) {
    const phone = normalizeOrgContactPhone(params.phone);
    const existingId = await repo.findDriverIdByPhoneInOrg(
      organizationId,
      phone,
      params.excludeDriverId,
    );
    throwIfDuplicate(existingId, ORG_DRIVER_PHONE_DUPLICATE_MESSAGE);
  }
}

export async function assertLocationSiteContactUniqueInOrg(
  repo: OrganisationRepository,
  organizationId: string,
  params: {
    siteContactEmail?: string | null;
    siteContactPhone?: string | null;
    excludeLocationId?: string;
  },
): Promise<void> {
  const email = params.siteContactEmail?.trim();
  if (email) {
    const normalized = normalizeOrgContactEmail(email);
    const existingId = await repo.findLocationIdBySiteContactEmailInOrg(
      organizationId,
      normalized,
      params.excludeLocationId,
    );
    throwIfDuplicate(existingId, ORG_LOCATION_SITE_EMAIL_DUPLICATE_MESSAGE);
  }
  const phone = params.siteContactPhone?.trim();
  if (phone) {
    const normalized = normalizeOrgContactPhone(phone);
    const existingId = await repo.findLocationIdBySiteContactPhoneInOrg(
      organizationId,
      normalized,
      params.excludeLocationId,
    );
    throwIfDuplicate(existingId, ORG_LOCATION_SITE_PHONE_DUPLICATE_MESSAGE);
  }
}

function assertNoDuplicatePocsInPayload(
  pocs: OrganisationClientPocDto[],
): void {
  const emails = new Set<string>();
  const phones = new Set<string>();
  for (const poc of pocs) {
    const email = normalizeOrgContactEmail(poc.email);
    if (emails.has(email)) {
      throw new ConflictException(ORG_CLIENT_POC_EMAIL_DUPLICATE_MESSAGE);
    }
    emails.add(email);
    const phone = normalizeOrgContactPhone(poc.contactNumber);
    if (phones.has(phone)) {
      throw new ConflictException(ORG_CLIENT_POC_PHONE_DUPLICATE_MESSAGE);
    }
    phones.add(phone);
  }
}

export async function assertClientPocsContactUniqueInOrg(
  repo: OrganisationRepository,
  organizationId: string,
  pocs: OrganisationClientPocDto[],
  excludeClientId?: string,
): Promise<void> {
  assertNoDuplicatePocsInPayload(pocs);
  for (const poc of pocs) {
    const email = normalizeOrgContactEmail(poc.email);
    const emailConflict = await repo.findOrganisationClientIdByPocEmailInOrg(
      organizationId,
      email,
      excludeClientId,
    );
    throwIfDuplicate(emailConflict, ORG_CLIENT_POC_EMAIL_DUPLICATE_MESSAGE);

    const phone = normalizeOrgContactPhone(poc.contactNumber);
    const phoneConflict = await repo.findOrganisationClientIdByPocPhoneInOrg(
      organizationId,
      phone,
      excludeClientId,
    );
    throwIfDuplicate(phoneConflict, ORG_CLIENT_POC_PHONE_DUPLICATE_MESSAGE);
  }
}
