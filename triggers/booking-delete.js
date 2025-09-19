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
const newBookingDelete = async (z, bundle) => {
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
  return eventlogs.filter(value => value.eventType === 2).map(event => modifyValues(event))
};

module.exports = {
  key: 'bookingDelete',
  noun: 'Booking Delete',

  display: {
    label: 'Booking Cancelled',
    description: 'Triggers on a booking cancelled.'
  },
  operation: {
    inputFields: [],
    perform: newBookingDelete,
    sample,
  }
};
