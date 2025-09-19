
const getSessionKey = async (z, bundle) => {
  // console.log('authData', bundle.authData)
  
  // Get current time in EDT (UTC-4)
  const now = new Date();
  const edtOffset = -4 * 60; // EDT is UTC-4
  const edtTime = new Date(now.getTime() + (edtOffset * 60 * 1000));
  
  const response = await z.request({
    url: `https://skedda-login.amir-b8f.workers.dev/api/auth/login`,
    method: 'POST',
    body: {
        "username": bundle.authData.username,
        "password": bundle.authData.password,
        "domain": bundle.authData.domain,
        "timezone": "EDT",
        "timestamp": edtTime.toISOString()
    }
  });
  return JSON.parse(response.content)
};

const includeSessionKeyHeader = (request, z, bundle) => {
  if (bundle.authData.headers) {
    request.headers = {...bundle.authData.headers, ...request.headers}
  }
  
  // Add EDT timezone header if needed
  if (bundle.authData.timezone) {
    request.headers['X-Timezone'] = 'EDT';
  }
  
  return request;
};

const test = async (z, bundle) => {
  const response = await z.request({ 
    url: `https://${bundle.authData.domain}/webs`,
    method: 'GET',
    headers: bundle.authData.headers,
  });
  return response.data;
}

module.exports = {
  config: {
    // Using session auth instead of OAuth2 for Skedda
    type: 'session',
    sessionConfig: {
      perform: getSessionKey,
    },
    fields: [
      { key: 'domain', label: 'Domain', required: true },
      { key: 'username', label: 'Username', required: true },
      {
        key: 'password',
        label: 'Password',
        required: true,
        type: 'password',
      },
    ],

    // The test method allows Zapier to verify that the credentials a user provides
    // are valid. We'll execute this method whenever a user connects their account for
    // the first time.
    test,

    // This template string can access all the data returned from the auth test. If
    // you return the test object, you'll access the returned data with a label like
    // `{{json.X}}`. If you return `response.data` from your test, then your label can
    // be `{{X}}`. This can also be a function that returns a label. That function has
    // the standard args `(z, bundle)` and data returned from the test can be accessed
    // in `bundle.inputData.X`.
    connectionLabel: (z, bundle) => ( bundle.inputData.venueusers[0].username ),
  },
  befores: [includeSessionKeyHeader],
  afters: [],
};
