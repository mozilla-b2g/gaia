#!/usr/bin/env node

var backoff = require('../index.js'),
    util = require('util'),
    http = require('http');

var URL = 'http://www.iana.org/domains/example/';

function get(options, callback) {
    http.get(options, function(res) {
        res.setEncoding('utf8');
        res.data = '';
        res.on('data', function (chunk) {
            res.data += chunk;
        });
        res.on('end', function() {
            callback(null, res);
        });
        res.on('close', function(err) {
            callback(err, res);
        });
    }).on('error', function(err) {
        callback(err, null);
    });
}


var call = backoff.call(get, URL, function(err, res) {
    // Notice how the call is captured inside the closure.
    console.log('Retries: ' + call.getResults().length);

    if (err) {
        console.log('Error: ' + err.message);
    } else {
        console.log('Status: ' + res.statusCode);
    }
});

// Called when function is called with function's args.
call.on('call', function(url) {
    console.log('call: ' + util.inspect(arguments));
});

// Called with results each time function returns.
call.on('callback', function(err, res) {
    console.log('callback: ' + util.inspect(arguments));
});

// Called on backoff.
call.on('backoff', function(number, delay) {
    console.log('backoff: ' + util.inspect(arguments));
});

call.setStrategy(new backoff.ExponentialStrategy());
call.failAfter(2);
call.start();
