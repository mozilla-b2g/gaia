'use strict';

/* global module */
var SELECTORS = Object.freeze({
	details: '#view-contact-details',
	detailsFavoriteButton: '#toggle-favorite',
	detailsHeader: '#details-view-header',
	detailsCoverImage: '#cover-img',
	detailsShareButton: '#contact-detail-inner #share_button',
	list: '#view-contacts-list',
	systemMenu: 'form[data-z-index-level="action-menu"]'
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
	 },

	 get detailsCoverImage () {
	 	return SELECTORS.detailsCoverImage;
	 },

	 get detailsShareButton () {
	 	return SELECTORS.detailsShareButton;
	 },

	 get systemMenu () {
	 	return SELECTORS.systemMenu;
	 }
};

module.exports = ContactsDetailsAccessor;