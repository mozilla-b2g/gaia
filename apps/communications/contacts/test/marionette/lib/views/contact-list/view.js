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

	goToContact: function() {
		this.firstContact.tap();
		var ContactsBaseView = require('../contact-base/view');
		var contactsBaseView = new ContactsBaseView(this.client);
		contactsBaseView.waitSlideLeft(this.accessors.detailsSelector);
		return this._createContactsDetailsView();
	},

	_createContactsDetailsView: function() {
		var ContactsDetailsView = require('../contact-details/view');
		var contactsDetailsView = new ContactsDetailsView(
		this.client);
		return contactsDetailsView;
	}

};

module.exports = ContactsListView;