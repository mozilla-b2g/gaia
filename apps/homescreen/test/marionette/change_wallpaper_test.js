'use strict';

var assert = require('assert');
var HomeScreen = require('./lib/homescreen');
var Actions = require('marionette-client').Actions;

marionette('Change the wallpaper on the homescreen', function() {
    var client  = marionette.client({
        'lockscreen.enabled': false
    });
    var homeScreen = new HomeScreen(client);

    setup(function() {
        client.apps.switchToApp(Homescreen.URL);
    });

    suite('Change the wallpaper of the homescreen', function() {

        test('Longpress the homescreen ', function() {
            client.switchToFrame();
            homeScreen.launch();
            var homeScreenElement = client.findElement('#homescreen[loading-state=false]');
            (new Actions(client)).longPress(homeScreenElement, 1.5).perform();
        });
    });
});
