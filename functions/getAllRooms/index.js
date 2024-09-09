import { sendResponse, sendError } from '../../responses/index.js';
import { db } from '../../services/db.js';

export async function handler(event, context) {
    try {
        const result = await db.scan({
            TableName: 'rooms-db'
        }).promise();

        console.log('Get all rooms operation successful:', result);
        return sendResponse(200, { success: true, room: result.Items });
    } catch (error) {
        console.error('Error:', error);
        return sendError(500, { success: false, message: 'Could not fetch rooms' });
    }
}