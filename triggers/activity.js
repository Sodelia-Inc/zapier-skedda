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
  if(diffMap["Booking id"].basis){
    event.bookingId = diffMap["Booking id"].basis
  }
  return event
}
const newActivity = async (z, bundle) => {
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
  if (!eventlogs || !eventlogs.length) return []
  if(bundle.inputData.type){
    const type = parseInt(bundle.inputData.type)
    eventlogs = eventlogs.filter(value => value.eventType === type)
  }
  return eventlogs.map(event => modifyValues(event))
};

module.exports = {
  key: 'activity',
  noun: 'Activity',

  display: {
    label: 'New Activity',
    description: 'Triggers on a new activity.'
  },
  operation: {
    inputFields: [
      {
        key: 'type', label: 'Activity Type', choices: {
          0: "New",
          1: "Update",
          2: "Cancel"
        }
      },
    ],
    perform: newActivity,
    sample,
  }
};
