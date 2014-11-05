'use strict';

// Loop would do some getUserMedia here but the safest way to get a
// hardware-independent permission prompt while running the test is
// to use the geolocation API.
navigator.geolocation.getCurrentPosition(function(){});
