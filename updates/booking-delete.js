const sample = require('../samples/booking');

const deleteBooking = async (z, bundle) => {
  const bookingId = bundle.inputData.bookingId
  const options = {
    method: "DELETE",
    url: `https://${bundle.authData.domain}/bookings/${bookingId}`,
  };
  
  const response = await z.request(options);
  
  // Throw if unexpected status code (success usually 200 or 201)
  if (response.status !== 200 && response.status !== 201 && response.status !== 204) {
    throw new z.errors.Error(
      `Unexpected status code ${response.status}: ${response.content}`,
      "BookingUpdateError",
      response.status
    );
  }
  return { success: true }
};

module.exports = {
  key: 'bookingDelete',
  noun: 'Booking Remove',

  display: {
    label: 'Remove booking',
    description: 'Remove a booking.'
  },

  operation: {
    inputFields: [
      { key: 'bookingId', label: 'Booking ID', required: true },
    ],
    perform: deleteBooking,
    sample: sample
  }
};
