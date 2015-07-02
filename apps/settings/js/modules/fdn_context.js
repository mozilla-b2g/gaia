/**
 * FdnContext is a module that you can easily fetch out FDN related info.
 *
 * @module FdnContext
 */
define(function() {
  'use strict';

  var FdnContext = {
    /**
     * cached fdnContacts
     *
     * @type {Array}
     */
    _fdnContacts: [],

    /**
     * internal function to help us clone object
     *
     * @param {Object} obj
     */
    _cloneObject: function(obj) {
      return JSON.parse(JSON.stringify(obj));
    },

    /**
     * we can use this method to get wrapped contacts information.
     *
     * @param {Number} cardIndex
     * @type {Function}
     * @return {Promise}
     */
    getContacts: function(cardIndex) {
      var promise = new Promise((resolve, reject) => {
        var iccId = navigator.mozMobileConnections[cardIndex].iccId;

        if (!iccId) {
          console.log('can\'t get right iccId');
          reject();
        }

        var icc = navigator.mozIccManager.getIccById(iccId);
        if (!icc) {
          console.log('Could not retrieve ICC object');
          reject();
        }

        var request = icc.readContacts('fdn');

        request.onerror = (error) => {
          console.log('we got error when reading contacts from icc');
          console.log(error);
          reject();
        };

        request.onsuccess = () => {
          var result = this._fdnContacts[cardIndex] = request.result;
          var contacts = [];
          for (var i = 0, l = result.length; i < l; i++) {
            contacts.push({
              id: i,
              name: result[i].name || '',
              number: result[i].tel[0].value || ''
            });
          }
          resolve(contacts);
        };
      });

      return promise;
    },

    /**
     * This function returns a FDN contact object matching the
     * requested action.
     *
     * mozIccManager.updateContact works like this:
     *   - no id: create a new contact
     *   - existing id + name and number: update a contact
     *   - existing id + empty name and number: remove a contact
     *
     * @type {Function}
     * @param {String} action
     * @param {Number} options.cardIndex
     * @param {Object} options.contact
     * @return {mozContact}
     */
    createAction: function(action, options) {
      var simContact = {};
      var cardIndex = options.cardIndex;
      var contact = options.contact;
      switch (action) {
        case 'add':
          simContact.name = [contact.name];
          simContact.tel = [{
            value: contact.number
          }];
          break;
        case 'edit':
          simContact =
            this._cloneObject(this._fdnContacts[cardIndex][contact.id]);
          simContact.name[0] = contact.name;
          simContact.tel[0].value = contact.number;
          break;
        case 'remove':
          simContact =
            this._cloneObject(this._fdnContacts[cardIndex][contact.id]);
          simContact.name[0] = '';
          simContact.tel[0].value = '';
          break;
      }

      var result = new window.mozContact(simContact);
      if ('id' in simContact) {
        result.id = simContact.id;
      }

      return result;
    }
  };

  return FdnContext;
});
