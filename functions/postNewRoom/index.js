import { sendResponse, sendError }from '../../responses/index.js'
import { db }from '../../services/db.js'


let nanoid;
import('nanoid').then(module => {
    nanoid = module.nanoid;
}).catch(err => {
    console.error('Failed to load nanoid:', err);
});

export async function handler(event, context) {
    const { type, max_guests, price_per_night } = JSON.parse(event.body);

    try {
        // Vänta på att nanoid blir tillgängligt
        if (!nanoid) {
            await import('nanoid').then(module => {
                nanoid = module.nanoid;
            });
        }

        const id = nanoid();

        await db.put({
            TableName: 'rooms-db',
            Item: {
                id: id,
                type: type,
                max_guests: max_guests,
                price_per_night: price_per_night
            }
        }).promise();

        return sendResponse(200, { success: true });
    } catch (error) {
        console.error('Error:', error);
        return sendError(500, { success: false, message: 'Could not add room' });
    }
}
