'use strict';

var MockNavigatormozSms = {
  getSegmentInfoForText: function() {
    return this.mNextSegmentInfo;
  },

  mNextSegmentInfo: null,

  mTeardown: function() {
    this.mNextSegmentInfo = null;
  }
};
