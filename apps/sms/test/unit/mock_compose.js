/*exported MockCompose */

'use strict';

var MockCompose = {
  init: function() {},
  on: function(type, handler) {},
  off: function(type, handler) {},
  clearListeners: function() {},
  getContent: function() {},
  getText: function() {},
  isEmpty: function() {
    return this.mEmpty;
  },
  disable: function(state) {},
  scrollToTarget: function(target) {},
  scrollMessageContent: function() {},
  prepend: function(item) {},
  append: function(aContent) {
    this.mEmpty = false;
  },
  clear: function() {
    this.mEmpty = true;
  },
  focus: function() {},
  updateType: function() {},

  getSubject: function() {},
  toggleSubject: function() {},
  fromDraft: function() {},
  fromMessage: function() {},

  mEmpty: true,
  mSubjectEmpty: true,
  mSubjectShowing: false,

  mSetup: function() {
    this.mEmpty = true;
    this.mSubjectEmpty = true;
    this.mSubjectShowing = false;
  }
};
