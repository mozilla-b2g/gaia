'use strict';

importScripts('/shared/js/fb/fb_request.js',
              '/contacts/js/fb/fb_query.js',
              '/contacts/js/fb/fb_contact_utils.js',
              '/shared/js/fb/fb_reader_utils.js',
              'console.js');

(function(wutils) {

  var uids,
      timestamp,
      access_token,
      forceUpdateUids,
      targetPictureSize;

  wutils.addEventListener('message', processMessage);

  debug('Worker up and running ....');

  // Query to know what friends need to be updated
  var UPDATED_QUERY = [
      'SELECT uid, name, first_name, last_name, ' ,
      'middle_name, birthday_date, email, current_location, ' ,
      'work, phones, hometown_location, pic_big ' ,
      ' FROM user' ,
      ' WHERE uid ',
      ' IN (SELECT uid1 FROM friend WHERE uid2=me()',
      ' AND uid1 IN (',
      null,
      ') )',
      ' AND profile_update_time > ',
      null,
      ' OR uid IN (',
      null,
      ')'
    ];

  // Query to know what friends need to be removed
  var REMOVED_QUERY = [
    'SELECT target_id FROM ',
    'connection where source_id = me() ',
    ' AND target_type = "user" AND is_deleted="true"',
    ' AND target_id IN (',
    null,
    ')'
  ];

  function debug() {
    function getString(a) {
      var out = '';
      for (var c = 0; c < a.length; c++) {
        out += a[c];
      }

      return out;
    }

    self.console.log(getString(arguments));
  }

  function errorQueryCb(e) {
    self.console.error('<<FB Sync>>: Error while trying to sync', e);
    postError({
      type: 'query_error',
      data: {}
    });
  }

  function timeoutQueryCb(e) {
    postError({
      type: 'timeout_error'
    });
  }

  function postError(e) {
    // Message type to propagate to the worker parent
    var type = 'query_error';
    if (e && e.code === 190) {
      self.console.log('This is a token error. Notifying worker parent');
      type = 'token_error';
    }
    else if (e && e.type === 'timeout_error') {
      self.console.log('This is a timeout error. Notifying worker parent');
      type = e.type;
    }
    wutils.postMessage({
      type: type,
      data: e
    });
  }

  function buildQueries(ts, uids, forcedUids) {
    var uidsFilter = uids.join(',');

    // The index at which the timestamp is set
    var IDX_TS = 10;
    UPDATED_QUERY[IDX_TS] = Math.round(ts / 1000);

    // The index at which uids filter is set
    var IDX_UIDS = 7;
    UPDATED_QUERY[IDX_UIDS] = uidsFilter;

    // The index at which those uids forced to be updated is set
    var IDX_FORCE = 12;
    var forceUpdateUidsFilter = '';

    if (forcedUids && forcedUids.length > 0) {
      forceUpdateUidsFilter = forcedUids.join(',');
    }
    UPDATED_QUERY[IDX_FORCE] = forceUpdateUidsFilter;

    var R_IDX_UIDS = 4;
    REMOVED_QUERY[R_IDX_UIDS] = uidsFilter;

    // Two queries launched at the same time
    var outQueries = {
      query1: UPDATED_QUERY.join(''),
      query2: REMOVED_QUERY.join('')
    };

    return JSON.stringify(outQueries);
  }

  function processMessage(e) {
    var message = e.data;

    if (message.type === 'start') {
      uids = message.data.uids;
      access_token = message.data.access_token;
      timestamp = message.data.timestamp;
      forceUpdateUids = message.data.imgNeedsUpdate;
      fb.operationsTimeout = message.data.operationsTimeout;
      targetPictureSize = message.data.targetPictureSize;

      debug('Worker acks contacts to check: ', Object.keys(uids).length);

      if (forceUpdateUids && forceUpdateUids.length > 0)
        debug('These friends are forced to be updated: ' ,
              JSON.stringify(forceUpdateUids));

      getFriendsToBeUpdated(Object.keys(uids), Object.keys(forceUpdateUids));
    }
    else if (message.type === 'startWithData') {
      debug('worker Acks start with data');

      fb.operationsTimeout = message.data.operationsTimeout;
      uids = message.data.uids;
      access_token = message.data.access_token;
      targetPictureSize = message.data.targetPictureSize;

      getNewImgsForFriends(Object.keys(uids), access_token);
    }
  }


  // Launch a multiple query to obtain friends to be updated and deleted
  function getFriendsToBeUpdated(uids, forcedUids) {
    var query = buildQueries(timestamp, uids, forcedUids);
    var callbacks = {
      success: friendsReady,
      error: errorQueryCb,
      timeout: timeoutQueryCb
    };

    fb.utils.runQuery(query, callbacks, access_token);
  }

  // Callback executed when data is ready
  function friendsReady(response) {
    // Timestamp is captured right now to avoid problems
    // with updates in between
    var qts = Date.now();
    if (typeof response.error === 'undefined') {
      var updateList = response.data[0].fql_result_set;
      var removeList = response.data[1].fql_result_set;
      // removeList = [{target_id: '100001127136581'}];

      wutils.postMessage({
        type: 'totals',
        data: {
          totalToChange: updateList.length + removeList.length,
          queryTimestamp: qts
        }
      });

      syncUpdatedFriends(updateList);
      syncRemovedFriends(removeList);
    }
    else {
      postError(response.error);
    }
  }

  function syncRemovedFriends(removedFriends) {
    debug('Friends to be removed: ', removedFriends.length);

    // Simply an iteration over the collection is done and a message passed
    removedFriends.forEach(function(aremoved) {
      var removedRef = uids[aremoved.target_id];

      if (removedRef) {
        wutils.postMessage({
          type: 'friendRemoved',
          data: {
            uid: aremoved.target_id,
            contactId: removedRef.contactId
          }
        });
      }

    }); // forEach
  }


  function syncUpdatedFriends(updatedFriends) {
    debug('Friends to be updated: ', updatedFriends.length);

    // Friends which image has to be updated
    var friendsImgToBeUpdated = {};

    updatedFriends.forEach(function(afriend) {
      var friendInfo = forceUpdateUids[afriend.uid] || uids[afriend.uid];

      if (!friendInfo) {
        debug('The uid provided is unknown. Doing nothing');
        return;
      }

      if (afriend.pic_big !== friendInfo.photoUrl) {
        // Photo changed
        debug('Contact Photo Changed!!! for ', afriend.uid);
        friendsImgToBeUpdated[afriend.uid] = afriend;
      }
      else {
        debug('Contact Photo unchanged for ', afriend.uid);
        wutils.postMessage({
          type: 'friendUpdated',
          data: {
            updatedFbData: afriend,
            contactId: friendInfo.contactId
          }
        });
      }
    });

    debug('Worker terminated processing updates');

    var friendImgList = Object.keys(friendsImgToBeUpdated);

    if (friendImgList.length > 0) {
      debug('Now starting synch for ', friendImgList.length, ' images');

      // Now it is time to download the images needed
      var imgSync = new ImgSynchronizer(friendImgList);

      imgSync.start();

      // Once an image is ready friend update is notified
      imgSync.onimageready = function(uid, blob) {
        if (blob) {
          debug('Image retrieved correctly for ', uid);

          var friendData = friendsImgToBeUpdated[uid];
          friendData.fbInfo = {};
          friendData.fbInfo.photo = [blob];
          fb.setFriendPictureUrl(friendData.fbInfo, friendData.pic_big);
        }
        else {
          self.console.error('Img for UID', uid, ' could not be retrieved ');
          // This friend has to be marked in a special state just to be
          // synced later on
          var friendData = friendsImgToBeUpdated[uid];
          friendData.fbInfo = {};
          friendData.fbInfo.photo = [];
          // TODO: This should only remove the URL of the profile picture
          friendData.fbInfo.url = [];
        }

        var contact = uids[uid] || forceUpdateUids[uid];

        wutils.postMessage({
          type: 'friendUpdated',
          data: {
            updatedFbData: friendData,
            contactId: contact.contactId
          }
        });
      };
    }
  }

  // For dealing with the case that only new imgs have to be retrieved
  function getNewImgsForFriends(friendList) {
    debug('Getting new imgs for friends', JSON.stringify(friendList));

    var imgSync = new ImgSynchronizer(friendList);

    imgSync.start();

    // Once an image is ready friend update is notified
    imgSync.onimageready = function(uid, blob) {
      self.console.log('Img Ready from worker');

      if (!blob) {
        self.console.error('Img for UID: ', uid, ' could not be retrieved ');
      }

      wutils.postMessage({
        type: 'friendImgReady',
        data: {
          photo: blob,
          contactId: uids[uid].contactId
        }
      });
    };
  }


  var ImgSynchronizer = function(friends) {
    var next = 0;
    var self = this;

    this.friends = friends;

    this.start = function() {
      retrieveImg(this.friends[next]);
    };

    function imgRetrieved(blob) {
      if (typeof self.onimageready === 'function') {
        var uid = self.friends[next];

        wutils.setTimeout(function() {
          self.onimageready(uid, blob);
        },0);
      }

      // And lets go for the next
      next++;
      if (next < self.friends.length) {
        retrieveImg(self.friends[next]);
      }
    }

    function retrieveImg(uid) {
      fb.utils.getFriendPicture(uid, imgRetrieved, access_token,
                                targetPictureSize);
    }
  };

})(self);
