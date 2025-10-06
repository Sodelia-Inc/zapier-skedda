/* globals describe, it, expect, beforeEach, afterEach */

const zapier = require('zapier-platform-core');
const nock = require('nock');

zapier.tools.env.inject();

const App = require('../index');
const appTester = zapier.createAppTester(App);

describe('user update action', () => {
  const domain = 'testsubdomain.skedda.com';
  const mockExistingUser = {
    id: '12345',
    username: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    organisation: 'Test Org',
    contactNumber: '1234567890',
    language: 'en',
    twoLetterCountryCode: 'US',
    venueusertags: ['100', '200'],
    notes: 'Original notes',
    createdDate: '2025-01-01T00:00:00Z',
    registerToken: null,
    registerMetadata: null,
    registerPayloadId: null,
    registerPayloadKey: null,
    resetAccessToken: false,
    paymentGatewayCustomerId: null,
    ccVenueToken: null,
    updateCreditCard: false,
    antiForgeryToken: null,
    photo: null,
    createStripeCustomer: false,
    termsAgreed: false,
    removeExternalLogins: false,
    contactNumberE164: null,
    sampleContactNumber: null,
    contactNumberDisplay: null,
    contactNumberRequired: false
  };

  afterEach(() => {
    nock.cleanAll();
  });

  describe('finding user by email', () => {
    it('should find user by exact email match (case-insensitive)', async () => {
      const searchResponse = {
        venueusers: [
          { id: '99999', username: 'other@example.com', firstName: 'Other' },
          { ...mockExistingUser, username: 'test@example.com' },
          { id: '88888', username: 'another@example.com', firstName: 'Another' }
        ]
      };

      nock(`https://${domain}`)
        .get('/venueuserslists')
        .query(true)
        .reply(200, searchResponse);

      nock(`https://${domain}`)
        .put('/venueusers/12345')
        .reply(200, { venueUserPutViewModel: mockExistingUser });

      const bundle = {
        authData: { domain },
        inputData: {
          email: 'Test@Example.com', // Different case
          firstName: 'Jane'
        }
      };

      const result = await appTester(
        App.creates['user-update'].operation.perform,
        bundle
      );

      expect(result.id).toBe('12345');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw error if email not found in search results', async () => {
      const searchResponse = {
        venueusers: [
          { id: '99999', username: 'other@example.com', firstName: 'Other' }
        ]
      };

      nock(`https://${domain}`)
        .get('/venueuserslists')
        .query(true)
        .reply(200, searchResponse);

      const bundle = {
        authData: { domain },
        inputData: {
          email: 'notfound@example.com',
          firstName: 'Jane'
        }
      };

      await expect(
        appTester(App.creates['user-update'].operation.perform, bundle)
      ).rejects.toThrow('User with email notfound@example.com not found');
    });

    it('should throw error if no users returned from search', async () => {
      nock(`https://${domain}`)
        .get('/venueuserslists')
        .query(true)
        .reply(200, { venueusers: [] });

      const bundle = {
        authData: { domain },
        inputData: {
          email: 'notfound@example.com'
        }
      };

      await expect(
        appTester(App.creates['user-update'].operation.perform, bundle)
      ).rejects.toThrow('User with email notfound@example.com not found');
    });
  });

  describe('updating user by userId', () => {
    it('should update user by userId', async () => {
      nock(`https://${domain}`)
        .get('/venueusers/12345')
        .reply(200, { venueuser: mockExistingUser });

      nock(`https://${domain}`)
        .put('/venueusers/12345')
        .reply(200, {
          venueUserPutViewModel: { ...mockExistingUser, firstName: 'Jane' }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          userId: '12345',
          firstName: 'Jane'
        }
      };

      const result = await appTester(
        App.creates['user-update'].operation.perform,
        bundle
      );

      expect(result.id).toBe('12345');
      expect(result.firstName).toBe('Jane');
    });

    it('should throw error if neither userId nor email provided', async () => {
      const bundle = {
        authData: { domain },
        inputData: {
          firstName: 'Jane'
        }
      };

      await expect(
        appTester(App.creates['user-update'].operation.perform, bundle)
      ).rejects.toThrow('Either User ID or Email is required');
    });
  });

  describe('updating profile fields', () => {
    beforeEach(() => {
      nock(`https://${domain}`)
        .get('/venueusers/12345')
        .reply(200, { venueuser: mockExistingUser });
    });

    it('should update firstName and lastName', async () => {
      nock(`https://${domain}`)
        .put('/venueusers/12345', body => {
          expect(body.venueUserPutViewModel.firstName).toBe('Jane');
          expect(body.venueUserPutViewModel.lastName).toBe('Smith');
          return true;
        })
        .reply(200, {
          venueUserPutViewModel: {
            ...mockExistingUser,
            firstName: 'Jane',
            lastName: 'Smith'
          }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          userId: '12345',
          firstName: 'Jane',
          lastName: 'Smith'
        }
      };

      const result = await appTester(
        App.creates['user-update'].operation.perform,
        bundle
      );

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
    });

    it('should update organisation', async () => {
      nock(`https://${domain}`)
        .put('/venueusers/12345', body => {
          expect(body.venueUserPutViewModel.organisation).toBe('New Org');
          return true;
        })
        .reply(200, {
          venueUserPutViewModel: { ...mockExistingUser, organisation: 'New Org' }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          userId: '12345',
          organisation: 'New Org'
        }
      };

      const result = await appTester(
        App.creates['user-update'].operation.perform,
        bundle
      );

      expect(result.organisation).toBe('New Org');
    });

    it('should update language', async () => {
      nock(`https://${domain}`)
        .put('/venueusers/12345', body => {
          expect(body.venueUserPutViewModel.language).toBe('fr');
          return true;
        })
        .reply(200, {
          venueUserPutViewModel: { ...mockExistingUser, language: 'fr' }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          userId: '12345',
          language: 'fr'
        }
      };

      const result = await appTester(
        App.creates['user-update'].operation.perform,
        bundle
      );

      expect(result.language).toBe('fr');
    });

    it('should update and validate twoLetterCountryCode', async () => {
      nock(`https://${domain}`)
        .put('/venueusers/12345', body => {
          expect(body.venueUserPutViewModel.twoLetterCountryCode).toBe('CA');
          return true;
        })
        .reply(200, {
          venueUserPutViewModel: { ...mockExistingUser, twoLetterCountryCode: 'CA' }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          userId: '12345',
          twoLetterCountryCode: 'ca' // lowercase, should be converted
        }
      };

      const result = await appTester(
        App.creates['user-update'].operation.perform,
        bundle
      );

      expect(result.twoLetterCountryCode).toBe('CA');
    });

    it('should throw error for invalid country code length', async () => {
      const bundle = {
        authData: { domain },
        inputData: {
          userId: '12345',
          twoLetterCountryCode: 'USA'
        }
      };

      await expect(
        appTester(App.creates['user-update'].operation.perform, bundle)
      ).rejects.toThrow('Country code must be exactly 2 letters');
    });

    it('should update contactNumber', async () => {
      nock(`https://${domain}`)
        .put('/venueusers/12345', body => {
          expect(body.venueUserPutViewModel.contactNumber).toBe('9876543210');
          return true;
        })
        .reply(200, {
          venueUserPutViewModel: { ...mockExistingUser, contactNumber: '9876543210' }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          userId: '12345',
          contactNumber: '9876543210'
        }
      };

      const result = await appTester(
        App.creates['user-update'].operation.perform,
        bundle
      );

      expect(result.contactNumber).toBe('9876543210');
    });

    it('should update notes', async () => {
      nock(`https://${domain}`)
        .put('/venueusers/12345', body => {
          expect(body.venueUserPutViewModel.notes).toBe('Updated notes');
          return true;
        })
        .reply(200, {
          venueUserPutViewModel: { ...mockExistingUser, notes: 'Updated notes' }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          userId: '12345',
          notes: 'Updated notes'
        }
      };

      const result = await appTester(
        App.creates['user-update'].operation.perform,
        bundle
      );

      expect(result.notes).toBe('Updated notes');
    });
  });

  describe('tag operations', () => {
    beforeEach(() => {
      nock(`https://${domain}`)
        .get('/venueusers/12345')
        .reply(200, { venueuser: mockExistingUser });
    });

    it('should add a single tag', async () => {
      nock(`https://${domain}`)
        .put('/venueusers/12345', body => {
          const tags = body.venueUserPutViewModel.venueusertags;
          expect(tags).toContain('100');
          expect(tags).toContain('200');
          expect(tags).toContain('300');
          expect(tags.length).toBe(3);
          return true;
        })
        .reply(200, {
          venueUserPutViewModel: {
            ...mockExistingUser,
            venueusertags: ['100', '200', '300']
          }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          userId: '12345',
          tagAction: 'add',
          tagId: '300'
        }
      };

      const result = await appTester(
        App.creates['user-update'].operation.perform,
        bundle
      );

      expect(result.tags).toContain('300');
      expect(result.tags.length).toBe(3);
    });

    it('should add multiple tags', async () => {
      nock(`https://${domain}`)
        .put('/venueusers/12345', body => {
          const tags = body.venueUserPutViewModel.venueusertags;
          expect(tags).toContain('100');
          expect(tags).toContain('200');
          expect(tags).toContain('300');
          expect(tags).toContain('400');
          expect(tags.length).toBe(4);
          return true;
        })
        .reply(200, {
          venueUserPutViewModel: {
            ...mockExistingUser,
            venueusertags: ['100', '200', '300', '400']
          }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          userId: '12345',
          tagAction: 'add',
          tagId: ['300', '400']
        }
      };

      const result = await appTester(
        App.creates['user-update'].operation.perform,
        bundle
      );

      expect(result.tags).toContain('300');
      expect(result.tags).toContain('400');
      expect(result.tags.length).toBe(4);
    });

    it('should not add duplicate tags', async () => {
      nock(`https://${domain}`)
        .put('/venueusers/12345', body => {
          const tags = body.venueUserPutViewModel.venueusertags;
          expect(tags.filter(t => t === '100').length).toBe(1);
          expect(tags.length).toBe(2);
          return true;
        })
        .reply(200, {
          venueUserPutViewModel: mockExistingUser
        });

      const bundle = {
        authData: { domain },
        inputData: {
          userId: '12345',
          tagAction: 'add',
          tagId: '100' // Already exists
        }
      };

      await appTester(App.creates['user-update'].operation.perform, bundle);
    });

    it('should remove a single tag', async () => {
      nock(`https://${domain}`)
        .put('/venueusers/12345', body => {
          const tags = body.venueUserPutViewModel.venueusertags;
          expect(tags).not.toContain('100');
          expect(tags).toContain('200');
          expect(tags.length).toBe(1);
          return true;
        })
        .reply(200, {
          venueUserPutViewModel: {
            ...mockExistingUser,
            venueusertags: ['200']
          }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          userId: '12345',
          tagAction: 'remove',
          tagId: '100'
        }
      };

      const result = await appTester(
        App.creates['user-update'].operation.perform,
        bundle
      );

      expect(result.tags).not.toContain('100');
      expect(result.tags.length).toBe(1);
    });

    it('should remove multiple tags', async () => {
      nock(`https://${domain}`)
        .put('/venueusers/12345', body => {
          const tags = body.venueUserPutViewModel.venueusertags;
          expect(tags).not.toContain('100');
          expect(tags).not.toContain('200');
          expect(tags.length).toBe(0);
          return true;
        })
        .reply(200, {
          venueUserPutViewModel: {
            ...mockExistingUser,
            venueusertags: []
          }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          userId: '12345',
          tagAction: 'remove',
          tagId: ['100', '200']
        }
      };

      const result = await appTester(
        App.creates['user-update'].operation.perform,
        bundle
      );

      expect(result.tags.length).toBe(0);
    });

    it('should set tags (replace all)', async () => {
      nock(`https://${domain}`)
        .put('/venueusers/12345', body => {
          const tags = body.venueUserPutViewModel.venueusertags;
          expect(tags).toEqual(['500', '600']);
          return true;
        })
        .reply(200, {
          venueUserPutViewModel: {
            ...mockExistingUser,
            venueusertags: ['500', '600']
          }
        });

      const bundle = {
        authData: { domain },
        inputData: {
          userId: '12345',
          tagAction: 'set',
          tagId: ['500', '600']
        }
      };

      const result = await appTester(
        App.creates['user-update'].operation.perform,
        bundle
      );

      expect(result.tags).toEqual(['500', '600']);
    });

    it('should throw error when tagAction is set but tagId is missing', async () => {
      const bundle = {
        authData: { domain },
        inputData: {
          userId: '12345',
          tagAction: 'add'
        }
      };

      await expect(
        appTester(App.creates['user-update'].operation.perform, bundle)
      ).rejects.toThrow('Tag ID(s) are required when Tag Action is specified');
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      nock(`https://${domain}`)
        .get('/venueusers/12345')
        .reply(200, { venueuser: mockExistingUser });

      nock(`https://${domain}`)
        .put('/venueusers/12345')
        .reply(500, { error: 'Internal server error' });

      const bundle = {
        authData: { domain },
        inputData: {
          userId: '12345',
          firstName: 'Jane'
        }
      };

      await expect(
        appTester(App.creates['user-update'].operation.perform, bundle)
      ).rejects.toThrow('Unexpected status code 500');
    });
  });

  describe('real authentication test', () => {
    it('should update a user with real authentication', async () => {
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

      // Now perform the update with authenticated credentials using email
      const updateBundle = {
        authData: {
          domain: authResult.domain,
          headers: authResult.headers
        },
        inputData: {
          email: process.env.TEST_EMAIL,
          notes: `Test update at ${new Date().toISOString()}`
        }
      };

      const result = await appTester(
        App.creates['user-update'].operation.perform,
        updateBundle
      );

      expect(result).toBeDefined();
      expect(result.email).toBe(process.env.TEST_EMAIL.toLowerCase());
      expect(result.success).toBe(true);
    });

    it('should add a tag to a user with real authentication', async () => {
      // Skip this test if credentials are not available
      if (!process.env.TEST_USERNAME || !process.env.TEST_PASSWORD || !process.env.TEST_DOMAIN || !process.env.TEST_EMAIL || !process.env.TEST_TAG_ID) {
        console.log('Skipping real tag test - credentials or TEST_TAG_ID not provided in environment');
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

      // Add a tag to the user
      const updateBundle = {
        authData: {
          domain: authResult.domain,
          headers: authResult.headers
        },
        inputData: {
          email: process.env.TEST_EMAIL,
          tagAction: 'add',
          tagId: process.env.TEST_TAG_ID
        }
      };

      const result = await appTester(
        App.creates['user-update'].operation.perform,
        updateBundle
      );

      expect(result).toBeDefined();
      expect(result.email).toBe(process.env.TEST_EMAIL.toLowerCase());
      expect(result.tags).toContain(process.env.TEST_TAG_ID);
      expect(result.success).toBe(true);

      console.log('Tag added successfully. User now has tags:', result.tags);
    });

    it('should remove a tag from a user with real authentication', async () => {
      // Skip this test if credentials are not available
      if (!process.env.TEST_USERNAME || !process.env.TEST_PASSWORD || !process.env.TEST_DOMAIN || !process.env.TEST_EMAIL || !process.env.TEST_TAG_ID) {
        console.log('Skipping real tag removal test - credentials or TEST_TAG_ID not provided in environment');
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

      // Remove a tag from the user
      const updateBundle = {
        authData: {
          domain: authResult.domain,
          headers: authResult.headers
        },
        inputData: {
          email: process.env.TEST_EMAIL,
          tagAction: 'remove',
          tagId: process.env.TEST_TAG_ID
        }
      };

      const result = await appTester(
        App.creates['user-update'].operation.perform,
        updateBundle
      );

      expect(result).toBeDefined();
      expect(result.email).toBe(process.env.TEST_EMAIL.toLowerCase());
      expect(result.tags).not.toContain(process.env.TEST_TAG_ID);
      expect(result.success).toBe(true);

      console.log('Tag removed successfully. User now has tags:', result.tags);
    });
  });
});
