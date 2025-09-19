const sample = require('../samples/activity');
const modifyValues = (event) => {
  const diffMap = {};
  event.before = {}
  event.after = {}
  event.diff.forEach(item => {
    event.after[item.key] = item.modified
    event.before[item.key] = item.basis
    diffMap[item.key] = {
      basis: item.basis,
      modified: item.modified,
      type: item.type
    };
  });
  delete event.diff
  if (diffMap["Booking id"].basis) {
    event.bookingId = diffMap["Booking id"].basis
  }
  return event
}
const newBookingUpdate = async (z, bundle) => {
  const now = new Date();
  const halfHourAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const response = await z.request({
    method: 'GET',
    url: `https://${bundle.authData.domain}/eventlogslists`,
    params: {
      start: halfHourAgo.toISOString().slice(0, 19)
    }
  });
  const result = JSON.parse(response.content);
  let eventlogs = result.eventlogs
  return eventlogs.filter(value => value.eventType === 1).map(event => modifyValues(event))
};

module.exports = {
  key: 'bookingUpdate',
  noun: 'Booking Update',

  display: {
    label: 'Booking Updated',
    description: 'Triggers on a booking update.'
  },
  operation: {
    inputFields: [],
    perform: newBookingUpdate,
    sample,
  }
};
