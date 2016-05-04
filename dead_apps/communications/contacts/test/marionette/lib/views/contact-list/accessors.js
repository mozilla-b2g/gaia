'use strict';

/* global module */
var SELECTORS = Object.freeze({
	listContactFirstText: 'li:not([data-group="ice"]).contact-item p',
	listFavoritesFirstText: '#contacts-list-favorites .contact-item p',
	details: '#view-contact-details'
});

function ContactsListAccessor(client) {
	this.client = client;
}

ContactsListAccessor.prototype = {
	get firstContact() {
		return this.client.helper.waitForElement(
		SELECTORS.listContactFirstText);
	},

	get firstFavorite() {
		return this.client.helper.waitForElement(
		SELECTORS.listFavoritesFirstText);
	},

	get detailsSelector() {
		return SELECTORS.details;
	}

};

module.exports = ContactsListAccessor;