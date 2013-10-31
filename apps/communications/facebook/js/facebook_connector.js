if (!window.FacebookConnector) {
  window.FacebookConnector = (function() {

    var nextUpdateTime;
    window.fb = window.fb || {};
    fb.operationsTimeout = parent.config ?
                                        parent.config.operationsTimeout : null;

    // Only one instance in order to reuse it for saving friends in the
    // database. If the instance is not released between transactions, new
    // objects will be created.
    var reusedFbContact = new fb.Contact();
    reusedFbContact.ready = true;

    function createFbImporter(clist, access_token) {
      var out = new window.ContactsImporter(clist, access_token, this);

      out.persist = persistFbData;

      return out;
    }

    function persistFbData(data, successCb, errorCb, options) {
      var saveCbs = {
        success: function(e) {
          if (options === 'not_match') {
            successCb();
            return;
          }

          var cbs = {
            onmatch: function(matches) {
              // For each of the matching contacts link with the just imported
              Object.keys(matches).forEach(function(aMatchId) {
                var fbContact = new
                                  fb.Contact(matches[aMatchId].matchingContact);

                var mozContReq = fb.utils.getMozContact(data.uid);

                mozContReq.onsuccess = function() {
                  var linkParams = {
                    uid: data.uid,
                    mozContact: mozContReq.result
                  };
                  if (Array.isArray(data.photo) && data.photo[0]) {
                    linkParams.photoUrl = data.pic_big;
                  }
                  var req = fbContact.linkTo(linkParams);

                  req.onsuccess = successCb;

                  req.onerror = function error(e) {
                    window.console.error('Error while automatically linking : ',
                                         aMatchId, data.uid, e.target.name);
                    successCb();
                  };
                };
                mozContReq.onerror = function(e) {
                  window.console.error(
                    'Error getting mozContact data in automatic linking: ',
                                       e.target.error.name);
                  successCb();
                };
              });
            },
            onmismatch: successCb
          };
          // Try to match and if so merge is performed
          contacts.Matcher.match(data, 'passive', cbs);
        },
        error: errorCb
      };
      saveFbContact(data, saveCbs.success, saveCbs.error);
    }


    function saveFbContact(data, successCb, errorCb) {
      var fbContact, successWrapperCb;

      if (reusedFbContact.ready) {
        reusedFbContact.ready = null;
        fbContact = reusedFbContact;
        successWrapperCb = function onsuccess(e) {
          reusedFbContact.ready = true;
          successCb(e);
        };
      } else {
        fbContact = new fb.Contact();
        successWrapperCb = successCb;
      }

      fbContact.setData(data);

      var req = fbContact.save();
      req.onsuccess = successWrapperCb;
      req.onerror = errorCb;
    }

    function setInfraForSync(existingContacts, friendsImported, callback) {
      // Check wether we need to set the update alarm
      window.asyncStorage.getItem(fb.utils.ALARM_ID_KEY, function(data) {
        if (!data || (existingContacts && existingContacts.length === 0) &&
            !friendsImported) {
          // This is the first contact imported
          fb.utils.setLastUpdate(nextUpdateTime, function() {
            var req = fb.sync.scheduleNextSync();
            if (typeof callback === 'function') {
              req.onsuccess = callback;
            }
          });
        }
      });
    }

    var UID_FILTER_IDX = 5;
    var acc_tk;

    function buildFriendQuery(uid) {
      var aquery1 = [].concat(FRIENDS_QUERY);
      aquery1[UID_FILTER_IDX] = '= ' + uid;

      return aquery1.join('');
    }

    // Query that retrieves the information about friends
    var FRIENDS_QUERY = [
      'SELECT uid, name, first_name, last_name, pic_big, current_location, ' ,
      'middle_name, birthday_date, email, profile_update_time, ' ,
      ' work, phones, hometown_location' ,
      ' FROM user' ,
      ' WHERE uid ',
      'IN (SELECT uid1 FROM friend WHERE uid2=me())' ,
      ' ORDER BY ',
      'first_name'
    ];

    var friendsQueryStr = FRIENDS_QUERY.join('');

    function contactDataLoaded(options, response) {
      if (!response.error) {
        // Just in case this is the first contact imported
        nextUpdateTime = Date.now();
        var photoTimeout = false;

        var friend = response.data[0];
        if (friend) {
          var out1 = self.adaptDataForShowing(friend);
          var photoCbs = {};

          photoCbs.success = (function(blobPicture) {
            if (blobPicture) {
              out1.photo = [blobPicture];
            }

            var success = this.success;
            var data = self.adaptDataForSaving(out1);
            persistFbData(data, function() {
                                      success({
                                        uid: friend.uid,
                                        url: friend.pic_big
                                      });
                                }, this.error, options);

            // If there is no an alarm set it has to be set
            window.asyncStorage.getItem(fb.utils.ALARM_ID_KEY, function(data) {
              if (!data) {
                fb.utils.setLastUpdate(nextUpdateTime,
                                       fb.sync.scheduleNextSync);
              }
            });
          }).bind(this); // successCb

          self.downloadContactPicture(friend, acc_tk, photoCbs);
        } // if friend
        else {
          window.console.error('FB: No Friend data found');
          this.error('No friend data found');
        }
      }
      else {
        this.error(response.error);
      }
    }

    function FacebookConnector() { }

    FacebookConnector.prototype = {
      listAllContacts: function(access_token, callbacks, options) {
        if (options && options.orderBy === 'lastName') {
          FRIENDS_QUERY[FRIENDS_QUERY.length] = 'last_name';
          friendsQueryStr = FRIENDS_QUERY.join('');
        }
        return fb.utils.runQuery(friendsQueryStr, {
          success: callbacks.success,
          error: callbacks.error,
          timeout: callbacks.timeout
        },access_token);
      },

      listDeviceContacts: function(callbacks) {
        // Dummy implementation for the time being
        var req = fb.utils.getAllFbContacts();

        req.onsuccess = function successHandler() {
          callbacks.success(req.result);
        };
        req.onerror = callbacks.error;
      },

      getImporter: function(contactsList, access_token) {
        return createFbImporter.bind(this)(contactsList, access_token);
      },

      // Imports a Contact to FB indexedDB private database
      importContact: function(uid, access_token, callbacks, options) {
        acc_tk = access_token;
        var oneFriendQuery = buildFriendQuery(uid);
        var auxCallbacks = {
          success: contactDataLoaded.bind(callbacks, options),
          error: callbacks.error,
          timeout: callbacks.timeout
        };
        fb.utils.runQuery(oneFriendQuery, auxCallbacks, access_token);
      },

      cleanContacts: function(contactsList, mode, cb) {
        if (mode === 'update') {
          var cleaner = new fb.utils.FbContactsCleaner(contactsList, mode);
          window.setTimeout(cleaner.start, 0);
          cb(cleaner);
        }
        else {
          // Mode === clear
          var req = fb.utils.clearFbData();
          req.onsuccess = function() {
            cb(req.result);
          };

          req.onerror = function(e) {
            window.console.error('Error while starting cleaning: ',
                               e.target.error.name);
            // Notifying the UI importer to show an error to the user
            // As we cannot get a cleaner the param is set to null
            cb(null);
          };
        }
      },

      adaptDataForShowing: function(source) {

        var box = importUtils.getPreferredPictureBox();
        var picWidth = box.width;
        var picHeight = box.height;

        var out = fb.friend2mozContact(source);
        out.contactPictureUri = 'https://graph.facebook.com/' +
                                  source.uid + '/picture?type=square' +
                                  '&width=' + picWidth +
                                  '&height=' + picHeight;
        return out;
      },

      adaptDataForSaving: function fbAdapt(cfdata) {
        var worksAt = fb.getWorksAt(cfdata);
        var address = fb.getAddresses(cfdata);

        var birthDate = null;
        if (cfdata.birthday_date && cfdata.birthday_date.length > 0) {
          birthDate = fb.getBirthDate(cfdata.birthday_date);
        }

        var fbInfo = {
          bday: birthDate,
          org: [worksAt]
        };

        if (address) {
          fbInfo.adr = address;
        }

        // This is the short telephone number to enable indexing
        if (cfdata.shortTelephone) {
          fbInfo.shortTelephone = cfdata.shortTelephone;
          delete cfdata.shortTelephone;
        }

        // Check whether we were able to get the photo or not
        fbInfo.url = [];

        if (cfdata.photo) {
          fbInfo.photo = cfdata.photo;
          if (cfdata.pic_big) {
            // The URL is stored for synchronization purposes
            fb.setFriendPictureUrl(fbInfo, cfdata.pic_big);
          }
          delete cfdata.photo;
        }
        // Facebook info is set and then contact is saved
        cfdata.fbInfo = fbInfo;

        return cfdata;
      },

      // It would allow to know the UID of a service contact already imported
      // on the device. That is needed by the generic importer, for live
      // a dummy implementation as we are currently not supporting updates
      getContactUid: function(deviceContact) {
        return fb.getFriendUid(deviceContact);
      },

      get name() {
        return 'facebook';
      },

      get automaticLogout() {
        return false;
      },

      downloadContactPicture: function(contact, access_token, callbacks) {
        return fb.utils.getFriendPicture(contact.uid, callbacks.success,
                        access_token, importUtils.getPreferredPictureDetail());
      },

      oncontactsloaded: function(lfriends) {
        // This is the timestamp for later syncing as it set at the time
        // when data was ready
        nextUpdateTime = Date.now();
        // Now caching the number
        fb.utils.setCachedNumFriends(lfriends.length);
      },

      oncontactsimported: function(existingContacts, friendsImported, cb) {
        setInfraForSync(existingContacts, friendsImported, cb);
        fb.contacts.flush();
      },

      startSync: function(existingContacts, myFriendsByUid, syncFinished) {
        var callbacks = {
          success: syncFinished
        };
        fb.sync.startWithData(existingContacts, myFriendsByUid, callbacks);
      },

      scheduleNextSync: function() {
        fb.sync.scheduleNextSync();
      }
    };
    var self = new FacebookConnector();

    return self;
  })();
}
