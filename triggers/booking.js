const sample = require('../samples/sample_booking');

const triggerBooking = (z, bundle) => {
  // Calculate dates in EDT timezone (UTC-4)
  const now = new Date();
  const edtOffset = -4 * 60; // EDT is UTC-4 hours
  const edtNow = new Date(now.getTime() + (edtOffset * 60 * 1000));
  
  // Calculate start and end dates in EDT
  const start = new Date(edtNow.getTime() + (60 * 1000)); // 1 minute from now
  const end = new Date(edtNow.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days from now
  
  // Format dates as YYYY-MM-DDTHH:MM:SS.mmm in EDT
  const formatDateEDT = (date) => {
    return date.toISOString().replace('Z', '-04:00'); // Convert to EDT format
  };
  
  const responsePromise = z.request({
    method: 'GET',
    url: `https://${bundle.authData.domain}/bookingslists`,
    params: {
      start: formatDateEDT(start),
      end: formatDateEDT(end),
      timezone: 'EDT'
    }
  });
  return responsePromise
    .then(response => JSON.parse(response.content));
};

module.exports = {
  key: 'booking',
  noun: 'Booking',

  display: {
    label: 'New Booking',
    description: 'Triggers on a new Booking in EDT timezone.'
  },

  operation: {
    inputFields: [],
    perform: triggerBooking,
    sample: sample
  }
}; 