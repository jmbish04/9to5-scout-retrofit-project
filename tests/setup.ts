/**
 * Test setup file for Vitest
 *
 * This file sets up global test configurations, mocks, and utilities
 * that are shared across all test files.
 */

import { vi } from "vitest";

// Mock global fetch if not already available
if (!global.fetch) {
  global.fetch = vi.fn();
}

// Mock crypto.subtle for JWT operations
if (!global.crypto) {
  global.crypto = {
    subtle: {
      importKey: vi.fn(),
      sign: vi.fn(),
    },
    randomUUID: vi.fn(
      () => "test-uuid-" + Math.random().toString(36).substr(2, 9)
    ),
  } as any;
}

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Restore console after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global test utilities
export const createMockEnv = (overrides: Partial<any> = {}) => ({
  GCP_PROJECT_ID: "test-project-123",
  GCP_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    project_id: "test-project-123",
    private_key_id: "test-key-id",
    private_key:
      "-----BEGIN PRIVATE KEY-----\nMOCK_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
    client_email: "test@test-project-123.iam.gserviceaccount.com",
    client_id: "123456789",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url:
      "https://www.googleapis.com/robot/v1/metadata/x509/test%40test-project-123.iam.gserviceaccount.com",
  }),
  GCP_TENANT_ID: "test-tenant-123",
  USAGE_TRACKER: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  },
  DB: {},
  ...overrides,
});

export const createMockGoogleJob = (overrides: Partial<any> = {}) => ({
  name: "projects/test-project-123/jobs/job-123",
  title: "Test Job",
  companyDisplayName: "Test Company",
  description: "Test job description",
  addresses: ["Test City, Test State"],
  applicationInfo: {
    uris: ["https://test-company.com/jobs/123"],
  },
  employmentTypes: ["FULL_TIME"],
  ...overrides,
});

export const createMockSearchResponse = (jobs: any[] = []) => ({
  matchingJobs: jobs.map((job) => ({ job })),
  totalSize: jobs.length,
  metadata: { requestId: "test-request-123" },
});

// Mock successful API responses
export const mockSuccessfulResponse = (data: any) => ({
  ok: true,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
});

export const mockErrorResponse = (status: number, message: string) => ({
  ok: false,
  status,
  text: () => Promise.resolve(message),
});

// Test data factories
export const jobTestData = {
  softwareEngineer: {
    name: "projects/test-project-123/jobs/software-engineer-123",
    title: "Software Engineer",
    companyDisplayName: "Google",
    description: "Join our team as a software engineer...",
    addresses: ["Mountain View, CA"],
    applicationInfo: {
      uris: ["https://careers.google.com/jobs/results/123"],
    },
    employmentTypes: ["FULL_TIME"],
    compensationInfo: {
      entries: [
        {
          type: "BASE",
          unit: "YEARLY",
          range: {
            minCompensation: { currencyCode: "USD", units: "120000" },
            maxCompensation: { currencyCode: "USD", units: "180000" },
          },
        },
      ],
    },
  },
  dataScientist: {
    name: "projects/test-project-123/jobs/data-scientist-456",
    title: "Data Scientist",
    companyDisplayName: "Microsoft",
    description: "Looking for a data scientist...",
    addresses: ["Seattle, WA"],
    applicationInfo: {
      uris: ["https://careers.microsoft.com/jobs/456"],
    },
    employmentTypes: ["FULL_TIME"],
  },
  productManager: {
    name: "projects/test-project-123/jobs/product-manager-789",
    title: "Product Manager",
    companyDisplayName: "Apple",
    description: "Lead product development...",
    addresses: ["Cupertino, CA"],
    applicationInfo: {
      uris: ["https://jobs.apple.com/en-us/details/200789"],
    },
    employmentTypes: ["FULL_TIME"],
    compensationInfo: {
      entries: [
        {
          type: "BASE",
          unit: "YEARLY",
          range: {
            minCompensation: { currencyCode: "USD", units: "150000" },
            maxCompensation: { currencyCode: "USD", units: "200000" },
          },
        },
      ],
    },
  },
};
