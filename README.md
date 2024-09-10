URL Endpoints

POST - https://aedhfn90fe.execute-api.eu-north-1.amazonaws.com/api/bookRoom

<!-- Hämta alla bokningar  -->

GET - https://aedhfn90fe.execute-api.eu-north-1.amazonaws.com/api/bookings

<!-- Uppdatera Bokning -->

PUT - https://aedhfn90fe.execute-api.eu-north-1.amazonaws.com/api/booking/{id}

Lägg till id från vald bokning som path parameter det sista i url'en.

I body:

{
"numberOfGuests": 4,
"doubleRoom": 2,
"checkOutDate": 20240508,
"suite": 0,
"singleRoom": 0,
"checkInDate": 20240504
}

<!-- Radera Bokning -->
