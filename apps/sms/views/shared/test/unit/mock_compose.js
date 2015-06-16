/*exported MockCompose */

'use strict';

var MockCompose = {
  isSubjectVisible: false,

  init: function() {},
  on: function(type, handler) {},
  off: function(type, handler) {},
  offAll: function() {},
  getContent: function() {},
  getText: function() {},
  isEmpty: () => true,
  isSubjectMaxLength: () => false,
  setupLock() {},
  refresh() {},
  scrollToTarget: function(target) {},
  scrollMessageContent: function() {},
  prepend: function(item) {},
  append: () => {},
  clear: () => {},
  focus: function() {},

  getSubject: function() {},
  setSubject: function() {},
  showSubject: function() {},
  hideSubject: function() {},
  fromDraft: function() {},

  mSetup: function() {
    this.size = null;
    this.type = 'sms';
  }
};
