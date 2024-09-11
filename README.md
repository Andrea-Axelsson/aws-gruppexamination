GRUPP POOP SHERIFFS 💩🤠

Sofia Rosborg
Linnea Sjöholm
Andrea Axelsson

URL Endpoints

<!-- Get all bookings  -->

GET - https://aedhfn90fe.execute-api.eu-north-1.amazonaws.com/api/bookings

<!-- Create new booking  -->

POST - https://aedhfn90fe.execute-api.eu-north-1.amazonaws.com/api/bookRoom

In body
{
"numberOfGuests": 1,
"doubleRoom": 1,
"checkOutDate": 20240508,
"suite": 1,
"singleRoom": 1,
"fullName": "Andrea",
"email": "Adrea.gmail",
"checkInDate": 20240504
}

<!-- Update booking -->

PUT - https://aedhfn90fe.execute-api.eu-north-1.amazonaws.com/api/booking/{id}

Add the ID from the selected booking as a path parameter at the end of the URL.

In body:

{
"numberOfGuests": 4,
"doubleRoom": 2,
"checkOutDate": 20240508,
"suite": 0,
"singleRoom": 0,
"checkInDate": 20240504
}

<!-- Delete booking -->

DELETE - https://aedhfn90fe.execute-api.eu-north-1.amazonaws.com/api/booking/{id}

Add the ID from the selected booking as a path parameter at the end of the URL.
