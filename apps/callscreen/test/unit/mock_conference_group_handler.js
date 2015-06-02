/* exported MockConferenceGroupHandler */
'use strict';

var MockConferenceGroupHandler = {
  mCurrentDuration: '12:34',
  get currentDuration() {
    return this.mCurrentDuration;
  },
  signalConferenceEnded: function() {},
  addToGroupDetails: function() {},
  isGroupDetailsShown: function() {},
  hideGroupDetails: function() {},
  mTeardown: function() {
    this.mCurrentDuration = '12:34';
  }
};
