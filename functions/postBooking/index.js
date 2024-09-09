import { sendResponse, sendError } from '../../responses/index.js';
import { db } from '../../services/db.js';

export async function handler(event, context) {
    try {

        // Kontrollera att det finns en bokning med det angivna id:t
        if(!event.pathParameters || !event.pathParameters.id) {
            return sendError(400,  { success: false, message: 'Missing booking id' });
        }

        // Ta bort bokningen från databasen
       const result = await db.delete({
        TableName: 'bookings-db',
        Key: {
            id: event.pathParameters.id
        }
       }).promise();

       // Om bokningen inte hittades ska en 404 returneras
       if(!result.Attributes) {
              return sendError(404, { success: false, message: 'Booking not found' });
       }

        console.log({message: 'Booking successfully removed', result});
        return sendResponse(200, { success: true });

        } catch (error) {
            console.error('Error:', error);
            return sendError(500, { success: false, message: 'Could not delete booking' }); 
    }
};