import { sendResponse, sendError } from '../../responses/index.js';
import { db } from '../../services/db.js';

export async function handler(event, context) {
    try {

        // Kontrollera att boknings-ID:t finns
        if(!event.pathParameters || !event.pathParameters.id) {
            return sendError(400,  { success: false, message: 'Missing booking id' });
        }

        const bookingId = event.pathParameters.id;

        const getBooking = await db.get({
            TableName: 'bookings-db',
            Key: {
                id: bookingId
            }
        }).promise();

        // Kontrollera att bokningen finns
        if(!getBooking.Item) {
            return sendError(404, { success: false, message: 'Booking not found' });
        }

        // Ta bort bokningen från databasen
       await db.delete({
        TableName: 'bookings-db',
        Key: {
            id: bookingId
        }
       }).promise();
       
       return sendResponse(200, { success: true, message: 'Booking successfully deleted' });
       
        } catch (error) {
            return sendError(500, { success: false, message: 'Could not delete booking' }); 
    }
};