'use strict';

/* global module */
var SELECTORS = Object.freeze({
	details: '#view-contact-details',
	detailsHeader: '#details-view-header',
	list: '#view-contacts-list',
});

function ContactsBaseAccessor(client) {
	this.client = client;
}

ContactsBaseAccessor.prototype = {

	get detailsSelector () {
	 	return SELECTORS.details;
	 },

	 get detailsHeaderSelector () {
	 	return SELECTORS.detailsHeader;
	 },

	 get listSelector () {
	 	return SELECTORS.list;
	 }, 

};

module.exports = ContactsBaseAccessor;