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
    var totalImported = 0;

    var mustHold = false;
    var holded = false;
    var mustFinish = false;

    var isOnLine = navigator.onLine;

    window.addEventListener('online', onLineChanged);
    window.addEventListener('offline', onLineChanged);

    function onLineChanged() {
      isOnLine = navigator.onLine;
    }

    function contactSaved(e) {
      var cfdata = this;
      if (typeof self.oncontactimported === 'function') {
        window.setTimeout(function() {
          self.oncontactimported(cfdata);
        }, 0);
      }
      continueCb();
    }

    function contactSaveError(err) {
      window.console.error('Error while importing contact: ', err.name);

      if (typeof self.onerror === 'function') {
        window.setTimeout(self.onerror.bind(null, err), 0);
      }
      continueCb();
    }

    function saveMozContact(deviceContact, successCb, errorCb) {
      var mzContact = new mozContact(deviceContact);

      var req = navigator.mozContacts.save(mzContact);

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
      mustHold = false;
      holded = false;
      mustFinish = false;
      importContacts(next);
    };

    this.hold = function() {
      mustHold = true;
    };

    this.finish = function() {
      mustFinish = true;

      if (holded) {
        notifySuccess();
      }
    };

    this.resume = function() {
      mustHold = false;
      holded = false;
      mustFinish = false;

      window.setTimeout(function resume_import() {
        importContacts(next);
      }, 0);
    };

    // This method might be overritten
    this.persist = function(contactData, successCb, errorCb) {
      var cbs = {
        onmatch: function(matches) {
          contacts.adaptAndMerge(this, matches, {
            success: successCb,
            error: errorCb
          });
        }.bind(new mozContact(contactData)),
        onmismatch: function() {
          saveMozContact(this, successCb, function onMismatchError(evt) {
            errorCb(evt.target.error);
          });
        }.bind(contactData)
      };

      // Try to match and if so merge is performed
      contacts.Matcher.match(contactData, 'passive', cbs);
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

        if (isOnLine === true) {
          serviceConnector.downloadContactPicture(serviceContact,
                                             access_token, callbacks);
        }
        else {
          callbacks.success(null);
        }
      }
    }

    function notifySuccess() {
      if (typeof self.onsuccess === 'function') {
        window.setTimeout(function do_success() {
          self.onsuccess(totalImported);
        }, 0);
      }
    }

    function continueCb() {
      next++;
      numResponses++;
      totalImported++;
      if (next < total && numResponses === CHUNK_SIZE) {
        numResponses = 0;
        if (!mustHold && !mustFinish) {
          importContacts(next);
        }
        else if (mustFinish && !holded) {
          notifySuccess();
        }

        if (mustHold) {
          holded = true;
        }
      }
      else if (next >= total) {
        // End has been reached
        notifySuccess();
      }
    }
  };
})();
