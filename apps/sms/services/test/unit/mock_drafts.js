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
  getAllThreadless: () => [],
  on: () => {}
};

function MockDraft(draft) {
  Object.assign(this, { id: 'draftId' }, draft);
}
