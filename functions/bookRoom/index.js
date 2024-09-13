import { sendResponse, sendError } from "../../responses/index.js";
import { db } from "../../services/db.js";

let nanoid;
import("nanoid")
  .then((module) => {
    nanoid = module.nanoid;
  })
  .catch((err) => {
    console.error("Failed to load nanoid:", err);
  });

// Validate if date is in yyyymmdd format and if date is valid
const validateDateFormat = (yyyymmdd) => {
  const datePattern = /^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/;

  // Check if date matches format
  if (!datePattern.test(yyyymmdd)) {
    return false;
  }

  // Parse year, month and day from the string
  const year = parseInt(yyyymmdd.slice(0, 4), 10);
  const month = parseInt(yyyymmdd.slice(4, 6), 10) - 1; // Months are 0-indexed
  const day = parseInt(yyyymmdd.slice(6, 8), 10);

  const date = new Date(year, month, day);

  // Check if date is valid
  return (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  );
};

export async function handler(event, context) {
  const allowedFields = [
    "numberOfGuests",
    "doubleRoom",
    "singleRoom",
    "suite",
    "checkInDate",
    "checkOutDate",
    "fullName",
    "email",
  ];

  // Check if the request body is valid JSON
  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    return sendError(400, {
      success: false,
      message: "Invalid request body",
    });
  }

  // Filter out any extra fields that are not allowed
  const filteredBody = Object.keys(requestBody)
    .filter((key) => allowedFields.includes(key))
    .reduce((obj, key) => {
      obj[key] = requestBody[key];
      return obj;
    }, {});

  // Check if any extra fields are present
  const extraFields = Object.keys(requestBody).filter(
    (key) => !allowedFields.includes(key)
  );
  if (extraFields.length > 0) {
    return sendError(400, {
      success: false,
      message: `Invalid fields: ${extraFields.join(", ")}`,
    });
  }

  const {
    numberOfGuests,
    doubleRoom,
    singleRoom,
    suite,
    checkInDate,
    checkOutDate,
    fullName,
    email,
  } = filteredBody;

  const requiredFields = [
    "numberOfGuests",
    "checkInDate",
    "checkOutDate",
    "fullName",
    "email",
  ];

  // Check for missing required fields (allowing 0 as a valid value for certain fields)
  const missingFields = requiredFields.filter(
    (field) => filteredBody[field] === undefined || filteredBody[field] === null
  );

  if (missingFields.length > 0) {
    return sendError(400, {
      success: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Validate room fields explicitly to allow 0
  const roomFields = ["suite", "doubleRoom", "singleRoom"];
  const invalidRoomFields = roomFields.filter(
    (field) => filteredBody[field] === undefined || filteredBody[field] === null
  );

  if (invalidRoomFields.length > 0) {
    return sendError(400, {
      success: false,
      message: `Missing required room fields: ${invalidRoomFields.join(", ")}`,
    });
  }

  try {
    // Wait for nanoid to be available if not already
    if (!nanoid) {
      await import("nanoid").then((module) => {
        nanoid = module.nanoid;
      });
    }

    // Validate check-in date format
    if (!validateDateFormat(checkInDate.toString())) {
      return sendError(400, {
        success: false,
        message:
          "Invalid check-in date format. Date must be in yyyymmdd format.",
      });
    }

    // Validate check-in and check-out date format
    if (!validateDateFormat(checkOutDate.toString())) {
      return sendError(400, {
        success: false,
        message:
          "Invalid check-out date format. Date must be in yyyymmdd format.",
      });
    }

    // Convert check-in date from string to Date object
    const checkIn = new Date(
      parseInt(checkInDate.toString().slice(0, 4)),
      parseInt(checkInDate.toString().slice(4, 6)) - 1, // Months are 0-indexed
      parseInt(checkInDate.toString().slice(6, 8))
    );

    // Convert check-out date from string to Date object
    const checkOut = new Date(
      parseInt(checkOutDate.toString().slice(0, 4)),
      parseInt(checkOutDate.toString().slice(4, 6)) - 1, // Months are 0-indexed
      parseInt(checkOutDate.toString().slice(6, 8))
    );

    // Set hours, minutes, seconds and milliseconds to 0 for both dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if check-in and check-out dates are in the future
    if (checkIn <= today || checkOut <= today) {
      return sendError(400, {
        success: false,
        message: "Check-in and check-out dates must be in the future",
      });
    }

    // Calculate number of nights between check-in and check-out
    const numberOfNights = Math.ceil(
      (checkOut - checkIn) / (1000 * 60 * 60 * 24) // Convert milliseconds to days
    );

    // Ensure the number of nights is positive (valid check-in/check-out)
    if (numberOfNights <= 0) {
      return sendError(400, {
        success: false,
        message: "Invalid check-in or check-out date",
      });
    }

    // Room capacities for different room types
    const roomCapacities = {
      singleRoom: 1,
      doubleRoom: 2,
      suite: 3,
    };

    // List of requested rooms and their types
    const selectedRooms = [
      { type: "singleRoom", requested: singleRoom || 0 },
      { type: "doubleRoom", requested: doubleRoom || 0 },
      { type: "suite", requested: suite || 0 },
    ];

    // Check if total capacity meets the requested number of guests
    const totalCapacity = selectedRooms.reduce(
      (acc, room) => acc + (roomCapacities[room.type] || 0) * room.requested,
      0
    );

    // If total capacity is insufficient, send an error response
    if (totalCapacity < numberOfGuests) {
      return sendError(400, {
        success: false,
        message: "Insufficient room capacity",
      });
    }

    // Fetch current bookings from DynamoDB
    const currentBookings = await db
      .scan({
        TableName: "bookings-db",
      })
      .promise();

    // Calculate the total number of rooms already booked
    const totalBookedRooms = currentBookings.Items.reduce(
      (acc, booking) => {
        return {
          singleRoom: acc.singleRoom + (booking.singleRoom || 0),
          doubleRoom: acc.doubleRoom + (booking.doubleRoom || 0),
          suite: acc.suite + (booking.suite || 0),
        };
      },
      { singleRoom: 0, doubleRoom: 0, suite: 0 }
    );

    // Calculate total rooms requested in the new booking
    const newBookingRooms = {
      singleRoom: singleRoom || 0,
      doubleRoom: doubleRoom || 0,
      suite: suite || 0,
    };

    // Check if adding the new booking would exceed room limits
    const maxRoomsAvailable = 20;
    const totalRoomsRequested = Object.values(newBookingRooms).reduce(
      (acc, num) => acc + num,
      0
    );

    const totalRoomsAfterBooking =
      totalRoomsRequested +
      Object.values(totalBookedRooms).reduce((acc, num) => acc + num, 0);

    if (totalRoomsAfterBooking > maxRoomsAvailable) {
      return sendError(400, {
        success: false,
        message: `Exceeded the total number of available rooms. Only ${
          maxRoomsAvailable -
          Object.values(totalBookedRooms).reduce((acc, num) => acc + num, 0)
        } rooms left.`,
      });
    }

    // Calculate total amount for the booking
    const totalAmount = selectedRooms.reduce((acc, room) => {
      const pricePerNight = {
        singleRoom: 500,
        doubleRoom: 1000,
        suite: 1500,
      };
      return (
        acc + (pricePerNight[room.type] || 0) * room.requested * numberOfNights
      );
    }, 0);

    // Generate booking ID
    const id = nanoid();

    // Save booking to the 'bookings-db' table
    await db
      .put({
        TableName: "bookings-db",
        Item: {
          id: id,
          numberOfGuests: numberOfGuests,
          singleRoom: singleRoom,
          doubleRoom: doubleRoom,
          suite: suite,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
          name: fullName,
          email: email,
          totalAmount: totalAmount,
          createdAt: new Date().toISOString(),
        },
      })
      .promise();

    // Return booking information and confirmation response
    return sendResponse(200, {
      success: true,
      bookingId: id,
      numberOfGuests: numberOfGuests,
      singleRoom: singleRoom,
      doubleRoom: doubleRoom,
      suite: suite,
      checkInDate: checkInDate,
      checkOutDate: checkOutDate,
      name: fullName,
      totalAmount: totalAmount,
    });
  } catch (error) {
    console.error("Error:", error);
    return sendError(500, { success: false, message: "Failed to book room" });
  }
}
