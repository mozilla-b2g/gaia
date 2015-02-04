#!/usr/bin/env node

var backoff = require('../index');

var backoff = backoff.exponential();

backoff.on('ready', function(number, delay) {
    console.log('Backoff done: ' + number + ' ' + delay + 'ms');

    if (number < 15) {
        backoff.backoff();
    }
});

backoff.backoff();

setInterval(function() {
    backoff.reset();
    backoff.backoff();
}, 5000);
