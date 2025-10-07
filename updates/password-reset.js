const sample = {
  success: true,
  email: 'user@example.com',
  message: 'Password reset email sent successfully'
};

/**
 * Sends a password reset email to a user.
 *
 * @param {Object} z - Zapier platform object
 * @param {Object} bundle - Contains authData and inputData
 * @returns {Object} Success response
 */
const resetPassword = async (z, bundle) => {
  const email = bundle.inputData.email;

  if (!email) {
    throw new z.errors.Error(
      'Email is required',
      'InvalidData',
      400
    );
  }

  // Build the reset request payload
  const resetRequest = {
    loginresetrequest: {
      username: email,
      returnUrl: `https://${bundle.authData.domain}/booking`,
      product: null,
      arbitraryerrors: null
    }
  };

  const options = {
    method: 'POST',
    url: 'https://app.skedda.com/loginresetrequests',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(resetRequest),
    throwForStatus: false
  };

  const response = await z.request(options);

  if (response.status !== 200 && response.status !== 201 && response.status !== 204) {
    // Log detailed error information for debugging
    z.console.log('Password reset failed:', {
      status: response.status,
      email: email,
      responseContent: response.content
    });

    throw new z.errors.Error(
      `Failed to send password reset email (status ${response.status}): ${response.content}`,
      'PasswordResetError',
      response.status
    );
  }

  // Return success response
  return {
    success: true,
    email: email,
    message: 'Password reset email sent successfully',
    returnUrl: `https://${bundle.authData.domain}/booking`
  };
};

module.exports = {
  key: 'password-reset',
  noun: 'Password Reset',

  display: {
    label: 'Send Password Reset Email',
    description: 'Sends a password reset email to a user.'
  },

  operation: {
    inputFields: [
      {
        key: 'email',
        label: 'Email',
        required: true,
        type: 'string',
        helpText: 'The email address of the user who needs to reset their password'
      }
    ],
    perform: resetPassword,
    sample: sample
  }
};
