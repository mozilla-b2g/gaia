#!/usr/bin/env node

var backoff = require('../index');

var testBackoff = backoff.exponential({
    initialDelay: 10,
    maxDelay: 1000
});

testBackoff.failAfter(5);

testBackoff.on('backoff', function(number, delay) {
    console.log('Backoff start: ' + number + ' ' + delay + 'ms');
});

testBackoff.on('ready', function(number, delay) {
    console.log('Backoff done: ' + number + ' ' + delay + 'ms');
    testBackoff.backoff(); // Launch a new backoff.
});

testBackoff.on('fail', function() {
    console.log('Backoff failure.');
});

testBackoff.backoff();
