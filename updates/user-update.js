const sample = require('../samples/user');

const updateUser = async (z, bundle) => {
  const userId = bundle.inputData.userId;
  const email = bundle.inputData.email;
  
  // Determine if we're using userId directly or need to search by email
  let targetUserId = userId;
  
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
    
    targetUserId = searchData.venueusers[0].id;
    var existingUser = searchData.venueusers[0];
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
    // Preserve all existing fields
    registerToken: existingUser.registerToken,
    registerMetadata: existingUser.registerMetadata,
    registerPayloadId: existingUser.registerPayloadId,
    registerPayloadKey: existingUser.registerPayloadKey,
    resetAccessToken: existingUser.resetAccessToken || false,
    paymentGatewayCustomerId: existingUser.paymentGatewayCustomerId,
    ccVenueToken: existingUser.ccVenueToken,
    updateCreditCard: existingUser.updateCreditCard || false,
    createdDate: existingUser.createdDate,
    antiForgeryToken: existingUser.antiForgeryToken,
    photo: existingUser.photo,
    notes: existingUser.notes || '',
    createStripeCustomer: existingUser.createStripeCustomer || false,
    termsAgreed: existingUser.termsAgreed || false,
    removeExternalLogins: existingUser.removeExternalLogins || false,
    twoLetterCountryCode: existingUser.twoLetterCountryCode,
    contactNumber: existingUser.contactNumber,
    contactNumberE164: existingUser.contactNumberE164,
    sampleContactNumber: existingUser.sampleContactNumber,
    contactNumberDisplay: existingUser.contactNumberDisplay,
    contactNumberRequired: existingUser.contactNumberRequired !== false,
    language: existingUser.language,
    organisation: existingUser.organisation,
    username: existingUser.username,
    arbitraryerrors: null,
    
    // Update with new values if provided
    firstName: bundle.inputData.firstName || existingUser.firstName,
    lastName: bundle.inputData.lastName || existingUser.lastName,
    venueusertags: existingUser.venueusertags || []
  };
  
  // Override contact number if provided
  if (bundle.inputData.contactNumber) {
    user.contactNumber = bundle.inputData.contactNumber;
    // You might want to update contactNumberE164 and contactNumberDisplay too
  }
  
  // Handle tag operations
  if (bundle.inputData.tagAction && bundle.inputData.tagId) {
    const currentTags = user.venueusertags || [];
    const tagId = bundle.inputData.tagId;
    
    if (bundle.inputData.tagAction === 'add') {
      if (!currentTags.includes(tagId)) {
        currentTags.push(tagId);
      }
    } else if (bundle.inputData.tagAction === 'remove') {
      const index = currentTags.indexOf(tagId);
      if (index > -1) {
        currentTags.splice(index, 1);
      }
    } else if (bundle.inputData.tagAction === 'set') {
      // Replace all tags with provided ones
      user.venueusertags = Array.isArray(bundle.inputData.tagId) 
        ? bundle.inputData.tagId 
        : [bundle.inputData.tagId];
    }
    
    if (bundle.inputData.tagAction !== 'set') {
      user.venueusertags = currentTags;
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
    body: JSON.stringify({ venueUserPutViewModel: user }), // CHANGED: Use venueUserPutViewModel instead of venueuser
    throwForStatus: false
  };

  const response = await z.request(options);

  if (response.status !== 200 && response.status !== 201) {
    throw new z.errors.Error(
      `Unexpected status code ${response.status}: ${response.content}`,
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
      { 
        key: 'userId', 
        label: 'User ID', 
        required: false,
        helpText: 'The Skedda user ID. Either this or email is required.'
      },
      { 
        key: 'email', 
        label: 'Email', 
        required: false,
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