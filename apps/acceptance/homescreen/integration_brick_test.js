
'use script';
var Homescreen = require('./regions/homescreen');
var HomescreenFlows = require('./flows/homescreenFlows');
var View = require('../lib/view');
var should = require('chai').should;
var expect = require('chai').expect;
var assert = require('chai').assert;

marionette('Homescreen Integration Suite', function(){
    var client;
    var homeScreenFlow;
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
        app = new Homescreen(client);
        app.launch();
        homeScreenFlow = new HomescreenFlows(client);

    });
    suite('Brick Test', function() {
        test('Verify Homescreen Visible', function() {
            homeScreenFlow.verifyHomescreen();
        });
    });
});

