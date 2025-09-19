const sample = require('../samples/booking');

const updateBooking = async (z, bundle) => {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  now.setHours(0, 0, 0, 0);

  const futureDate = new Date(now.getTime());
  futureDate.setDate(futureDate.getDate() + 90);
  futureDate.setHours(23, 59, 59, 999); // Set to 23:59:59.999 (end of day)
  // const now = new Date();
  // const oneYearFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const bookingListResponse = await z.request({
    method: 'GET',
    url: `https://${bundle.authData.domain}/bookingslists`,
    params: {
      start: now.toISOString().slice(0, 19),
      end: futureDate.toISOString().slice(0, 19),
    }
  });
  const bookingListResult = JSON.parse(bookingListResponse.content);
  let bookings = bookingListResult.bookings
  z.console.log(bookingListResult)
  if (!bookings || !bookings.length) {
    throw new z.errors.Error(
      `No bookings found in the system. between ${now.toISOString().slice(0, 19)} and ${futureDate.toISOString().slice(0, 19)} `,
      "InvalidData",
      404
    );
  }
  let booking = {}
  bookings.forEach(value => {
    if (value.id === bundle.inputData.bookingId) {
      booking = value
    }
  })
  if (!booking) {
    throw new z.errors.Error(
      `Booking ${bundle.inputData.bookingId} not found.`,
      "InvalidData",
      404
    );
  }
  booking.paymentStatus = parseInt(bundle.inputData.paymentStatus)
  const bookingId = booking.id
  delete booking.id
  delete booking.syncToExternalCalendar
  delete booking.piClientSecret

  // try {
  //   const response = await z.request({
  //     method: 'PUT',
  //     url: `https://${bundle.authData.domain}/bookings/${bookingId}`,
  //     body: JSON.stringify({ booking })
  //   });
  //   // const result = await responsePromise
  //   //   .then(response => JSON.parse(response.content)).then(response => response.booking);
  //   return response.data
  // } catch (err) {
  //   throw new z.errors.Error(
  //     err.message + JSON.stringify(booking),
  //     "ServerError",
  //     500
  //   );
  // }

  const options = {
    method: "PUT",
    url: `https://${bundle.authData.domain}/bookings/${bookingId}`,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ booking }),
    throwForStatus: false
  };
  
  const response = await z.request(options);
  
  // Throw if unexpected status code (success usually 200 or 201)
  if (response.status !== 200 && response.status !== 201) {
    throw new z.errors.Error(
      `Unexpected status code ${response.status}: ${response.content}`,
      "BookingUpdateError",
      response.status
    );
  }
  
  return JSON.parse(response.content).booking;

};

module.exports = {
  key: 'booking',
  noun: 'Booking',

  display: {
    label: 'Update booking',
    description: 'Update a booking.'
  },

  operation: {
    inputFields: [
      { key: 'bookingId', label: 'Booking ID', required: true },
      {
        key: 'paymentStatus', label: 'Payment Status', choices: {
          1: "No status",
          2: "Unpaid",
          3: "Paid"
        }
      },
    ],
    perform: updateBooking,
    sample: sample
  }
};
