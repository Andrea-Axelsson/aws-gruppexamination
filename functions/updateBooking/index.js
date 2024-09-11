import { sendResponse, sendError } from '../../responses/index.js';
import { db } from '../../services/db.js';

export async function handler(event, context) {
    // Extracting the booking ID from the URL parameters and booking details from the request body
    const { id } = event.pathParameters;
    const { numberOfGuests, doubleRoom, checkOutDate, suite, singleRoom, checkInDate } = JSON.parse(event.body);

    // Define the maximum guest capacity for each room type
    const maxGuestsSingleRoom = 1;
    const maxGuestsDoubleRoom = 2;
    const maxGuestsSuite = 3;

    // Check if the total number of guests exceeds the available capacity based on the provided room quantities
    if (numberOfGuests > (maxGuestsSingleRoom * singleRoom) + (maxGuestsDoubleRoom * doubleRoom) + (maxGuestsSuite * suite)) {
        return sendError(404, { success: false, message: 'Too many guests' });
    }

    try {
        // Check if the booking ID exists in the database
        const exisitingBooking = await db.get({
            TableName: 'bookings-db',
            Key: {id: id}
        }).promise()
        
        // If the booking does not exist, return an error
        if(!exisitingBooking.Item){
            return sendError(404, {success: false, message: 'Booking ID does not exist'})
        }


        // Update the booking details in the database
        const result = await db.update({
            TableName: 'bookings-db', // Specify the database table
            Key: { id: id }, // Identify the booking to update by its ID
            UpdateExpression: 'set numberOfGuests = :g, doubleRoom = :d, checkOutDate = :co, suite = :s, singleRoom = :sr, checkInDate = :ci',
            ExpressionAttributeValues: {
                ':g': numberOfGuests,
                ':d': doubleRoom,
                ':co': checkOutDate,
                ':s': suite,
                ':sr': singleRoom,
                ':ci': checkInDate
            },
            ReturnValues: "UPDATED_NEW" // Return only the updated attributes
        }).promise();

        console.log('Update operation successful:', result); // Log the successful update
        return sendResponse(200, { success: true, message: 'Booking successfully updated', data: result.Attributes });
    } catch (error) {
        console.error('Error:', error); // Log any errors
        return sendError(500, { success: false, message: 'Could not update Booking' }); // Handle errors with a response
    }
}