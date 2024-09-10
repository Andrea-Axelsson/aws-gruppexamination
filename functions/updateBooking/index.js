import { sendResponse, sendError } from '../../responses/index.js';
import { db } from '../../services/db.js';

export async function handler(event, context) {
    const { id } = event.pathParameters;
    const { numberOfGuests, doubleRoom, checkOutDate, suite, singleRoom, checkInDate} = JSON.parse(event.body);

     // Definiera maximalt antal gäster per rumstyp
     const maxGuestsSingleRoom = 1;
     const maxGuestsDoubleRoom = 2;
     const maxGuestsSuite = 3;
 
     // Kontrollera om antalet gäster överstiger det maximala antalet gäster som rummen kan hantera
     if (numberOfGuests > (maxGuestsSingleRoom * singleRoom) + (maxGuestsDoubleRoom * doubleRoom) + (maxGuestsSuite * suite)) {
         return sendError(404, { success: false, message: 'Too many guests' });
     }

    try {
        const result = await db.update({
            TableName: 'bookings-db',
            Key: {
                id: id
            },
            UpdateExpression: 'set numberOfGuests = :g, doubleRoom = :d, checkOutDate = :co, suite = :s, singleRoom = :sr, checkInDate = :ci',
            ExpressionAttributeValues: {
                ':g': numberOfGuests,
                ':d': doubleRoom,
                ':co': checkOutDate,
                ':s': suite,
                ':sr': singleRoom,
                ':ci': checkInDate
            },
            ReturnValues: "UPDATED_NEW"
        }).promise();

        console.log('Update operation successful:', result);
        return sendResponse(200, { success: true, message: 'Booking successfully updated', data: result.Attributes });
    } catch (error) {
        console.error('Error:', error);
        return sendError(500, { success: false, message: 'Could not update Booking'});
    }
}

