import { sendResponse, sendError } from '../../responses/index.js';
import { db } from '../../services/db.js';

export async function handler(event, context) {
    try {

        // Control if the booking id is missing in the request
        if(!event.pathParameters || !event.pathParameters.id) {
            return sendError(400,  { success: false, message: 'Missing booking id' });
        }

        // Remove the booking from the database
       const result = await db.delete({
        TableName: 'bookings-db',
        Key: {
            id: event.pathParameters.id
        }
       }).promise();

       // If the booking is not found, return an error
       if(!result.Attributes === undefined) {
              return sendError(404, { success: false, message: 'Booking not found' });
       }
        
       return sendResponse(200, { success: true, message: 'Booking successfully removed' });
       
        } catch (error) {
            return sendError(500, { success: false, message: 'Could not delete booking' }); 
    }
};