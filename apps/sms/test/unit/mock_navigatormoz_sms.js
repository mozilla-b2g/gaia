'use strict';

var MockNavigatormozSms = {
  getSegmentInfoForText: function() {
    return this.mNextSegmentInfo || this.mDefaultSegmentInfo;
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
