const sample = require('../samples/user');

/**
 * Updates a user in Skedda by user ID or email.
 * Supports updating profile fields, tags, and notes.
 *
 * @param {Object} z - Zapier platform object
 * @param {Object} bundle - Contains authData and inputData
 * @returns {Object} Updated user object
 */
const updateUser = async (z, bundle) => {
  const userId = bundle.inputData.userId;
  const email = bundle.inputData.email;

  // Determine if we're using userId directly or need to search by email
  let targetUserId = userId;
  let existingUser;

  if (!userId && !email) {
    throw new z.errors.Error(
      'Either User ID or Email is required',
      'InvalidData',
      400
    );
  }

  // If only email provided, search for user first
  if (!userId && email) {
    const searchOptions = {
      method: 'GET',
      url: `https://${bundle.authData.domain}/venueuserslists`,
      params: {
        fromInclusive: 0,
        s: email,
        sortDirection: 0,
        sortProperty: 1,
        toExclusive: 50,
        totalMatches: 0
      }
    };

    const searchResponse = await z.request(searchOptions);
    const searchData = JSON.parse(searchResponse.content);

    if (!searchData.venueusers || searchData.venueusers.length === 0) {
      throw new z.errors.Error(
        `User with email ${email} not found`,
        'UserNotFound',
        404
      );
    }

    // Find exact email match (case-insensitive)
    const matchedUser = searchData.venueusers.find(
      u => u.username && u.username.toLowerCase() === email.toLowerCase()
    );

    if (!matchedUser) {
      throw new z.errors.Error(
        `User with email ${email} not found`,
        'UserNotFound',
        404
      );
    }

    targetUserId = matchedUser.id;
    existingUser = matchedUser;
  }

  // If userId was provided, fetch current user data
  if (userId && !existingUser) {
    const getOptions = {
      method: 'GET',
      url: `https://${bundle.authData.domain}/venueusers/${targetUserId}`,
      headers: {
        'Accept': 'application/json'
      }
    };
    
    const getResponse = await z.request(getOptions);
    existingUser = JSON.parse(getResponse.content).venueuser || JSON.parse(getResponse.content);
  }
  
  // Build the user object with all existing data
  const user = {
    // Preserve all existing fields (based on Skedda's venueuser response format)
    registerToken: existingUser.registerToken || null,
    registerMetadata: existingUser.registerMetadata || null,
    registerPayloadId: existingUser.registerPayloadId || null,
    registerPayloadKey: existingUser.registerPayloadKey || null,
    resetAccessToken: existingUser.resetAccessToken || false,
    paymentGatewayCustomerId: existingUser.paymentGatewayCustomerId || null,
    ccVenueToken: existingUser.ccVenueToken || null,
    updateCreditCard: existingUser.updateCreditCard || false,
    createdDate: existingUser.createdDate,
    antiForgeryToken: existingUser.antiForgeryToken || null,
    photo: existingUser.photo || null,
    notes: existingUser.notes || null,
    createStripeCustomer: existingUser.createStripeCustomer || false,
    termsAgreed: existingUser.termsAgreed || false,
    removeExternalLogins: existingUser.removeExternalLogins || false,
    twoLetterCountryCode: existingUser.twoLetterCountryCode || null,
    contactNumber: existingUser.contactNumber || null,
    contactNumberE164: existingUser.contactNumberE164 || null,
    sampleContactNumber: existingUser.sampleContactNumber || null,
    contactNumberDisplay: existingUser.contactNumberDisplay || null,
    contactNumberRequired: existingUser.contactNumberRequired !== false,
    language: existingUser.language || null,
    organisation: existingUser.organisation || null,
    username: existingUser.username,
    arbitraryerrors: null,

    // Update with new values if provided
    firstName: bundle.inputData.firstName || existingUser.firstName,
    lastName: bundle.inputData.lastName || existingUser.lastName,
    venueusertags: existingUser.venueusertags || []
  };

  // Override fields if provided in input
  if (bundle.inputData.contactNumber !== undefined) {
    user.contactNumber = bundle.inputData.contactNumber;
  }

  if (bundle.inputData.organisation !== undefined) {
    user.organisation = bundle.inputData.organisation;
  }

  if (bundle.inputData.language !== undefined) {
    user.language = bundle.inputData.language;
  }

  if (bundle.inputData.twoLetterCountryCode !== undefined) {
    const countryCode = bundle.inputData.twoLetterCountryCode;
    // Validate it's a 2-letter code
    if (countryCode && countryCode.length !== 2) {
      throw new z.errors.Error(
        'Country code must be exactly 2 letters (e.g., US, CA, GB)',
        'InvalidData',
        400
      );
    }
    user.twoLetterCountryCode = countryCode ? countryCode.toUpperCase() : countryCode;
  }

  // Handle tag operations
  if (bundle.inputData.tagAction) {
    // Validate that tagId is provided when tagAction is set
    if (!bundle.inputData.tagId) {
      throw new z.errors.Error(
        'Tag ID(s) are required when Tag Action is specified',
        'InvalidData',
        400
      );
    }

    const currentTags = user.venueusertags || [];
    // Normalize tagId to always be an array
    const tagIds = Array.isArray(bundle.inputData.tagId)
      ? bundle.inputData.tagId
      : [bundle.inputData.tagId];

    if (bundle.inputData.tagAction === 'add') {
      // Add multiple tags, avoiding duplicates
      tagIds.forEach(tagId => {
        if (!currentTags.includes(tagId)) {
          currentTags.push(tagId);
        }
      });
      user.venueusertags = currentTags;
    } else if (bundle.inputData.tagAction === 'remove') {
      // Remove multiple tags
      user.venueusertags = currentTags.filter(tag => !tagIds.includes(tag));
    } else if (bundle.inputData.tagAction === 'set') {
      // Replace all tags with provided ones
      user.venueusertags = tagIds;
    }
  }
  
  // Handle notes update
  if (bundle.inputData.notes !== undefined) {
    user.notes = bundle.inputData.notes;
  }
  
  const options = {
    method: "PUT",
    url: `https://${bundle.authData.domain}/venueusers/${targetUserId}`,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ venueuser: user }),
    throwForStatus: false
  };

  const response = await z.request(options);

  if (response.status !== 200 && response.status !== 201) {
    // Log detailed error information for debugging
    z.console.log('Update failed:', {
      status: response.status,
      userId: targetUserId,
      responseContent: response.content
    });

    throw new z.errors.Error(
      `Failed to update user (status ${response.status}): ${response.content}`,
      "UserUpdateError",
      response.status
    );
  }

  // Response might have the user data in different locations
  const responseData = JSON.parse(response.content);
  const updatedUser = responseData.venueUserPutViewModel || 
                      responseData.venueuser || 
                      responseData.user || 
                      responseData;
  
  // Return cleaned up response
  return {
    id: updatedUser.id || targetUserId,
    email: updatedUser.username,
    firstName: updatedUser.firstName,
    lastName: updatedUser.lastName,
    contactNumber: updatedUser.contactNumber,
    organisation: updatedUser.organisation,
    language: updatedUser.language,
    twoLetterCountryCode: updatedUser.twoLetterCountryCode,
    tags: updatedUser.venueusertags || [],
    notes: updatedUser.notes,
    createdDate: updatedUser.createdDate,
    success: true
  };
};

