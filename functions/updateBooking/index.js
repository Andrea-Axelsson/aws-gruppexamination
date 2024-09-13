import { sendResponse, sendError } from "../../responses/index.js";
import { db } from "../../services/db.js";

export async function handler(event, context) {
  const allowedFields = [
    "numberOfGuests",
    "doubleRoom",
    "singleRoom",
    "suite",
    "checkInDate",
    "checkOutDate",
  ];

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    return sendError(400, {
      success: false,
      message: "Invalid request body",
    });
  }

  const filteredBody = Object.keys(requestBody)
    .filter((key) => allowedFields.includes(key))
    .reduce((obj, key) => {
      obj[key] = requestBody[key];
      return obj;
    }, {});

  const extraFields = Object.keys(requestBody).filter(
    (key) => !allowedFields.includes(key)
  );
  if (extraFields.length > 0) {
    return sendError(400, {
      success: false,
      message: `Invalid fields: ${extraFields.join(", ")}`,
    });
  }

  // Check for missing required fields (allowing 0 as a valid value for certain fields)
  const missingFields = allowedFields.filter(
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

  const { id } = event.pathParameters;
  const {
    numberOfGuests,
    doubleRoom,
    checkOutDate,
    suite,
    singleRoom,
    checkInDate,
  } = filteredBody;

  const maxGuestsSingleRoom = 1;
  const maxGuestsDoubleRoom = 2;
  const maxGuestsSuite = 3;

  if (
    numberOfGuests >
    maxGuestsSingleRoom * singleRoom +
      maxGuestsDoubleRoom * doubleRoom +
      maxGuestsSuite * suite
  ) {
    return sendError(404, { success: false, message: "Too many guests" });
  }

  try {
    const existingBooking = await db
      .get({
        TableName: "bookings-db",
        Key: { id: id },
      })
      .promise();

    if (!existingBooking.Item) {
      return sendError(404, {
        success: false,
        message: "Booking ID does not exist",
      });
    }

    const currentBookings = await db
      .scan({
        TableName: "bookings-db",
      })
      .promise();

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

    const newBookingRooms = {
      singleRoom: singleRoom || 0,
      doubleRoom: doubleRoom || 0,
      suite: suite || 0,
    };

    const maxRoomsAvailable = 20;
    const totalRoomsRequested = Object.values(newBookingRooms).reduce(
      (acc, num) => acc + num,
      0
    );

    // Debugging logs
    console.log("Existing Booking:", existingBooking.Item);
    console.log("Total Booked Rooms:", totalBookedRooms);
    console.log("New Booking Rooms:", newBookingRooms);
    console.log("Total Rooms Requested:", totalRoomsRequested);

    const totalRoomsAfterBooking =
      totalRoomsRequested +
      Object.values(totalBookedRooms).reduce((acc, num) => acc + num, 0) -
      (existingBooking.Item.singleRoom || 0) -
      (existingBooking.Item.doubleRoom || 0) -
      (existingBooking.Item.suite || 0);

    // More debugging logs
    console.log("Total Rooms After Booking:", totalRoomsAfterBooking);
    console.log("Max Rooms Available:", maxRoomsAvailable);

    if (totalRoomsAfterBooking > maxRoomsAvailable) {
      console.log("Error: Not enough rooms available");
      return sendError(400, {
        success: false,
        message: "Not enough rooms available",
      });
    }

    // Prices per room type
    const pricePerNight = {
      singleRoom: 500,
      doubleRoom: 1000,
      suite: 1500,
    };

    // Calculate new total amount for the booking
    const totalAmount = Object.values(newBookingRooms).reduce(
      (acc, num, index) => {
        return acc + num * pricePerNight[Object.keys(newBookingRooms)[index]];
      },
      0
    );

    const result = await db
      .update({
        TableName: "bookings-db",
        Key: { id: id },
        UpdateExpression:
          "set numberOfGuests = :g, doubleRoom = :d, checkOutDate = :co, suite = :s, singleRoom = :sr, checkInDate = :ci, totalAmount = :ta",
        ExpressionAttributeValues: {
          ":g": numberOfGuests,
          ":d": doubleRoom,
          ":co": checkOutDate,
          ":s": suite,
          ":sr": singleRoom,
          ":ci": checkInDate,
          ":ta": totalAmount,
        },
        ReturnValues: "UPDATED_NEW",
      })
      .promise();

    console.log("Update operation successful:", result);
    return sendResponse(200, {
      success: true,
      message: "Booking successfully updated",
      data: result.Attributes,
    });
  } catch (error) {
    console.error("Error:", error.message, error.stack);
    return sendError(500, {
      success: false,
      message: "Could not update Booking",
      error: error.message,
    });
  }
}
