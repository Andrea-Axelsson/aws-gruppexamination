import { sendResponse, sendError } from "../../responses/index.js";
import { db } from "../../services/db.js";

// Convert yyyymmdd string to Date object
const parseDate = (yyyymmdd) => {
  // Convert to string if it's not already a string
  const dateStr = yyyymmdd.toString();

  // Extract year, month, and day from the string
  const year = parseInt(dateStr.slice(0, 4), 10); // Extracts the first 4 characters as year
  const month = parseInt(dateStr.slice(4, 6), 10) - 1; // Extracts the next 2 characters as month (zero-indexed for JavaScript Date)
  const day = parseInt(dateStr.slice(6, 8), 10); // Extracts the last 2 characters as day

  // Return a new Date object
  return new Date(year, month, day);
};

export async function handler(event, context) {
  try {
    // Control that the booking id is provided
    if (!event.pathParameters || !event.pathParameters.id) {
      return sendError(400, { success: false, message: "Missing booking id" });
    }

    // Get the booking id
    const bookingId = event.pathParameters.id;

    const getBooking = await db
      .get({
        TableName: "bookings-db",
        Key: {
          id: bookingId,
        },
      })
      .promise();

    // Control that the booking exists
    if (!getBooking.Item) {
      return sendError(404, { success: false, message: "Booking not found" });
    }

    // Retrieve and convert the check-in date from the booking
    const checkInDate = parseDate(getBooking.Item.checkInDate);

    // Validate if the converted date is valid
    if (isNaN(checkInDate.getTime())) {
      return sendError(400, {
        success: false,
        message: "Invalid check-in date format in the booking",
      });
    }

    // Get today's date and set the time to midnight (00:00:00) to ignore time during comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate days between today and check-in date
    const daysUntilCheckIn = Math.ceil(
      (checkInDate - today) / (1000 * 60 * 60 * 24)
    );

    // Control that booking cannot be cancelled in less than 2 days
    if (daysUntilCheckIn < 2) {
      return sendError(400, {
        success: false,
        message: "Cannot cancel booking in less than 2 days",
      });
    }

    // Remove the booking
    await db
      .delete({
        TableName: "bookings-db",
        Key: {
          id: bookingId,
        },
      })
      .promise();

    return sendResponse(200, {
      success: true,
      message: "Booking successfully deleted",
    });
  } catch (error) {
    return sendError(500, {
      success: false,
      message: "Could not delete booking",
    });
  }
}
