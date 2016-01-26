'use strict';

/* global module */

var ContactsDetailsAccessor = require('./accessors');

function ContactsDetailsView(client) {
	this.client = client;
	this.accessors = new ContactsDetailsAccessor(client);
}

ContactsDetailsView.prototype = {
	makeFavorited: function() {
		this.accessors.favoritesButton.tap();
		return this.waitForFavorited;
	},

	waitForFavorited: function() {
		function waitFav(temp) {
        	return temp.detailsHeader.getAttribute('class'
        	).indexOf('favorite') != -1;
      	}
      	this.client.waitFor(waitFav(this.accessors));
	},

	backToList: function() {
    	this.waitForFadeIn(this.client.helper.waitForElement(
    	this.accessors.detailsSelector));
    	var header = this.client.helper.waitForElement(
    	this.accessors.detailsHeaderSelector);
    	this.client.loader.getActions().wait(0.5).tap(header, 10, 10).perform();
    	this.waitSlideLeftList();
	},

	waitSlideLeftList: function() {
		var element = this.client.findElement(
		this.accessors.listSelector),
        location;
    	var test = function() {
      	location = element.location();
      	return location.x <= 0;
    	};
    	this.client.waitFor(test);
	},

	waitForFadeIn: function(element) {
    	var test = function() {
      		var opacity = element.cssProperty('opacity');
      		var pointerEvents = element.cssProperty('pointer-events');
			return opacity == 1 && pointerEvents == 'auto';
    	};
    	this.client.waitFor(test);
  	},

	backtoContactsList: function() {
		this.backToList();
		var ContactsListView = require('../contact-list/view');
		var contactsListView = new ContactsListView(this.client);
		contactsListView.accessors.firstFavorite;
		return contactsListView;
	},

	waitForCoverImage: function() {
		return this.client.helper.waitForElement(
		this.accessors.detailsCoverImage);
	},

	tapDetailsShareButton: function() {
		this.client.helper.waitForElement(
		this.accessors.detailsShareButton).tap();
	},

	subjectSystemMenu: function() {
		this.client.switchToFrame();
    	return this.client.helper.waitForElement(this.accessors.systemMenu);
	}

};

module.exports = ContactsDetailsView;