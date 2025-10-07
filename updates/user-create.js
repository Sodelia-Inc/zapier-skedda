const sample = require('../samples/user');

/**
 * Creates a new user in Skedda.
 * First checks if the email is valid, then creates the user.
 *
 * @param {Object} z - Zapier platform object
 * @param {Object} bundle - Contains authData and inputData
 * @returns {Object} Created user object
 */
const createUser = async (z, bundle) => {
  const email = bundle.inputData.email;
  const firstName = bundle.inputData.firstName;
  const lastName = bundle.inputData.lastName;

  if (!email) {
    throw new z.errors.Error(
      'Email is required',
      'InvalidData',
      400
    );
  }

  if (!firstName || !lastName) {
    throw new z.errors.Error(
      'First name and last name are required',
      'InvalidData',
      400
    );
  }

  // Step 1: Call userprofilepings to validate email and check if user exists
  const pingOptions = {
    method: 'GET',
    url: `https://${bundle.authData.domain}/userprofilepings`,
    params: {
      email: email,
      includevenueuserid: true
    }
  };

  const pingResponse = await z.request(pingOptions);
  const pingData = JSON.parse(pingResponse.content);

  if (!pingData.userprofileping) {
    throw new z.errors.Error(
      'Invalid response from user profile ping',
      'ServerError',
      500
    );
  }

  // Check if user already exists
  if (pingData.userprofileping.venueuserId) {
    throw new z.errors.Error(
      `User with email ${email} already exists (ID: ${pingData.userprofileping.venueuserId})`,
      'UserAlreadyExists',
      409
    );
  }

  // Check if email is valid
  if (!pingData.userprofileping.isValidEmail) {
    throw new z.errors.Error(
      `Email ${email} is not valid`,
      'InvalidEmail',
      400
    );
  }

  // Step 2: Fetch venue settings to get default values
  const venueResponse = await z.request({
    method: 'GET',
    url: `https://${bundle.authData.domain}/webs`
  });

  const venueData = JSON.parse(venueResponse.content);

  if (!venueData || venueData.length === 0) {
    throw new z.errors.Error(
      'Unable to fetch venue settings',
      'ServerError',
      500
    );
  }

  const venue = venueData.venue;

  if (!venue) {
    throw new z.errors.Error(
      'Invalid venue settings response',
      'ServerError',
      500
    );
  }

  // Get venue defaults
  const twoLetterCountryCode = venue.twoLetterCountryCode || 'US';
  const contactNumberRequired = venue.userContactNumberRequired || false;
  const sampleContactNumber = venue.sampleContactNumber || '(506) 234-5678';

  // Normalize tagIds to array
  const tagIds = bundle.inputData.tagId
    ? (Array.isArray(bundle.inputData.tagId)
      ? bundle.inputData.tagId
      : [bundle.inputData.tagId])
    : [];

  // Step 3: Create the user
  const user = {
    registerToken: null,
    registerMetadata: null,
    registerPayloadId: null,
    registerPayloadKey: null,
    resetAccessToken: false,
    paymentGatewayCustomerId: null,
    ccVenueToken: null,
    updateCreditCard: false,
    createdDate: null,
    antiForgeryToken: null,
    photo: null,
    notes: bundle.inputData.notes || null,
    createStripeCustomer: false,
    termsAgreed: true, // Required for user creation
    removeExternalLogins: false,
    twoLetterCountryCode: twoLetterCountryCode, // From venue settings
    contactNumber: bundle.inputData.contactNumber || null,
    contactNumberE164: null,
    sampleContactNumber: sampleContactNumber, // From venue settings
    contactNumberDisplay: null,
    contactNumberRequired: contactNumberRequired, // From venue settings
    language: null,
    firstName: firstName,
    lastName: lastName,
    organisation: null,
    username: email,
    arbitraryerrors: null,
    venueusertags: tagIds
  };

  const createOptions = {
    method: 'POST',
    url: `https://${bundle.authData.domain}/venueusers`,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ venueuser: user }),
    throwForStatus: false
  };

  const response = await z.request(createOptions);

  if (response.status !== 200 && response.status !== 201) {
    // Log detailed error information for debugging
    z.console.log('User creation failed:', {
      status: response.status,
      email: email,
      responseContent: response.content
    });

    throw new z.errors.Error(
      `Failed to create user (status ${response.status}): ${response.content}`,
      'UserCreateError',
      response.status
    );
  }

  // Parse response
  const responseData = JSON.parse(response.content);
  const createdUser = responseData.venueuser || responseData;

  // Return cleaned up response
  return {
    id: createdUser.id,
    email: createdUser.username,
    firstName: createdUser.firstName,
    lastName: createdUser.lastName,
    contactNumber: createdUser.contactNumber,
    organisation: createdUser.organisation,
    language: createdUser.language,
    twoLetterCountryCode: createdUser.twoLetterCountryCode,
    tags: createdUser.venueusertags || [],
    notes: createdUser.notes,
    createdDate: createdUser.createdDate,
    success: true
  };
};

module.exports = {
  key: 'user-create',
  noun: 'User',

  display: {
    label: 'Create User',
    description: 'Creates a new user in Skedda.'
  },

  operation: {
    inputFields: [
      {
        key: 'email',
        label: 'Email',
        required: true,
        type: 'string',
        helpText: 'The email address for the new user'
      },
      {
        key: 'firstName',
        label: 'First Name',
        required: true,
        type: 'string'
      },
      {
        key: 'lastName',
        label: 'Last Name',
        required: true,
        type: 'string'
      },
      {
        key: 'contactNumber',
        label: 'Contact Number',
        required: false,
        type: 'string',
        helpText: 'Phone number for the user'
      },
      {
        key: 'tagId',
        label: 'Tag ID(s)',
        required: false,
        list: true,
        helpText: 'Tag ID(s) to assign to the new user'
      },
      {
        key: 'notes',
        label: 'Internal Notes',
        required: false,
        type: 'text',
        helpText: 'Internal notes about the user'
      }
    ],
    perform: createUser,
    sample: sample
  }
};
