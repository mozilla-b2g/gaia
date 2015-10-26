/*global MozActivity */

(function(exports) {
'use strict';

  /**
   * ActivityPicker
   *
   * A collection of some MozActivity methods.
   */
  var ActivityPicker = {

    /**
     * When user wants to pass a phone call.
     * @param  {Number} contact number where to dial.
     * @returns {Promise} DOMRequest promise is always successfully resolved.
     */
    dial(number) {
      return Promise.resolve(new MozActivity({
        name: 'dial',
        data: {
          type: 'webtelephony/number',
          number: number
        }
      }));
    },

    /**
     * When user wants to send a new Email. The e-mail app can parse mailto 
     * URI strings provided as either a "url" or "URI" property.
     * @param  {String} Email id of receiver.
     * @returns {Promise} DOMRequest promise is always successfully resolved.
     */
    email(email) {
      return Promise.resolve(new MozActivity({
        name: 'new',
        data: {
          type: 'mail',
          URI: 'mailto:' + email
        }
      }));
    },

    /**
     * When user wants to open a URL.
     * @param  {String} URL to be visited.
     * @returns {Promise} DOMRequest promise is always successfully resolved
     */
    url(url) {
      return Promise.resolve(new MozActivity({
        name: 'view',
        data: {
          type: 'url',
          url: url
        }
      }));
    },

    /**
     * When user wants to create a new contact entry.
     * @param  {Object} Contact object.
     * @returns {Promise} DOMRequest promise is always successfully resolved
     */
    createNewContact(contactProps) {
      return Promise.resolve(new MozActivity({
        name: 'new',
        data: {
          type: 'webcontacts/contact',
          params: contactProps
        }
      }));
    },

    /**
     * When user wants to update a contact.
     * @param  {Object} Contact object.
     * @returns {Promise} DOMRequest promise is always successfully resolved
     */
    addToExistingContact(contactProps) {
      return Promise.resolve(new MozActivity({
        name: 'update',
        data: {
          type: 'webcontacts/contact',
          params: contactProps
        }
      }));
    },

    /**
     * When user wants to open a contact.
     * @param  {Object} Contact object.
     * @returns {Promise} DOMRequest promise is always successfully resolved
     */
    viewContact(contactProps) {
      return Promise.resolve(new MozActivity({
        name: 'open',
        data: {
          type: 'webcontacts/contact',
          params: contactProps
        }
      }));
    },

    /**
     * When user wants to configure the messaging setting of device.
     * @returns {Promise} DOMRequest promise is always successfully resolved
     */
    openSettings() {
      return Promise.resolve(new MozActivity({
        name: 'configure',
        data: {
          target: 'device',
          section: 'messaging'
        }
      }));
    }
  };

  exports.ActivityPicker = ActivityPicker;

}(this));
