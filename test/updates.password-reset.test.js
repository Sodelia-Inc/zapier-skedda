/* globals describe, it, expect, afterEach */

const zapier = require('zapier-platform-core');
const nock = require('nock');

zapier.tools.env.inject();

const App = require('../index');
const appTester = zapier.createAppTester(App);

describe('password reset action', () => {
  const domain = 'testsubdomain.skedda.com';

  afterEach(() => {
    nock.cleanAll();
  });

  describe('validation', () => {
    it('should throw error if email is not provided', async () => {
      const bundle = {
        authData: { domain },
        inputData: {}
      };

      await expect(
        appTester(App.creates['password-reset'].operation.perform, bundle)
      ).rejects.toThrow('Email is required');
    });
  });

  describe('sending password reset', () => {
    it('should send password reset email successfully', async () => {
      nock('https://app.skedda.com')
        .post('/loginresetrequests', body => {
          expect(body.loginresetrequest.username).toBe('user@example.com');
          expect(body.loginresetrequest.returnUrl).toBe(`https://${domain}/booking`);
          expect(body.loginresetrequest.product).toBe(null);
          expect(body.loginresetrequest.arbitraryerrors).toBe(null);
          return true;
        })
        .reply(200);

      const bundle = {
        authData: { domain },
        inputData: {
          email: 'user@example.com'
        }
      };

      const result = await appTester(
        App.creates['password-reset'].operation.perform,
        bundle
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.email).toBe('user@example.com');
      expect(result.message).toBe('Password reset email sent successfully');
      expect(result.returnUrl).toBe(`https://${domain}/booking`);
    });

    it('should handle 201 status code', async () => {
      nock('https://app.skedda.com')
        .post('/loginresetrequests')
        .reply(201);

      const bundle = {
        authData: { domain },
        inputData: {
          email: 'user@example.com'
        }
      };

      const result = await appTester(
        App.creates['password-reset'].operation.perform,
        bundle
      );

      expect(result.success).toBe(true);
    });

    it('should handle 204 status code', async () => {
      nock('https://app.skedda.com')
        .post('/loginresetrequests')
        .reply(204);

      const bundle = {
        authData: { domain },
        inputData: {
          email: 'user@example.com'
        }
      };

      const result = await appTester(
        App.creates['password-reset'].operation.perform,
        bundle
      );

      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      nock('https://app.skedda.com')
        .post('/loginresetrequests')
        .reply(500, { error: 'Internal server error' });

      const bundle = {
        authData: { domain },
        inputData: {
          email: 'error@example.com'
        }
      };

      await expect(
        appTester(App.creates['password-reset'].operation.perform, bundle)
      ).rejects.toThrow('Failed to send password reset email (status 500)');
    });

    it('should handle 400 bad request errors', async () => {
      nock('https://app.skedda.com')
        .post('/loginresetrequests')
        .reply(400, { error: 'Invalid email address' });

      const bundle = {
        authData: { domain },
        inputData: {
          email: 'invalid-email'
        }
      };

      await expect(
        appTester(App.creates['password-reset'].operation.perform, bundle)
      ).rejects.toThrow('Failed to send password reset email (status 400)');
    });

    it('should handle 404 not found errors', async () => {
      nock('https://app.skedda.com')
        .post('/loginresetrequests')
        .reply(404, { error: 'User not found' });

      const bundle = {
        authData: { domain },
        inputData: {
          email: 'notfound@example.com'
        }
      };

      await expect(
        appTester(App.creates['password-reset'].operation.perform, bundle)
      ).rejects.toThrow('Failed to send password reset email (status 404)');
    });
  });

  describe('real authentication test', () => {
    it('should send password reset email with real authentication', async () => {
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

      // Send password reset email
      const resetBundle = {
        authData: {
          domain: authResult.domain,
          headers: authResult.headers
        },
        inputData: {
          email: process.env.TEST_EMAIL
        }
      };

      const result = await appTester(
        App.creates['password-reset'].operation.perform,
        resetBundle
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.email).toBe(process.env.TEST_EMAIL);

      console.log('Password reset email sent successfully to:', result.email);
    });
  });
});
