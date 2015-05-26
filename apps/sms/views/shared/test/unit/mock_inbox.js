/*exported MockInboxView */

'use strict';

var MockInboxView = {
  count: 0,
  inEditMode: false,
  container: document.createElement('div'),
  init: function() {},
  updateThread: function() {},
  getIdIterator: function() {},
  setContact: function() {},
  handleEvent: function() {},
  updateSelectionStatus: function() {},
  cleanForm: function() {},
  toggleCheckedAll: function() {},
  removeThread: function() {},
  delete: function() {},
  setEmpty: function() {},
  showOptions: function() {},
  startEdit: function() {},
  cancelEdit: function() {},
  renderThreads: () => Promise.resolve(),
  createThread: function() {},
  insertThreadContainer: function() {},
  onMessageSending: function() {},
  onMessageReceived: function() {},
  onThreadsDeleted: function() {},
  appendThread: function() {},
  onDraftSaved: function() {},
  onDraftDeleted: () => {},
  showDraftSavedBanner: () => {},
  createThreadContainer: function() {},
  updateContactsInfo: function() {},
  mark: function() {},
  markReadUnread: () => {},
  whenReady: () => Promise.resolve()
};
