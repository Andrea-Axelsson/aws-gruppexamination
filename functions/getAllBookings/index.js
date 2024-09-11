import { sendResponse, sendError } from '../../responses/index.js';
import { db } from '../../services/db.js';

export async function handler(event, context) {
    try {
        // Scan the 'bookings-db' table to retrieve all booking records
        const result = await db.scan({
            TableName: 'bookings-db' // Specify the database table to scan
        }).promise();

        console.log('Get all bookings operation successful:', result); // Log the successful retrieval
        // Return a success response with all bookings
        return sendResponse(200, { success: true, bookings: result.Items });
    } catch (error) {
        console.error('Error:', error); // Log any errors that occur during the scan
        // Return an error response if fetching bookings fails
        return sendError(500, { success: false, message: 'Could not fetch bookings' });
    }
}