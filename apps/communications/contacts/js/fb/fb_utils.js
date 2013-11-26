'use strict';

var fb = window.fb || {};
window.fb = fb;

  (function(document) {
    var Utils = fb.utils || {};
    fb.utils = Utils;

    var TIMEOUT_QUERY = fb.operationsTimeout;
    var FRIEND_COUNT_QUERY = 'select friend_count from user where uid=me()';

    var CACHE_FRIENDS_KEY = Utils.CACHE_FRIENDS_KEY = 'numFacebookFriends';
    var LAST_UPDATED_KEY = Utils.LAST_UPDATED_KEY = 'lastUpdatedTime';
    Utils.ALARM_ID_KEY = 'nextAlarmId';

    function getContact(contact) {
      return (contact instanceof mozContact) ?
        contact : new mozContact(contact);
    }

    var REDIRECT_LOGOUT_URI = window.oauthflow ?
      oauthflow.params.facebook['redirectLogout'] : '';
    var STORAGE_KEY = Utils.TOKEN_DATA_KEY = 'tokenData';

      // For controlling data synchronization
    Utils.setLastUpdate = function(value, cb) {
      window.asyncStorage.setItem(LAST_UPDATED_KEY, {
        data: value
      }, cb);
    };

    Utils.getLastUpdate = function(callback) {
      window.asyncStorage.getItem(LAST_UPDATED_KEY, function(obj) {
        var out = 0;
        if (obj) {
          out = obj.data || out;
        }
        if (typeof callback === 'function') {
          callback(out);
        }
      });
    };


    Utils.getContactData = function(cid) {
      var outReq = new Utils.Request();

      var req = navigator.mozContacts.find({
        filterBy: ['id'],
        filterValue: cid,
        filterOp: 'equals'
      });

      req.onsuccess = function(e) {
        if (e.target.result && e.target.result.length > 0) {
          outReq.done(e.target.result[0]);
        }
        else {
          outReq.done(null);
        }
      };

      req.onerror = function(e) {
        outReq.failed(e.target.error);
      };

      return outReq;
    };

    // Returns the mozContact associated to a UID in FB
    Utils.getMozContact = function(uid) {
      var outReq = new Utils.Request();

      window.setTimeout(function get_mozContact_ByUid() {
        fb.getMozContactByUid(uid,
          function onsuccess(e) {
            if (e.target.result && e.target.result.length > 0) {
              outReq.done(e.target.result[0]);
            } else {
              outReq.done(null);
            }
          },
          function onerror(e) {
            outReq.failed(e.target.error);
          }
        );
      }, 0);

      return outReq;
    };

    // Returns the number of mozContacts associated to a UID in FB
    Utils.getNumberMozContacts = function(uid) {
      var outReq = new Utils.Request();

      window.setTimeout(function get_mozContact_ByUid() {
        fb.getMozContactByUid(uid,
          function onsuccess(e) {
            if (e.target.result && e.target.result.length > 0) {
              outReq.done(e.target.result.length);
            } else {
              outReq.done(0);
            }
          },
          function onerror(e) {
            outReq.failed(e.target.error);
          }
        );
      },0);

      return outReq;
    };

    Utils.getAllFbContacts = function() {
      var outReq = new Utils.Request();

      window.setTimeout(function get_all_fb_contacts() {
        var filter = {
          filterValue: fb.CATEGORY,
          filterOp: 'contains',
          filterBy: ['category']
        };

        var req = navigator.mozContacts.find(filter);

        req.onsuccess = function(e) {
          outReq.done(e.target.result);
        };

        req.onerror = function(e) {
          outReq.failed(e.target.error);
        };
      }, 0);

      return outReq;
    };

    // On the device
    Utils.getNumFbContacts = function() {
      var outReq = new Utils.Request();

      window.setTimeout(function get_num_fb_contacts() {
        var req = fb.contacts.getLength();

        req.onsuccess = function() {
          outReq.done(req.result);
        };

        req.onerror = function() {
          outReq.failed(req.error);
        };
      }, 0);

      return outReq;
    };

    // Requests the number remotely
    Utils.getNumFbFriends = function(callback, access_token) {
      fb.utils.runQuery(FRIEND_COUNT_QUERY, callback, access_token);
    };

    Utils.getCachedAccessToken = function(callback) {
      window.asyncStorage.getItem(STORAGE_KEY, function(data) {
        var out = null;

        if (data) {
          out = data.access_token || null;
        }

        if (typeof callback === 'function') {
          callback(out);
        }

      });
    };

    // Obtains the number locally
    Utils.getCachedNumFbFriends = function(callback) {
      window.asyncStorage.getItem(CACHE_FRIENDS_KEY, function(data) {
        if (typeof callback === 'function' && typeof data === 'number') {
          callback(data);
        }
      });
    };

    Utils.setCachedNumFriends = function(value) {
      window.asyncStorage.setItem(CACHE_FRIENDS_KEY, value);
    };


    Utils.getImportChecked = function(callback) {
      // If we have an access token Import should be checked
      Utils.getCachedAccessToken(function(access_token) {
        var out = 'logged-out';

        if (access_token) {
          out = 'logged-in';
        }
        else {
          // In this case is needed to know whether the access_token has
          // been invalidated
          Utils.getCachedNumFbFriends(function(value) {
            if (value) {
              out = 'renew-pwd';
              if (typeof callback === 'function') {
                callback(out);
              }
            }
          });
        }

        if (typeof callback === 'function') {
          callback(out);
        }

      });
    };


    // Obtains the number locally (cached) and tries to get them remotely
    Utils.numFbFriendsData = function(callback) {
      var localCb = callback.local;
      var remoteCb = callback.remote;

      Utils.getCachedNumFbFriends(localCb);

      function auxCallback(response) {
        if (response.data && response.data[0] &&
            response.data[0].friend_count) {
          remoteCb(response.data[0].friend_count);
        }
      }

      if (typeof remoteCb === 'function' && navigator.onLine === true) {
        var remoteCallbacks = {
          success: auxCallback,
          error: null,
          timeout: null
        };
        Utils.getCachedAccessToken(function(access_token) {
          if (access_token) {
            Utils.getNumFbFriends(remoteCallbacks, access_token);
          }
        });
      }
    };

    // Clears all Fb data (use with caution!!)
    Utils.clearFbData = function() {
      // First step all Contacts which are FB Friends are obtained
      // then those not linked are directly removed
      // Those linked are unlinked

      var outReq = new Utils.Request();

      window.setTimeout(function do_clearFbData() {
        // First a clear request is issued
        var ireq = fb.contacts.clear();

        ireq.onsuccess = function() {
          var req = Utils.getAllFbContacts();

          req.onsuccess = function() {
            var cleaner = new Utils.FbContactsCleaner(req.result, 'clear');
            // And now success notification is sent
            outReq.done(cleaner);
            // The cleaning activity should be starting immediately
            window.setTimeout(cleaner.start, 0);
          };

          req.onerror = function() {
            window.console.error('FB Clean. Error retrieving FB Contacts');
            outReq.failed(req.error);
          };
        };

        ireq.onerror = function(e) {
          window.console.error('Error while clearing the FB Cache');
          outReq.failed(ireq.error);
        };

      },0);

      return outReq;
    };

    Utils.logout = function() {
      var outReq = new Utils.Request();

      window.setTimeout(function do_logout() {
        Utils.getCachedAccessToken(function getAccessToken(access_token) {
          if (access_token) {
            var logoutService = 'https://www.facebook.com/logout.php?';
            var params = [
              'next' + '=' + encodeURIComponent(REDIRECT_LOGOUT_URI),
              'access_token' + '=' + access_token
            ];

            var logoutParams = params.join('&');
            var logoutUrl = logoutService + logoutParams;

            var m_listen = function(e) {
              if (e.origin !== fb.CONTACTS_APP_ORIGIN) {
                return;
              }
              if (e.data === 'closed') {
                window.asyncStorage.removeItem(STORAGE_KEY);
                outReq.done();
              }
              e.stopImmediatePropagation();
              window.removeEventListener('message', m_listen);
            };

            window.addEventListener('message', m_listen);

            var xhr = new XMLHttpRequest({
              mozSystem: true
            });

            xhr.open('GET', logoutUrl, true);
            xhr.responseType = 'json';

            xhr.timeout = TIMEOUT_QUERY;

            xhr.onload = function(e) {
              if (xhr.status === 200 || xhr.status === 0) {
                if (!xhr.response || !xhr.response.success) {
                  window.console.error('FB: Logout unexpected redirect or ' +
                                       'token expired');
                }
                window.asyncStorage.removeItem(STORAGE_KEY);
                outReq.done();
              }
              else {
                window.console.error('FB: Error executing logout. Status: ',
                                     xhr.status);
                outReq.failed(xhr.status.toString());
              }
            };

            xhr.ontimeout = function(e) {
              window.console.error('FB: Timeout!!! while logging out');
              outReq.failed('Timeout');
            };

            xhr.onerror = function(e) {
              window.console.error('FB: Error while logging out',
                                  JSON.stringify(e));
              outReq.failed(e.name);
            };

            xhr.send();
          } // if
          else {
            outReq.done();
          }
        }); // cachedToken
      }, 0); // setTimeout

      return outReq;

    }; // logout


    // FbContactsCleaner Object
    // Mode can be 'update' or 'cleanAll'
    Utils.FbContactsCleaner = function(contacts, pmode) {
      this.lcontacts = contacts;
      var total = contacts.length;
      var next = 0;
      var self = this;
      var CHUNK_SIZE = 5;
      var numResponses = 0;
      var mode = pmode || 'update';
      var mustUpdate = (pmode === 'update');
      var notifyClean = false;

      var mustHold = false;
      var holded = false;
      var mustFinish = false;

      this.start = function() {
        mustHold = holded = mustFinish = false;

        if (total > 0) {
          cleanContacts(0);
        }
        else if (typeof self.onsuccess === 'function') {
          window.setTimeout(self.onsuccess);
        }
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
        mustHold = holded = mustFinish = false;

        window.setTimeout(function resume_clean() {
          cleanContacts(next);
        });
      };

      function successHandler(e) {
        if (notifyClean || typeof self.oncleaned === 'function') {
          notifyClean = true;
          // Avoiding race condition so the cleaned element is cached
          var cleaned = e.target.number;
          window.setTimeout(function() {
            self.oncleaned(cleaned);
          },0);
        }
        continueCb();
      }

      function errorHandler(contactid, error) {
        if (typeof self.onerror === 'function') {
          self.onerror(contactid, error);
        }

        continueCb();
      }

      function cleanContacts(from) {
        for (var idx = from; idx < (from + CHUNK_SIZE) && idx < total; idx++) {
          var contact = contacts[idx];
          var number = idx;
          var req;
          if (fb.isFbLinked(contact)) {
            var fbContact = new fb.Contact(contact);
            req = fbContact.unlink('hard');
          }
          else {
            if (mustUpdate) {
              var fbContact = new fb.Contact(contact);
              req = fbContact.remove();
            }
            else {
              var req = navigator.mozContacts.remove(getContact(contact));
            }
          }
          req.number = number;
          req.onsuccess = successHandler;
          req.onerror = function(e) {
            errorHandler(contact.id, e.target.error);
          };
        }
      }

      function notifySuccess() {
        if (typeof self.onsuccess === 'function') {
          window.setTimeout(self.onsuccess);
        }
      }

      function continueCb() {
        next++;
        numResponses++;
        if (next < total && numResponses === CHUNK_SIZE) {
          numResponses = 0;
          if (!mustHold && !mustFinish) {
            cleanContacts(next);
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
      } // function
    }; // FbContactsCleaner

  })(document);
