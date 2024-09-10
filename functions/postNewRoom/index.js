import { sendResponse, sendError } from "../../responses/index.js";
import { db } from "../../services/db.js";
import { nanoid } from "nanoid";

export async function handler(event, context) {
  const { type, max_guests, price_per_night } = JSON.parse(event.body);

  try {
    // Skapa ett unikt id direkt
    const id = nanoid(); // Genererar ID direkt
    console.log("Generated room ID:", id);

    const roomData = {
      id: id,
      type: type,
      max_guests: max_guests,
      price_per_night: price_per_night,
    };
    console.log("Room data:", roomData);

    await db
      .put({
        TableName: "rooms-db",
        Item: roomData,
      })
      .promise();

    return sendResponse(200, {
      success: true,
      message: "Room successfully added",
      roomId: id,
    });
  } catch (error) {
    console.error("Error:", error);
    return sendError(500, { success: false, message: "Could not add room" });
  }
}
