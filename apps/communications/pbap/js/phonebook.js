'use strict';
/* jshint nonew: false */

(function (exports) {
  function PbapPhonebook() {
    this.ctsMan = navigator.mozContacts;
  }

  /*
      Generate a vcard list in XML format.
  */
  function generateVcardList(cacheList) {
    function getCardLine(handle, name) {
      return '<card handle = "' + handle + '" name = "' + name + '"/>';
    }

    return new Promise((resolve, reject) => {
      const XML_HEADER = '<?xml version="1.0"?>\n' +
      '<!DOCTYPE vcard-listing SYSTEM "vcard-listing.dtd">\n' +
      '<vCard-listing version="1.0">\n';
      const XML_FOOTER = '</vCard-listing>\n';

      var lines = [];
      var count = 0;
      cacheList.forEach((item) => {
        var handle = count++ + '.vcf';
        lines.push(getCardLine(handle, item.name));
      });
      var content = XML_HEADER + lines.join('\n') + '\n' + XML_FOOTER;
      resolve({
        xml: content,
        size: cacheList.length
      });
    });
  }

  PbapPhonebook.prototype = {
    /*
        Generate a XML format list for the request from PBAP client.
    */
    pullVcardListing: function (request) {
      /*
      Request Example from PBAP:
      {
        target: BluetoothAdapter,
        isTrusted: true,
        name: "pb",
        order: "indexed", //"alphabetical", "indexed"(default), "phonetical"
        searchValue: "",
        searchKey: "name", //"name", "number", "sound"
        maxListCount: 0,
        listStartOffset: 0,
        vcardSelector: Array[0],
        vcardSelectorOperator: "OR",
        handle: BluetoothPbapRequestHandle
      }
      */
      return new Promise((resolve, reject) => {
        var filters = {};
        this.sortAllContacts(filters).then((contacts) => {
          resolve(contacts);
        });
      }).then((contacts) => {
        return this.generateListingCache(contacts);
      }).then((cacheList) => {
        return generateVcardList(cacheList);
      });
    },

    /*
        Generate a contacts list for matching ID <-> Name easier.
    */
    generateListingCache: function (contacts) {
      return new Promise((resolve, reject) => {
        this._listingCache = [];
        contacts.forEach((item) => {
          var cacheItem = {};
          cacheItem.name = item.familyName + ';' + item.givenName;
          cacheItem.ctsId = item.id;
          this._listingCache.push(cacheItem);
        });
        resolve(this._listingCache);
      });
    },

    /*
        Get a specific vcard by assigned ID.
    */
    pullVcardEntry: function (request) {
      var handleId = request.name.replace(/\.vcf$/i, '');
      if (!this._listingCache[handleId]) {
        return Promise.resolve(null);
      }
      var ctsId = this._listingCache[handleId].ctsId;
      var filter = {
        filterBy: ['id'],
        filterValue: ctsId,
        filterOp: 'equals'
      };
      return new Promise((resolve, reject) => {
        var request = this.ctsMan.find(filter);
        request.onsuccess = function () {
          resolve(request.result);
        };
        request.onerror = function (error) {
          console.error('PBAP', 'Phonebook error: ', error);
          reject(error);
        };
      });
    },

    /*
        Sort and filter the records based on the filter provided by BT profile.
      In this prototype, all contacts will be retrieved.
    */
    sortAllContacts: function (filters) {
      return new Promise((resolve, reject) => {
        filters = filters || {};
        var contacts = [];
        var request = this.ctsMan.getAll(filters);
        request.onsuccess = function () {
          if (this.result) {
            contacts.push(this.result);
            this.continue();
          } else {
            resolve(contacts);
          }
        };
        request.onerror = function (error) {
          console.error('PBAP', 'Phonebook error: ', error);
          reject(error);
        };
      });
    }
  };

  exports.PbapPhonebook = PbapPhonebook;
}(window));
