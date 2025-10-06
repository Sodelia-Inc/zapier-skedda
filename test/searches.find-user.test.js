/* globals describe, it, expect, beforeEach, afterEach */

const zapier = require('zapier-platform-core');
const nock = require('nock');

zapier.tools.env.inject();

const App = require('../index');
const appTester = zapier.createAppTester(App);

describe('find user search', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('should find a user by email', async () => {
    const testEmail = 'test@example.com';
    const mockResponse = {
      venueusers: [
        {
          id: '12345',
          username: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          organisation: 'Test Org',
          contactNumber: '1234567890',
          venueusertags: ['125974'],
          createdDate: '2025-06-18T13:29:10Z'
        },
        {
          id: '67890',
          username: 'other@example.com',
          firstName: 'Other',
          lastName: 'User'
        }
      ]
    };

    nock('https://testsubdomain.skedda.com')
      .get('/venueuserslists')
      .query({
        fromInclusive: 0,
        s: testEmail,
        sortDirection: 0,
        sortProperty: 1,
        toExclusive: 50,
        totalMatches: 0
      })
      .reply(200, mockResponse);

    const bundle = {
      authData: {
        domain: 'testsubdomain.skedda.com'
      },
      inputData: {
        email: testEmail
      }
    };

    const result = await appTester(
      App.searches.find_user.operation.perform,
      bundle
    );

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('12345');
    expect(result[0].username).toBe(testEmail);
    expect(result[0].firstName).toBe('Test');
  });

  it('should return empty array when user not found', async () => {
    const testEmail = 'notfound@example.com';
    const mockResponse = {
      venueusers: []
    };

    nock('https://testsubdomain.skedda.com')
      .get('/venueuserslists')
      .query({
        fromInclusive: 0,
        s: testEmail,
        sortDirection: 0,
        sortProperty: 1,
        toExclusive: 50,
        totalMatches: 0
      })
      .reply(200, mockResponse);

    const bundle = {
      authData: {
        domain: 'testsubdomain.skedda.com'
      },
      inputData: {
        email: testEmail
      }
    };

    const result = await appTester(
      App.searches.find_user.operation.perform,
      bundle
    );

    expect(result).toBeDefined();
    expect(result.length).toBe(0);
  });

  it('should return empty array when email does not match exactly', async () => {
    const testEmail = 'test@example.com';
    const mockResponse = {
      venueusers: [
        {
          id: '67890',
          username: 'different@example.com',
          firstName: 'Different',
          lastName: 'User'
        }
      ]
    };

    nock('https://testsubdomain.skedda.com')
      .get('/venueuserslists')
      .query({
        fromInclusive: 0,
        s: testEmail,
        sortDirection: 0,
        sortProperty: 1,
        toExclusive: 50,
        totalMatches: 0
      })
      .reply(200, mockResponse);

    const bundle = {
      authData: {
        domain: 'testsubdomain.skedda.com'
      },
      inputData: {
        email: testEmail
      }
    };

    const result = await appTester(
      App.searches.find_user.operation.perform,
      bundle
    );

    expect(result).toBeDefined();
    expect(result.length).toBe(0);
  });

  it('should handle case-insensitive email matching', async () => {
    const testEmail = 'Test@Example.com';
    const mockResponse = {
      venueusers: [
        {
          id: '12345',
          username: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        }
      ]
    };

    nock('https://testsubdomain.skedda.com')
      .get('/venueuserslists')
      .query({
        fromInclusive: 0,
        s: testEmail,
        sortDirection: 0,
        sortProperty: 1,
        toExclusive: 50,
        totalMatches: 0
      })
      .reply(200, mockResponse);

    const bundle = {
      authData: {
        domain: 'testsubdomain.skedda.com'
      },
      inputData: {
        email: testEmail
      }
    };

    const result = await appTester(
      App.searches.find_user.operation.perform,
      bundle
    );

    expect(result).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].username).toBe('test@example.com');
  });

  it('should throw error when email is not provided', async () => {
    const bundle = {
      authData: {
        domain: 'testsubdomain.skedda.com'
      },
      inputData: {}
    };

    await expect(
      appTester(App.searches.find_user.operation.perform, bundle)
    ).rejects.toThrow('Email is required');
  });

  it('should find a user with real authentication', async () => {
    // Skip this test if credentials are not available
    if (!process.env.TEST_USERNAME || !process.env.TEST_PASSWORD || !process.env.TEST_DOMAIN || !process.env.TEST_EMAIL) {
      console.log('Skipping real auth test - credentials not provided in environment');
      return;
    }

    // First, authenticate
    const authBundle = {
      authData: {
        username: process.env.TEST_USERNAME,
        password: process.env.TEST_PASSWORD,
        domain: process.env.TEST_DOMAIN
      }
    };

    const authResult = await appTester(
      App.authentication.sessionConfig.perform,
      authBundle
    );

    expect(authResult.domain).toBeDefined();
    expect(authResult.headers).toBeDefined();

    // Now perform the search with authenticated credentials
    const searchBundle = {
      authData: {
        domain: authResult.domain,
        headers: authResult.headers
      },
      inputData: {
        email: process.env.TEST_EMAIL
      }
    };

    const result = await appTester(
      App.searches.find_user.operation.perform,
      searchBundle
    );

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);

    if (result.length > 0) {
      expect(result[0].username).toBe(process.env.TEST_EMAIL.toLowerCase());
      expect(result[0].id).toBeDefined();
    }
  });
});
