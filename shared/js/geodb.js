/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var pi_180 = Math.PI/180;

function distance(lat1, long1, lat2, long2) {
  var R = 6371; // km
  var dLat = (lat2 - lat1) * pi_180;
  var dLon = (long2 - long1) * pi_180;
  var lat1 = lat1 * pi_180;
  var lat2 = lat2 * pi_180;

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c;

  return d;
}

function getTimeZoneByLatLong(data, lat, long) {
  var nearest = data[0];
  var minimum = 99999999;
  for (var n = 1; n < data.length; ++n) {
    var p = data[n];
    var d = distance(lat, long, p[0], p[1]);
    if (d < minimum) {
      minimum = d;
      nearest = p;
    }
  }
  return nearest;
}

// Please remove this, its for testing only.

if (typeof window === 'undefined' && exports) {
  var fs = require('fs');
  fs.readFile('../resources/geodb.json', function(err, data) {
    if (err)
      throw err;
    data = JSON.parse(data);
    console.log(getTimeZoneByLatLong(data, 37.3974, -122.0732));
  });
}
