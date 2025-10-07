const updateBooking = require('./updates/booking');
const deleteBooking = require('./updates/booking-delete');
const updateUser = require('./updates/user-update');
const createUser = require('./updates/user-create');
const findUser = require('./searches/find-user');
const newActivity = require('./triggers/activity');
const newBookingUpdate = require('./triggers/booking-update');
const newBookingCancellation = require('./triggers/booking-delete');
const {
  config: authentication,
  befores = [],
  afters = [],
} = require('./authentication');

const App = {
  // This is just shorthand to reference the installed dependencies you have. Zapier will
  // need to know these before we can upload
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,
  authentication,

  // beforeRequest & afterResponse are optional hooks into the provided HTTP client
  beforeRequest: [...befores],

  afterResponse: [...afters],

  // If you want to define optional resources to simplify creation of triggers, searches, creates - do that here!
  resources: {},

  // If you want your trigger to show up, you better include it here!
  triggers: {
    [newActivity.key]: newActivity,
    [newBookingUpdate.key]: newBookingUpdate,
    [newBookingCancellation.key]: newBookingCancellation,
  },

  // If you want your searches to show up, you better include it here!
  searches: {
    [findUser.key]: findUser,
  },

  // If you want your creates to show up, you better include it here!
  creates: {
    [updateBooking.key]: updateBooking,
    [deleteBooking.key]: deleteBooking,
    [updateUser.key]: updateUser,
    [createUser.key]: createUser
  },
};

// Finally, export the app.
module.exports = App;
