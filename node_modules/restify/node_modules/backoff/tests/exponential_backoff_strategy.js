/*
 * Copyright (c) 2012 Mathieu Turcotte
 * Licensed under the MIT license.
 */

var sinon = require('sinon');

var ExponentialBackoffStrategy = require('../lib/strategy/exponential');

exports["ExponentialBackoffStrategy"] = {
    setUp: function(callback) {
        this.strategy = new ExponentialBackoffStrategy({
            initialDelay: 10,
            maxDelay: 1000
        });
        callback();
    },

    "backoff delays should follow an exponential sequence": function(test) {
        // Exponential sequence: x[i] = x[i-1] * 2.
        var expectedDelays = [10, 20, 40, 80, 160, 320, 640, 1000, 1000];
        var actualDelays = [];

        for (var i = 0; i < expectedDelays.length; i++) {
            actualDelays.push(this.strategy.next());
        }

        test.deepEqual(expectedDelays, actualDelays,
            'Generated delays should follow an exponential sequence.');
        test.done();
    },

    "backoff delays should restart from the initial delay after reset": function(test) {
        var strategy = new ExponentialBackoffStrategy({
            initialDelay: 10,
            maxDelay: 1000
        });

        strategy.next();
        strategy.reset();

        var backoffDelay = strategy.next();
        test.equals(backoffDelay, 10,
            'Strategy should return the initial delay after reset.');
        test.done();
    }
};
