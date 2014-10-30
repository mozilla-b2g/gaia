#!/usr/bin/env node

var backoff = require('../index');

var randomizedBackoff = backoff.fibonacci({
    randomisationFactor: 0.4,
    initialDelay: 10,
    maxDelay: 1000
});

randomizedBackoff.on('backoff', function(number, delay) {
    console.log('Backoff start: ' + number + ' ' + delay + 'ms');
});

randomizedBackoff.on('ready', function(number, delay) {
    console.log('Backoff done: ' + number + ' ' + delay + 'ms');

    if (number < 15) {
        randomizedBackoff.backoff();
    }
});

randomizedBackoff.backoff();
