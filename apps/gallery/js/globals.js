/* exported files, picking, photodb, DateFormatter, TimeFormatter */

'use strict';

// This array holds information about all the image and video files we
// know about. Each array element is an object that includes a
// filename and metadata. The array is initially filled when we
// enumerate the mediadb, and has elements added and removed when we
// receive create and delete events from the media databases.
var files = [];

// If we're doing a pick activity, our URL will end with '#pick'
var picking = (window.location.hash === '#pick');

// The MediaDB object that manages the filesystem and the database of metadata
var photodb;

// Formatting object to store date-group DateTimeFormat defined using IntlHelper
var DateFormatter;

// Formatting object to store time-stamp DateTimeFormat defined using IntlHelper
var TimeFormatter;
