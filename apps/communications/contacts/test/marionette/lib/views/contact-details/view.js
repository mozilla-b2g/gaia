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
		this.waitForFavorited;
	},

	waitForFavorited: function() {
		var self = this;
      	this.client.waitFor(
      	'waitForHeaderToContainFavoriteClass', function() {
      		return self.accessors.detailsHeader.getAttribute(
   			'class').indexOf('favorite') != -1;
      	});
	},

	backtoContactsList: function() {
		var ContactsBaseView = require('../contact-base/view');
		var contactsBaseView = new ContactsBaseView(this.client);
		contactsBaseView.backToList();
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