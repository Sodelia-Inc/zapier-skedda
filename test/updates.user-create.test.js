/* globals describe, it, expect, afterEach */

const zapier = require('zapier-platform-core');
const nock = require('nock');

zapier.tools.env.inject();

const App = require('../index');
const appTester = zapier.createAppTester(App);

describe('user create action', () => {
  const domain = 'testsubdomain.skedda.com';

  afterEach(() => {
    nock.cleanAll();
  });

  describe('validation', () => {
    it('should throw error if email is not provided', async () => {
      const bundle = {
        authData: { domain },
        inputData: {
          firstName: 'John',
          lastName: 'Doe'
        }
      };

      await expect(
        appTester(App.creates['user-create'].operation.perform, bundle)
      ).rejects.toThrow('Email is required');
    });

    it('should throw error if firstName is not provided', async () => {
      const bundle = {
        authData: { domain },
        inputData: {
          email: 'test@example.com',
          lastName: 'Doe'
        }
      };

      await expect(
        appTester(App.creates['user-create'].operation.perform, bundle)
      ).rejects.toThrow('First name and last name are required');
    });

    it('should throw error if lastName is not provided', async () => {
      const bundle = {
        authData: { domain },
        inputData: {
          email: 'test@example.com',
          firstName: 'John'
        }
      };

      await expect(
        appTester(App.creates['user-create'].operation.perform, bundle)
      ).rejects.toThrow('First name and last name are required');
    });

  });

  describe('user profile ping', () => {
    it('should throw error if user already exists', async () => {
      nock(`https://${domain}`)
        .get('/userprofilepings')
        .query({
          email: 'existing@example.com',
          includevenueuserid: true
        })
        .reply(200, {
          userprofileping: {
            contactNumberSet: false,
            venueuserId: '12345',
            userprofileId: 'profile123',
            ssoLoginUrl: null,
            isValidEmail: true,
            id: '00fa720125e94102b6a73f092f7c7a0d'
          }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          email: 'existing@example.com',
          firstName: 'John',
          lastName: 'Doe'
        }
      };

      await expect(
        appTester(App.creates['user-create'].operation.perform, bundle)
      ).rejects.toThrow('User with email existing@example.com already exists');
    });

    it('should throw error if email is invalid', async () => {
      nock(`https://${domain}`)
        .get('/userprofilepings')
        .query({
          email: 'invalid-email',
          includevenueuserid: true
        })
        .reply(200, {
          userprofileping: {
            contactNumberSet: false,
            venueuserId: null,
            userprofileId: null,
            ssoLoginUrl: null,
            isValidEmail: false,
            id: '00fa720125e94102b6a73f092f7c7a0d'
          }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          email: 'invalid-email',
          firstName: 'John',
          lastName: 'Doe'
        }
      };

      await expect(
        appTester(App.creates['user-create'].operation.perform, bundle)
      ).rejects.toThrow('Email invalid-email is not valid');
    });
  });

  describe('creating user', () => {
    const mockVenueSettings = [{
      twoLetterCountryCode: 'CA',
      userContactNumberRequired: true,
      sampleContactNumber: '(506) 234-5678'
    }];

    it('should create a user with minimal fields', async () => {
      nock(`https://${domain}`)
        .get('/userprofilepings')
        .query({
          email: 'newuser@example.com',
          includevenueuserid: true
        })
        .reply(200, {
          userprofileping: {
            contactNumberSet: false,
            venueuserId: null,
            userprofileId: null,
            ssoLoginUrl: null,
            isValidEmail: true,
            id: '00fa720125e94102b6a73f092f7c7a0d'
          }
        });

      nock(`https://${domain}`)
        .get('/webs')
        .reply(200, mockVenueSettings);

      nock(`https://${domain}`)
        .post('/venueusers', body => {
          expect(body.venueuser.username).toBe('newuser@example.com');
          expect(body.venueuser.firstName).toBe('John');
          expect(body.venueuser.lastName).toBe('Doe');
          expect(body.venueuser.termsAgreed).toBe(true);
          expect(body.venueuser.arbitraryerrors).toBe(null);
          expect(body.venueuser.twoLetterCountryCode).toBe('CA');
          expect(body.venueuser.contactNumberRequired).toBe(true);
          expect(body.venueuser.sampleContactNumber).toBe('(506) 234-5678');
          return true;
        })
        .reply(201, {
          venueuser: {
            id: '67890',
            username: 'newuser@example.com',
            firstName: 'John',
            lastName: 'Doe',
            organisation: null,
            contactNumber: null,
            language: null,
            twoLetterCountryCode: 'CA',
            venueusertags: [],
            notes: null,
            createdDate: '2025-10-06T00:00:00Z'
          }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          email: 'newuser@example.com',
          firstName: 'John',
          lastName: 'Doe'
        }
      };

      const result = await appTester(
        App.creates['user-create'].operation.perform,
        bundle
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('67890');
      expect(result.email).toBe('newuser@example.com');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.twoLetterCountryCode).toBe('CA');
      expect(result.success).toBe(true);
    });

    it('should create a user with all fields', async () => {
      nock(`https://${domain}`)
        .get('/userprofilepings')
        .query(true)
        .reply(200, {
          userprofileping: {
            contactNumberSet: false,
            venueuserId: null,
            userprofileId: null,
            ssoLoginUrl: null,
            isValidEmail: true,
            id: '00fa720125e94102b6a73f092f7c7a0d'
          }
        });

      nock(`https://${domain}`)
        .get('/webs')
        .reply(200, mockVenueSettings);

      nock(`https://${domain}`)
        .post('/venueusers', body => {
          expect(body.venueuser.username).toBe('fulluser@example.com');
          expect(body.venueuser.firstName).toBe('Jane');
          expect(body.venueuser.lastName).toBe('Smith');
          expect(body.venueuser.contactNumber).toBe('1234567890');
          expect(body.venueuser.twoLetterCountryCode).toBe('CA'); // From venue settings
          expect(body.venueuser.notes).toBe('Test notes');
          expect(body.venueuser.venueusertags).toEqual(['100', '200']);
          return true;
        })
        .reply(201, {
          venueuser: {
            id: '99999',
            username: 'fulluser@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            organisation: null,
            contactNumber: '1234567890',
            language: null,
            twoLetterCountryCode: 'CA',
            venueusertags: ['100', '200'],
            notes: 'Test notes',
            createdDate: '2025-10-06T00:00:00Z'
          }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          email: 'fulluser@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          contactNumber: '1234567890',
          notes: 'Test notes',
          tagId: ['100', '200']
        }
      };

      const result = await appTester(
        App.creates['user-create'].operation.perform,
        bundle
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('99999');
      expect(result.email).toBe('fulluser@example.com');
      expect(result.contactNumber).toBe('1234567890');
      expect(result.twoLetterCountryCode).toBe('CA');
      expect(result.tags).toEqual(['100', '200']);
      expect(result.notes).toBe('Test notes');
      expect(result.success).toBe(true);
    });

    it('should handle single tag ID', async () => {
      nock(`https://${domain}`)
        .get('/userprofilepings')
        .query(true)
        .reply(200, {
          userprofileping: {
            contactNumberSet: false,
            venueuserId: null,
            userprofileId: null,
            ssoLoginUrl: null,
            isValidEmail: true,
            id: '00fa720125e94102b6a73f092f7c7a0d'
          }
        });

      nock(`https://${domain}`)
        .get('/webs')
        .reply(200, mockVenueSettings);

      nock(`https://${domain}`)
        .post('/venueusers', body => {
          expect(body.venueuser.venueusertags).toEqual(['300']);
          return true;
        })
        .reply(201, {
          venueuser: {
            id: '88888',
            username: 'tagged@example.com',
            firstName: 'Tagged',
            lastName: 'User',
            venueusertags: ['300'],
            createdDate: '2025-10-06T00:00:00Z'
          }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          email: 'tagged@example.com',
          firstName: 'Tagged',
          lastName: 'User',
          tagId: '300' // Single tag, not array
        }
      };

      const result = await appTester(
        App.creates['user-create'].operation.perform,
        bundle
      );

      expect(result.tags).toEqual(['300']);
    });
  });

  // describe('error handling', () => {
  //   const mockVenueSettings = [{
  //     twoLetterCountryCode: 'CA',
  //     userContactNumberRequired: true,
  //     sampleContactNumber: '(506) 234-5678'
  //   }];

  //   it('should handle API errors gracefully', async () => {
  //     nock(`https://${domain}`)
  //       .get('/userprofilepings')
  //       .query(true)
  //       .reply(200, {
  //         userprofileping: {
  //           contactNumberSet: false,
  //           venueuserId: null,
  //           userprofileId: null,
  //           ssoLoginUrl: null,
  //           isValidEmail: true,
  //           id: '00fa720125e94102b6a73f092f7c7a0d'
  //         }
  //       });

  //     nock(`https://${domain}`)
  //       .get('/webs')
  //       .reply(200, mockVenueSettings);

  //     nock(`https://${domain}`)
  //       .post('/venueusers')
  //       .reply(500, { error: 'Internal server error' });

  //     const bundle = {
  //       authData: { domain },
  //       inputData: {
  //         email: 'error@example.com',
  //         firstName: 'Error',
  //         lastName: 'User'
  //       }
  //     };

  //     await expect(
  //       appTester(App.creates['user-create'].operation.perform, bundle)
  //     ).rejects.toThrow('Failed to create user (status 500)');
  //   });
  // });

  describe('real authentication test', () => {
    it('should create a user with real authentication', async () => {
      // Skip this test if credentials are not available
      if (!process.env.TEST_USERNAME || !process.env.TEST_PASSWORD || !process.env.TEST_DOMAIN || !process.env.TEST_NEW_USER_EMAIL) {
        console.log('Skipping real auth test - credentials or TEST_NEW_USER_EMAIL not provided in environment');
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

      // Create a new user
      const createBundle = {
        authData: {
          domain: authResult.domain,
          headers: authResult.headers
        },
        inputData: {
          email: process.env.TEST_NEW_USER_EMAIL,
          firstName: 'Test',
          lastName: 'User',
          notes: `Created by test at ${new Date().toISOString()}`
        }
      };

      const result = await appTester(
        App.creates['user-create'].operation.perform,
        createBundle
      );

      expect(result).toBeDefined();
      expect(result.email).toBe(process.env.TEST_NEW_USER_EMAIL);
      expect(result.firstName).toBe('Test');
      expect(result.lastName).toBe('User');
      expect(result.id).toBeDefined();
      expect(result.success).toBe(true);

      console.log('User created successfully with ID:', result.id);
    });
  });
});
