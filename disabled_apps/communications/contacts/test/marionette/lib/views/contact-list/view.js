'use strict';

/* global module */

var ContactsListAccessor = require('./accessors');

function ContactsListView(client) {
	this.client = client;
	this.accessors = new ContactsListAccessor(client);
}

ContactsListView.prototype = {
	get firstContact() {
		return this.accessors.firstContact;
	},

	get firstFavorite() {
		return this.accessors.firstFavorite;
	},

	waitSlideLeftDetails: function() {
		var element = this.client.findElement(
		this.accessors.detailsSelector),
        location;
    	var waitUntilPanelReachedLeftBorder = function() {
      	location = element.location();
      	return location.x <= 0;
    	};
    	this.client.waitFor(waitUntilPanelReachedLeftBorder);
	},

	goToContact: function() {
		this.firstContact.tap();
		this.waitSlideLeftDetails();
		return this._createContactsDetailsView();
	},

	_createContactsDetailsView: function() {
		var ContactsDetailsView = require('../contact-details/view');
		var contactsDetailsView = new ContactsDetailsView(
		this.client, this.subject);
		return contactsDetailsView;
	}

};

module.exports = ContactsListView;