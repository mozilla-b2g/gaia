
'use script';
var Alarm = require('./regions/alarm');
var AlarmFlows = require('./flows/alarm_flows');
var View = require('../lib/view');
var should = require('chai').should;
var expect = require('chai').expect;
var assert = require('chai').assert;

marionette('Clock Acceptence Suite', function(){
    var client;
    var alarmFlow;
    var app;
    client = marionette.client({
        prefs: {
            // we need to disable the keyboard to avoid intermittent failures on
            // Travis (transitions might take longer to run and block UI)
            'dom.mozInputMethod.enabled': false,
            // Do not require the B2G-desktop app window to have focus (as per the
            // system window manager) in order for it to do focus-related things.
            'focusmanager.testmode': true
        },
        settings: {
            'ftu.manifestURL': null,
            'lockscreen.enabled': false
        }
    });
    setup(function() {
        app = new Alarm(client);
        app.launch();
        alarmFlow = new AlarmFlows(client);

    });
    suite('my first suites', function() {
        test('Always pass', function() {
            alarmFlow.setNewAlarm();
            expect(true).to.be.true
        });
    });
});
