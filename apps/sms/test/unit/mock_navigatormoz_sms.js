'use strict';

var MockNavigatormozMobileMessage = {
  getSegmentInfoForText: function() {
    return this.mNextSegmentInfo || this.mDefaultSegmentInfo;
  },

  getThreads: function() {
    var cursor = {
      result: null
    };
    setTimeout(function() {
      cursor.onsuccess();
    });
    return cursor;
  },

  mNextSegmentInfo: null,

  mDefaultSegmentInfo: {
    segments: 1,
    charsAvailableInLastSegment: 150
  },

  mTeardown: function() {
    this.mNextSegmentInfo = null;
  }
};
