/* global MockFbGraphData */
/* exported MockFbQuery */
'use strict';

var MockFbQuery = {
  runQuery: function(query, callbacks) {
    callbacks.success(MockFbGraphData);
  },
  getFriendPicture: function(uid, callbacks) {
    callbacks.success(null);
  }
};
