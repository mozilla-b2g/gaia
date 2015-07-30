'use strict';
/* global contacts */
/* global utils */
/* global Matcher */

(function() {
  var CHUNK_SIZE = 5;

  window.ContactsImporter = function(pContacts, pAccessToken, pConnector) {
    /* jshint validthis:true */

    this.contacts = Object.keys(pContacts);
    var contactsHash = pContacts;
    var access_token = pAccessToken;
    var total = this.contacts.length;

    var self = this;
    var serviceConnector = pConnector;
    var numImported = 0;

    var mustHold = false;
    var holded = false;
    var mustFinish = false;

    var isOnLine = navigator.onLine;

    // To count the number of merged duplicate contacts
    var numMergedDuplicated = 0;

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
      var req = navigator.mozContacts.save(
        utils.misc.toMozContact(deviceContact));

      req.onsuccess = successCb;
      req.onerror = errorCb;
    }

    function pictureReady(blobPicture) {
      var serviceContact = this;

      var done = function() {
        var deviceContact = self.adapt(serviceContact);
        self.persist(deviceContact, contactSaved.bind(serviceContact),
                     contactSaveError);
      };

      // Photo is assigned to the service contact as it is needed by the
      // Fb Connector
      if (!blobPicture) {
        done();
        return;
      }

      utils.thumbnailImage(blobPicture, function gotThumbnail(thumbnail) {
        if (blobPicture !== thumbnail) {
          serviceContact.photo = [blobPicture, thumbnail];
        } else {
          serviceContact.photo = [blobPicture];
        }
        done();
      });
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
      numMergedDuplicated = 0;

      mustHold = false;
      holded = false;
      mustFinish = false;
      importContacts(numImported);
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
        importContacts(numImported);
      }, 0);
    };

    // This method might be overritten
    this.persist = function(contactData, successCb, errorCb) {
      var cbs = {
        onmatch: function(matches) {
          numMergedDuplicated++;

          contacts.adaptAndMerge(this, matches, {
            success: successCb,
            error: errorCb
          });
        }.bind(utils.misc.toMozContact(contactData)),
        onmismatch: function() {
          saveMozContact(this, successCb, function onMismatchError(evt) {
            errorCb(evt.target.error);
          });
        }.bind(contactData)
      };

      // Try to match and if so merge is performed
      Matcher.match(contactData, 'passive', cbs);
    };

    // This method might be overwritten
    this.adapt = function(serviceContact) {
      return serviceConnector.adaptDataForSaving(serviceContact);
    };

    function importContacts(from) {
      for (var i = from; i < from + CHUNK_SIZE && i < total; i++) {
        importContact(i);
      }
    }

    function importContact(index) {
      var serviceContact = contactsHash[self.contacts[index]];
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

    function notifySuccess() {
      if (typeof self.onsuccess === 'function') {
        window.setTimeout(function do_success() {
          self.onsuccess(numImported, numMergedDuplicated);
        }, 0);
      }
    }

    function continueCb() {
      numImported++;
      var next = numImported + CHUNK_SIZE - 1;
      if (next < total) {
        if (!mustHold && !mustFinish) {
          importContact(next);
        }
        else if (mustFinish && !holded) {
          notifySuccess();
        }

        if (mustHold) {
          holded = true;
        }
      }
      else if (numImported >= total) {
        // End has been reached
        notifySuccess();
      }
    }
  };
})();
