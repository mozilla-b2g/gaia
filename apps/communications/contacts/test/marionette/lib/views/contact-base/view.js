'use strict';

/* global module */

var ContactsBaseAccessor = require('./accessors');

function ContactsBaseView(client) {
	this.client = client;
	this.accessors = new ContactsBaseAccessor(client);
}

ContactsBaseView.prototype = {

	//TO-DO: ADD THIS TO A CONTACT VIEW BASE CLASS
	backToList: function() {
    	this.waitForFadeIn(this.accessors.detailsSelector);
    	var header = this.client.helper.waitForElement(
    	this.accessors.detailsHeaderSelector);
    	this.client.loader.getActions().wait(0.5).tap(header, 10, 10).perform();
    	var listSelector = this.accessors.listSelector;
    	this.waitSlideLeft(listSelector);
	},

	waitSlideLeft: function(selector) {
		var element = this.client.findElement(selector),
        location;
    	var waitUntilPanelReachedLeftBorder = function() {
      	location = element.location();
      	return location.x <= 0;
    	};
    	this.client.waitFor(waitUntilPanelReachedLeftBorder);
	},


	waitForFadeIn: function(selector) {
		var element = this.client.findElement(selector);
		var waitSElement = function() {
			var opacity = element.cssProperty('opacity');
			var pointerEvents = element.cssProperty('pointer-events');
			return opacity == 1 && pointerEvents == 'auto';
		};
    	this.client.waitFor(waitSElement);
  	}


};

module.exports = ContactsBaseView;