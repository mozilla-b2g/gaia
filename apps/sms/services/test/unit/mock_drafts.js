/*exported MockDrafts,
           MockDraft
*/

'use strict';

var MockDrafts = {
  add: function() {},
  delete: function() { return this; },
  byThreadId: () => null,
  byDraftId: function() {},
  clear: function() {},
  store: function() {},
  request: () => Promise.resolve(),
  getAll: () => []
};

function MockDraft(draft) {
  Object.assign(this, draft);
}
