/*exported MockCompose */

'use strict';

var MockCompose = {
  init: function() {},
  on: function(type, handler) {},
  off: function(type, handler) {},
  offAll: function() {},
  getContent: function() {},
  getText: function() {},
  isEmpty: () => true,
  isSubjectMaxLength: () => false,
  lock: function() {},
  unlock: function() {},
  disable: function(state) {},
  scrollToTarget: function(target) {},
  scrollMessageContent: function() {},
  prepend: function(item) {},
  append: () => {},
  clear: () => {},
  focus: function() {},
  updateType: function() {},

  getSubject: function() {},
  setSubject: function() {},
  showSubject: function() {},
  hideSubject: function() {},
  fromDraft: function() {},
  fromMessage: function() {},

  mSubjectEmpty: true,
  mSubjectShowing: false,

  mSetup: function() {
    this.mSubjectEmpty = true;
    this.mSubjectShowing = false;
    this.size = null;
    this.type = 'sms';
  }
};