module.exports = {
  key: 'user-update',
  noun: 'User',

  display: {
    label: 'Update User',
    description: 'Update a user profile including tags and other properties.'
  },

  operation: {
    inputFields: [
      // { 
      //   key: 'userId', 
      //   label: 'User ID', 
      //   required: false,
      //   helpText: 'The Skedda user ID. Either this or email is required.'
      // },
      { 
        key: 'email', 
        label: 'Email', 
        required: true,
        helpText: 'User email to search for. Either this or User ID is required.'
      },
      { 
        key: 'firstName', 
        label: 'First Name', 
        required: false 
      },
      { 
        key: 'lastName', 
        label: 'Last Name', 
        required: false 
      },
      {
        key: 'contactNumber',
        label: 'Contact Number',
        required: false
      },
      {
        key: 'organisation',
        label: 'Organisation',
        required: false,
        helpText: 'The user\'s organisation or company name'
      },
      {
        key: 'language',
        label: 'Language',
        required: false,
        helpText: 'Preferred language code (e.g., en, fr, es)'
      },
      {
        key: 'twoLetterCountryCode',
        label: 'Country Code',
        required: false,
        helpText: 'Two-letter country code (e.g., US, CA, GB)'
      },
      {
        key: 'tagAction',
        label: 'Tag Action',
        required: false,
        choices: {
          add: 'Add Tag',
          remove: 'Remove Tag',
          set: 'Set Tags (Replace All)'
        },
        helpText: 'Choose how to modify user tags'
      },
      {
        key: 'tagId',
        label: 'Tag ID(s)',
        required: false,
        list: true,
        helpText: 'Tag ID(s) to add, remove, or set. For "set" action, provide all tags that should be assigned.'
      },
      {
        key: 'notes',
        label: 'Internal Notes',
        required: false,
        type: 'text',
        helpText: 'Internal notes about the user'
      }
    ],
    perform: updateUser,
    sample: sample
  }
};