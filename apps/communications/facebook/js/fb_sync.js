'use strict';

var fb = window.fb || {};

if (!fb.sync) {
  (function() {
    var Sync = fb.sync = {};

    var theWorker;
    // Facebook contacts currently under update process
    var fbContactsById;

    var totalToChange = 0,
        changed = 0;

    // Next timestamp to be set
    var nextTimestamp;

    var completionCallback,
        errorCallback;

    // Only makes sense when the data from FB is provided to the sync module
    // i.e. it is not the worker which obtains that data
    var fbFriendsDataByUid;

    var logLevel = fb.logLevel || parent.fb.logLevel || 'DEBUG';
    var isDebug = (logLevel === 'DEBUG');

    var alarmFrame = null,
        currentAlarmRequest = null;

    // Delay in closing the iframe that schedules the alarm.
    // Avoiding console.log issues in the logcat
    var DELAY_ALARM_SCHED = 5000;

    function debug() {
      if (isDebug) {
        var theArgs = ['<<FBSync>>'];
        for (var c = 0; c < arguments.length; c++) {
          theArgs.push(arguments[c]);
        }
        window.console.log.apply(this, theArgs);
      }
    }

    // Starts the worker
    function startWorker() {
      theWorker = new Worker('/facebook/js/sync_worker.js');
      theWorker.onmessage = function(e) {
        workerMessage(e.data);
      };
      theWorker.onerror = function(e) {
        window.console.error('Worker Error', e.message, e.lineno, e.column);
        if (typeof errorCallback === 'function') {
          errorCallback({
            type: 'default_error'
          });
        }
      };
    }

    function workerMessage(m) {
      switch (m.type) {
        case 'query_error':
          var error = m.data || {};
          window.console.error('FB: Error reported by the worker',
                                JSON.stringify(error));
          if (typeof errorCallback === 'function') {
            errorCallback({
              name: 'defaultError'
            });
          }
        break;

        case 'token_error':
          debug('FB: Token error reported by the worker');
          if (typeof errorCallback === 'function') {
            errorCallback({
              name: 'invalidToken'
            });
          }
        break;

        case 'timeout_error':
          debug('Timeout error reported by the worker');
          if (typeof errorCallback === 'function') {
            errorCallback({
              name: 'timeout'
            });
          }
        break;

        case 'trace':
          debug(m.data);
        break;

        case 'friendRemoved':
          removeFbFriend(m.data.contactId);
        break;

        case 'friendUpdated':
          updateFbFriend(m.data.contactId,
                         fb.friend2mozContact(m.data.updatedFbData));
        break;

        // Message with the totals
        case 'totals':
          changed = 0;
          totalToChange = m.data.totalToChange;
          nextTimestamp = m.data.queryTimestamp;

          debug('Total to be changed: ', totalToChange);

          // If totals === 0 then the completion callback will be invoked
          checkTotals();
        break;

        case 'friendImgReady':
          debug('Friend Img Data ready: ', m.data.contactId);
          updateFbFriendWhenImageReady(m.data);
        break;
      }
    }

    function updateFbFriendWhenImageReady(data) {
      var contact = fbContactsById[data.contactId];
      var uid = fb.getFriendUid(contact);
      var updatedFbData = fbFriendsDataByUid[uid];

      if (!data.photo) {
        updateFbFriend(data.contactId, updatedFbData);
        return;
      }

      utils.thumbnailImage(data.photo, function gotTumbnail(thumbnail) {
        var fbInfo = {};
        fbInfo.photo = [data.photo, thumbnail];
        fb.setFriendPictureUrl(fbInfo, updatedFbData.pic_big);
        updatedFbData.fbInfo = fbInfo;

        updateFbFriend(data.contactId, updatedFbData);
      });
    }

    function onsuccessCb() {
      changed++;
      checkTotals();
    }

    // Updates the FB data from a friend
    function updateFbFriend(contactId, cfdata) {
      fb.friend2mozContact(cfdata);

      cfdata.fbInfo = cfdata.fbInfo || {};

      cfdata.fbInfo.org = [fb.getWorksAt(cfdata)];
      var birthDate = null;
      if (cfdata.birthday_date && cfdata.birthday_date.length > 0) {
        birthDate = fb.getBirthDate(cfdata.birthday_date);
      }
      cfdata.fbInfo.bday = birthDate;

      var address = fb.getAddresses(cfdata);
      if (address) {
        cfdata.fbInfo.adr = address;
      }

      if (cfdata.shortTelephone) {
        cfdata.fbInfo.shortTelephone = cfdata.shortTelephone;
        delete cfdata.shortTelephone;
      }

       // Then the new data saved to the cache
      var fbContact = new fb.Contact(fbContactsById[contactId]);
      var fbReq = fbContact.update(cfdata);

      // Nothing special
      fbReq.onsuccess = function() {
        debug('Friend updated correctly', cfdata.uid);
        onsuccessCb();
      };

      // Error. mark the contact as pending to be synchronized
      fbReq.onerror = function() {
        window.console.error('FB: Error while saving contact data: ',
                             cfdata.uid);
        changed++;
        checkTotals();
      };
    }

    function removeFbFriend(contactId) {
      debug('Removing Friend: ', contactId);

      var removedFriend = fbContactsById[contactId];

      var fbContact = new fb.Contact(removedFriend);

      if (fb.isFbLinked(removedFriend)) {
        debug('Friend is linked: ', contactId);
        // No care about what happens
        var req = fbContact.unlink('hard');
        req.onsuccess = onsuccessCb;

        req.onerror = function() {
          window.console.error('FB. Error while hard unlinking friend: ',
                               contactId);
          // The counter has to be increased anyway
          changed++;
          checkTotals();
        };
      }
      else {
        debug('Friend is not linked: ', contactId);
        var req = fbContact.remove();
        req.onsuccess = onsuccessCb;
        req.onerror = function() {
          window.console.error('FB. Error while removing contact: ',
                               contactId);
          // The counter has to be increased anyway
          changed++;
          checkTotals();
        };
      }
    }

    function checkTotals() {
      if (changed === totalToChange) {
        debug('Sync process finished!');

        if (window.contacts && window.contacts.List) {
          window.setTimeout(window.contacts.List.load, 0);
        }

        // Once sync has finished the last update date is set
        // Thus we ensure next will happen in the next <period> hours
        fb.utils.setLastUpdate(nextTimestamp, function sync_end() {
          completionCallback(totalToChange);
        });

        if (theWorker) {
          theWorker.terminate();
          theWorker = null;
        }
      }
    }


    // Starts a synchronization
    Sync.start = function(params) {
      if (params) {
        completionCallback = params.success;
        errorCallback = params.error;
      }

      totalToChange = 0;
      changed = 0;

      // First only take into account those Friends already on the device
      // This work has to be done here and not by the worker as it has no
      // access to the Web APIs
      var req = fb.utils.getAllFbContacts();

      req.onsuccess = function() {
        var uids = {};
        var fbContacts = req.result;

        if (fbContacts.length === 0) {
          debug('Nothing to be synchronized. No FB Contacts present');
          return;
        }

        startWorker();

        // Contacts by id are cached for later update
        fbContactsById = {};
        // Contacts for which an update will be forced
        var forceUpdate = {};

        fbContacts.forEach(function(contact) {
          fbContactsById[contact.id] = contact;
          var pictureUrl = fb.getFriendPictureUrl(contact);
          var uid = fb.getFriendUid(contact);

          uids[uid] = {
            contactId: contact.id,
            photoUrl: pictureUrl
          };

          if (!pictureUrl) {
            forceUpdate[uid] = {
              contactId: contact.id
              // photoUrl is left undefined as it is not known
            };
          }
        });

        fb.utils.getLastUpdate(function run_worker(ts) {
          fb.utils.getCachedAccessToken(function(access_token) {
            // The worker must start
            theWorker.postMessage({
              type: 'start',
              data: {
                uids: uids,
                imgNeedsUpdate: forceUpdate,
                timestamp: ts,
                access_token: access_token,
                operationsTimeout: fb.operationsTimeout,
                targetPictureSize: importUtils.getPreferredPictureDetail()
              }
            });
          });
        });
      };

      req.onerror = function() {
        window.console.error('FB: Error while getting friends on the device',
                             req.error.name);
        if (typeof errorCallback === 'function') {
          errorCallback({
            name: 'defaultError'
          });
        }
      };
    };

    // Schedules a next synchronization
    Sync.scheduleNextSync = function() {
      //
      currentAlarmRequest = new fb.utils.Request();

      window.setTimeout(function() {
        // The alarm has to be scheduled by the same page that will handle it
        // https://bugzilla.mozilla.org/show_bug.cgi?id=800431
        alarmFrame = document.createElement('iframe');
        alarmFrame.src = '/facebook/fb_sync.html';
        alarmFrame.width = 1;
        alarmFrame.height = 1;
        alarmFrame.style.display = 'none';
        document.body.appendChild(alarmFrame);
      },0);

      return currentAlarmRequest;
    };

    function cleanAlarmSchedFrame() {
      alarmFrame.src = null;
      document.body.removeChild(alarmFrame);
      alarmFrame = null;
    }

    Sync.onAlarmScheduled = function(date) {
      debug('Next synch scheduled at: ', date);
      if (alarmFrame) {
        window.setTimeout(cleanAlarmSchedFrame, DELAY_ALARM_SCHED);
      }
      currentAlarmRequest.done(date);
    };


    Sync.onAlarmError = function(e) {
      if (alarmFrame) {
         window.setTimeout(cleanAlarmSchedFrame, DELAY_ALARM_SCHED);
      }

      window.console.error('<<FB Sync>> Error while scheduling a new sync: ',
                           e);

      currentAlarmRequest.failed(e);
    };

    Sync.debug = function() {
      debug.apply(this, arguments);
    };

    // Starts a synchronization with data coming from import / link
    Sync.startWithData = function(contactList, myFriendsByUid, callbacks) {
      completionCallback = callbacks.success;
      errorCallback = callbacks.error;
      nextTimestamp = Date.now();

      changed = 0;
      // As it is not a priori known how many are going to needed a change
      totalToChange = Number.MAX_VALUE;

      debug('Starting Synchronization with data');

      fbFriendsDataByUid = myFriendsByUid;
      // Friends to be updated by the worker (those which profile img changed)
      var toBeUpdated = {};

      fb.utils.getLastUpdate(function import_updates(lastUpdate) {
        var toBeChanged = 0;
        var lastUpdateTime = Math.round(lastUpdate / 1000);

        debug('Last update time: ', lastUpdateTime);
        fbContactsById = {};

        contactList.forEach(function(aContact) {
          fbContactsById[aContact.id] = aContact;

          var uid = fb.getFriendUid(aContact);

          var friendData = fbFriendsDataByUid[uid];
          if (friendData) {
            var friendUpdate = friendData.profile_update_time;
            debug('Friend update Time ', friendUpdate, 'for UID: ', uid);

            var profileImgUrl = fb.getFriendPictureUrl(aContact);

            if (friendUpdate > lastUpdateTime ||
                            profileImgUrl !== friendData.pic_big) {
              debug('Friend changed!! : ', uid);

              if (profileImgUrl !== friendData.pic_big) {
                debug('Profile img changed: ', profileImgUrl);

                toBeUpdated[uid] = {
                  contactId: aContact.id
                };
              }
              else {
                debug('Updating friend: ', friendData.uid);
                toBeChanged++;
                updateFbFriend(aContact.id, friendData);
              }
            }
            else {
              debug('Friend has not changed', uid);
            }
          }
          else {
            debug('Removing friend: ', aContact.id);
            toBeChanged++;
            removeFbFriend(aContact.id);
          }
        });

        debug('First pass of Updates and removed finished');

        // Those friends which image has changed will require help from the
        // worker
        var toBeUpdatedList = Object.keys(toBeUpdated);
        if (toBeUpdatedList.length > 0) {
          totalToChange = toBeChanged + toBeUpdatedList.length;

          debug('Starting worker for updating img data');
          startWorker();

          fb.utils.getCachedAccessToken(function(access_token) {

            theWorker.postMessage({
              type: 'startWithData',
              data: {
                access_token: access_token,
                uids: toBeUpdated,
                operationsTimeout: fb.operationsTimeout,
                targetPictureSize: importUtils.getPreferredPictureDetail()
              }
            });
          });
        }
        else {
          totalToChange = toBeChanged;
          checkTotals();
        }
      });
    };



  })();
}
