'use strict';

var Marionette = require('marionette-client');

function View(client) {
    this.client = client.scope({searchTimeout: 5000});
    this.actions = new Marionette.Actions(this.client);
}

View.prototype = {
    findElement: function(selectorObject) {
        return this.client.
        findElement(selectorObject.locator, selectorObject.by);           
    },
    waitForDisplay: function(selectorObject) {
    	var selector = selectorObject;
        var self = this;
        return this.client.waitFor(function () {
            return self.findElement(selector).displayed();
        });
    },
    waitForHide: function() {
        var self = this;
        return this.client.waitFor(function () {
            return !self.displayed();
        });
    },
    tap: function(selectorObject) {
        this.actions.tap(this.findElement(selectorObject)).perform();
    },
    launch: function(origin) {
        var client = this.client;
        client.apps.launch(origin);
        client.apps.switchToApp(origin);

        // Wait for the document body to know we're really 'launched'.
        this.client.helper.waitForElement('body');
    },
    sendKeys: function(selectorObject,string) {
        this.findElement(selectorObject).sendKeys(string);
    },
    switchToSystemApp: function() {
        this.client.switchToFrame();
    }, 
    wait: function(time) {
	   this.actions.wait(time).perform();
    }
};

module.exports = View;
