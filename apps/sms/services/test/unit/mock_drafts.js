/*exported MockDrafts,MockDraftList,MockDraft */

'use strict';

var MockDrafts = {
  List: MockDraftList,
  add: function() {},
  delete: function() {},
  byThreadId: function() {
    return new MockDraftList();
  },
  get: function() {},
  clear: function() {},
  store: function() {},
  request: function() {}
};

function MockDraftList() {}

MockDraftList.prototype = {
  length: 0,
  forEach: function() {}
};

function MockDraft(draft) {
  for (var p in draft) {
    this[p] = draft[p];
  }
}
