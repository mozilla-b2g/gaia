'use strict';

/* global module */
var SELECTORS = Object.freeze({
	detailsFavoriteButton: '#toggle-favorite',
	detailsHeader: '#details-view-header',
	details: '#view-contact-details',
	list: '#view-contacts-list'
});

function ContactsDetailsAccessor(client) {
	this.client = client;
}

ContactsDetailsAccessor.prototype = {
	get favoritesButton() {
		return this.client.helper.waitForElement(
		SELECTORS.detailsFavoriteButton);
	},

	get detailsHeader() {
		return this.client.helper.waitForElement(
		SELECTORS.detailsHeader);
	},

	get listSelector () {
	 	return SELECTORS.list;
	 }, 

	 get detailsSelector () {
	 	return SELECTORS.details;
	 },

	 get detailsHeaderSelector () {
	 	return SELECTORS.detailsHeader;
	 }
};

module.exports = ContactsDetailsAccessor;