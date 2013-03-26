'use strict';

(function() {
  var CHUNK_SIZE = 5;

  window.ContactsImporter = function(pContacts, pAccessToken, pConnector) {
    this.contacts = Object.keys(pContacts);
    var contactsHash = pContacts;
    var access_token = pAccessToken;
    var total = this.contacts.length;

    var numResponses = 0;
    var next = 0;
    var self = this;
    var serviceConnector = pConnector;

    function contactSaved(e) {
      var cfdata = this;
      if (typeof self.oncontactimported === 'function') {
        window.setTimeout(function() {
          self.oncontactimported(cfdata);
        }, 0);
      }
      continueCb();
    }

    function contactSaveError(e) {
      window.console.error('Error while importing contact: ',
                           e.target.error.name);

      if (typeof self.onerror === 'function') {
        window.setTimeout(self.onerror.bind(null, e.target.error), 0);
      }
      continueCb();
    }

    function saveMozContact(deviceContact, successCb, errorCb) {
      var mzContact = new mozContact();
      mzContact.init(deviceContact);

      var req = navigator.mozContacts.save(deviceContact);

      req.onsuccess = successCb;
      req.onerror = errorCb;
    }

    function pictureReady(blobPicture) {
      // Photo is assigned to the service contact as it is needed by the
      // Fb Connector
      if (blobPicture) {
        this.photo = [blobPicture];
      }
      var deviceContact = self.adapt(this);

      self.persist(deviceContact, contactSaved.bind(this), contactSaveError);
    }

    function pictureError() {
      window.console.error('Error while getting picture for contact: ',
                           this.user_id);
      self.persist(self.adapt(this), contactSaved.bind(this), contactSaveError);
    }

    function pictureTimeout() {
      window.console.warn('Timeout while getting picture for contact: ',
                           this.user_id);
      self.persist(self.adapt(this), contactSaved.bind(this),
                   contactSaveError);
    }

    this.start = function() {
      importContacts(next);
    };

    // This method might be overritten
    this.persist = function(contactData, successCb, errorCb) {
      saveMozContact(contactData, successCb, errorCb);
    };

    // This method might be overwritten
    this.adapt = function(serviceContact) {
      return serviceConnector.adaptDataForSaving(serviceContact);
    };

    function importContacts(from) {
      for (var i = from; i < from + CHUNK_SIZE && i < total; i++) {
        var serviceContact = contactsHash[self.contacts[i]];
        // We need to get the picture
        var callbacks = {
          success: pictureReady.bind(serviceContact),
          error: pictureError.bind(serviceContact),
          timeout: pictureTimeout.bind(serviceContact)
        };

        serviceConnector.downloadContactPicture(serviceContact,
                                             access_token, callbacks);
      }
    }

    function continueCb() {
      next++;
      numResponses++;
      if (next < total && numResponses === CHUNK_SIZE) {
        numResponses = 0;
        importContacts(next);
      }
      else if (next >= total) {
        // End has been reached
        if (typeof self.onsuccess === 'function') {
          window.setTimeout(self.onsuccess, 0);
        }
      }
    }
  };
})();
