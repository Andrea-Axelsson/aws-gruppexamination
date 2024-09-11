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
    // Vänta på att nanoid blir tillgängligt
    if (!nanoid) {
      await import("nanoid").then((module) => {
        nanoid = module.nanoid;
      });
    }

    // Lista över obligatoriska fält
    const requiredFields = {
      numberOfGuests,
      checkInDate,
      checkOutDate,
      fullName,
      email,
    };

    // Kontrollera att alla obligatoriska fält finns
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    // Om fält saknas, skicka ett felmeddelande
    if (missingFields.length > 0) {
      return sendError(400, {
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Beräkna antal nätter
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const numberOfNights = Math.ceil(
      (checkOut - checkIn) / (1000 * 60 * 60 * 24)
    );

    if (numberOfNights <= 0) {
      return sendError(400, {
        success: false,
        message: "Invalid check-in or check-out date",
      });
    }

    // Kapaciteter för olika rumstyper
    const roomCapacities = {
      singleRoom: 1,
      doubleRoom: 2,
      suite: 3,
    };

    // Skapa en lista över begärda rum
    const selectedRooms = [
      { type: "singleRoom", requested: singleRoom || 0 },
      { type: "doubleRoom", requested: doubleRoom || 0 },
      { type: "suite", requested: suite || 0 },
    ];

    // Kontrollera att antalet gäster matchar rumskapaciteten
    const totalCapacity = selectedRooms.reduce(
      (acc, room) => acc + (roomCapacities[room.type] || 0) * room.requested,
      0
    );

    if (totalCapacity < numberOfGuests) {
      return sendError(400, {
        success: false,
        message: "Insufficient room capacity",
      });
    }

    /* MAX BOOKING OF ROOM */

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

   const totalRoomsAfterBooking = totalRoomsRequested + Object.values(totalBookedRooms).reduce((acc, num) => acc + num, 0);

   if (totalRoomsAfterBooking > maxRoomsAvailable) {
     return sendError(400, {
       success: false,
       message: `Exceeded the total number of available rooms. Only ${maxRoomsAvailable - Object.values(totalBookedRooms).reduce((acc, num) => acc + num, 0)} rooms left.`,
     });
   }

   /* MAX BOOKING OF ROOM */


    // Beräkna totalsumma
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

    // Skapa boknings-id
    const id = nanoid();

    // Skapa bokning i 'bookings-db'
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

    // Svara med bokningsinformation och bekräftelse
    return sendResponse(200, {
      success: true,
      bookingId: id,
      numberOfGuests: numberOfGuests,
      roomTypes: selectedRooms,
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
