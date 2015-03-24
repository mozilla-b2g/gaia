'use strict';

var Marionette = require('marionette-client');

function View(client) {
    this.client = client.scope({searchTimeout: 5000});
    this.actions = new Marionette.Actions(this.client);
}

View.prototype = {
    //Get the root element of the app and return it.
    getRootElement: function (rootSelector) {
        return this.client.findElement(rootSelector);
    },
    //From the root, find a child element based on selector.
    findElement: function (rootSelector, elementSelector) {
        return this.getRootElement(rootSelector).findElement(elementSelector);
    },
    //Return whether or not the root element is displayed.
    rootDisplayed: function () {
        return this.getRootElement().displayed();
    },
    //Wait for an element to become visible
    waitForDisplay: function () {
        var self = this;
        return this.client.waitFor(self.displayed)
    },
    //Wait for an element to be hidden
    waitForHide: function () {
        var self = this;
        return this.client.waitFor(function () {
            return !self.displayed();
        });
    },
    //Tap on an element.
    tap: function (rootSelector, elementSelector) {
        this.actions.tap(this.findElement(rootSelector, elementSelector)).perform();
        this.actions.wait(10).perform();
    },
    launch: function (origin) {
        var client = this.client;
        client.apps.launch(origin);
        client.apps.switchToApp(origin);

        // Wait for the document body to know we're really 'launched'.
        this.client.helper.waitForElement('body');
    }
};

module.exports = View;
