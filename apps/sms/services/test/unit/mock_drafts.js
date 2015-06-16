/*exported MockDrafts,
           MockDraft
*/

'use strict';

var MockDrafts = {
  add: function() { return this; },
  delete: function() { return this; },
  byThreadId: () => null,
  byDraftId: function() {},
  clear: function() {},
  store: () => Promise.resolve(),
  request: () => Promise.resolve(),
  getAll: () => [],
  on: () => {}
};

function MockDraft(draft) {
  Object.assign(this, draft);
  if (!this.id) {
    this.id = 'draftId';
  }
}
