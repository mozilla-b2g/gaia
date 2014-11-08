#!/usr/bin/env node
var browserify = require('browserify');
var path       = require('path');
var fs         = require('fs');

// Create a browserify bundle
var b = browserify();

// Add browser.js which will require slugid and add it to the window element
b.add(path.join(__dirname, '..', 'browser.js'));

// Open slugid-browserify.js and pipe bundle to it
var file = fs.createWriteStream(path.join(__dirname, '..', 'slugid-browserify.js'));
b.bundle().pipe(file);

// Write to stdout so we know what happened
console.log("Updated slugid-browserify.js");
