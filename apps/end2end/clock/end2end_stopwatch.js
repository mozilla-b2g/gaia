'use strict';
var Clock = require('./regions/app_view');
var expect = require('chai').expect;

marionette('Clock Acceptance Suite', function(){
    var client;
    var clock;
    client = marionette.client({
        prefs: {
            //Prefs go here
        },
        settings: {
            'lockscreen.enabled': false
        }
    });
    setup(function() {
        clock = new Clock(client);
        clock.launch();
    });
    suite('Stopwatch Suite', function() {
        test('Start Stopwatch and Reset', function() {
            var stopwatchView = clock.switchView('stopwatch');


            expect(stopwatchView.getDisplayedTime()).to.equal('00:00.00');

            stopwatchView.tapStart();
            stopwatchView.wait(0.2);

            stopwatchView.tapPause();
            stopwatchView.wait(0.2);
            expect(stopwatchView.getDisplayedTime()).not.to.equal('00:00.00');
            var firstTime = stopwatchView.getDisplayedTime();
            expect(stopwatchView.getDisplayedTime()).not.to.equal('00:00.00');

            stopwatchView.tapResume();
            stopwatchView.wait(0.2);

            expect(stopwatchView.getDisplayedTime()).not.to.equal('00:00.00');
            expect(stopwatchView.getDisplayedTime()).not.to.equal(firstTime);

            stopwatchView.tapPause();
            stopwatchView.tapReset();
            expect(stopwatchView.getDisplayedTime()).to.equal('00:00.00');
        });
    });
});
