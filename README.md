GET all bookings:
https://aedhfn90fe.execute-api.eu-north-1.amazonaws.com/api/bookings

POST new room:
https://aedhfn90fe.execute-api.eu-north-1.amazonaws.com/api/rooms

body:
{
"type": "single",
"max_guests": 1,
"price_per_night": 500
}

{
"type": "double",
"max_guests": 2,
"price_per_night": 1000,
"quantity": 7
}

{
"type": "suite",
"max_guests": 3,
"price_per_night": 1500,
"quantity": 6
}

GET all rooms:
https://aedhfn90fe.execute-api.eu-north-1.amazonaws.com/api/rooms
