const sample = require('../samples/user');

const findUser = async (z, bundle) => {
  const email = bundle.inputData.email;

  if (!email) {
    throw new z.errors.Error(
      'Email is required',
      'InvalidData',
      400
    );
  }

  const options = {
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

  const response = await z.request(options);
  const data = JSON.parse(response.content);

  if (!data.venueusers || data.venueusers.length === 0) {
    return [];
  }

  // Find exact email match
  const user = data.venueusers.find(u => u.username && u.username.toLowerCase() === email.toLowerCase());

  if (!user) {
    return [];
  }

  return [user];
};

module.exports = {
  key: 'find_user',
  noun: 'User',

  display: {
    label: 'Find User by Email',
    description: 'Finds a user by their email address.'
  },

  operation: {
    inputFields: [
      {
        key: 'email',
        label: 'Email',
        required: true,
        helpText: 'The email address of the user to find.'
      }
    ],
    perform: findUser,
    sample: sample
  }
};
