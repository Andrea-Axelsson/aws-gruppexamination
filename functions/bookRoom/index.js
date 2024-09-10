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

export async function handler(event, context) {
  const {
    numberOfGuests,
    doubleRoom,
    singleRoom,
    suite,
    checkInDate,
    checkOutDate,
    fullName,
    email,
  } = JSON.parse(event.body);

  try {
    // Wait for nanoid to be available if not already
    if (!nanoid) {
      await import("nanoid").then((module) => {
        nanoid = module.nanoid;
      });
    }

    // List of required fields
    const requiredFields = {
      numberOfGuests,
      checkInDate,
      checkOutDate,
      fullName,
      email,
    };

    // Check if any required fields are missing
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    // If missing fields, send an error response
    if (missingFields.length > 0) {
      return sendError(400, {
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Calculate number of nights
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const numberOfNights = Math.ceil(
      (checkOut - checkIn) / (1000 * 60 * 60 * 24) // Convert milliseconds to days
    );

    // Validate check-in and check-out dates
    if (numberOfNights <= 0) {
      return sendError(400, {
        success: false,
        message: "Invalid check-in or check-out date",
      });
    }

    // Room capacities for different types
    const roomCapacities = {
      singleRoom: 1,
      doubleRoom: 2,
      suite: 3,
    };

    // Create a list of requested rooms
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

    // If tinsifficient capacity, send an error response
    if (totalCapacity < numberOfGuests) {
      return sendError(400, {
        success: false,
        message: "Insufficient room capacity",
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

    // Generate boknings ID
    const id = nanoid();

    // Save booking to the 'bookings-db' table
    await db
      .put({
        TableName: "bookings-db",
        Item: {
          id: id,
          numberOfGuests: numberOfGuests,
          roomTypes: selectedRooms,
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
