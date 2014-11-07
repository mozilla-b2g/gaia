/*global MockRecipients, Template */
/*exported MockThreadUI */

'use strict';

require('/test/unit/mock_recipients.js');

var MockThreadUI = {
  CHUNK_SIZE: 10,
  CONVERTED_MESSAGE_DURATION: 3000,
  IMAGE_RESIZE_DURATION: 3000,
  recipients: {
    add: function() {},
    focus: function() {}
  },
  recipientsList: document.createElement('div'),

  // For Information view testing. Need to be updated with ThreadUI layout
  optionsButton: document.createElement('button'),
  callNumberButton: document.createElement('button'),
  attachButton: document.createElement('button'),
  subheader: document.createElement('div'),
  container: document.createElement('article'),
  composeForm: document.createElement('form'),
  headerText: document.createElement('h1'),

  inEditMode: false,
  init: function() {},
  initRecipients: function() {
    this.recipients = new MockRecipients({
      outer: 'messages-to-field',
      inner: 'messages-recipients-list',
      template: new Template('messages-recipient-tmpl')
    });
  },
  on: function() {},
  initSentAudio: function() {},
  getIdIterator: function() {},
  getSelectedInputs: function() {},
  messageComposerInputHandler: function() {},
  assimilateRecipients: function() {},
  resizeHandler: function() {},
  requestContact: function() {},
  updateComposerHeader: function() {},
  isScrolledManually: false,
  manageScroll: function() {},
  scrollViewToBottom: function() {},
  back: function() {},
  isKeyboardDisplayed: function() {},
  getMessageContainer: function() {},
  updateHeaderData: function() {},
  initializeRendering: function() {},
  stopRendering: function() {},
  showFirstChunk: function() {},
  createMmsContent: function() {},
  renderMessages: function() {},
  _createNotDownloadedHTML: function() {},
  buildMessageDOM: function() {},
  appendMessage: function() {},
  showChunkOfMessages: function() {},
  setHeaderAction: function() {},
  setHeaderContent: function() {},
  cleanForm: function() {},
  clear: function() {},
  toggleCheckedAll: function() {},
  startEdit: function() {},
  delete: function() {},
  cancelEdit: function() {},
  chooseMessage: function() {},
  updateSelectionStatus: function() {},
  handleMessageClick: function() {},
  handleEvent: function() {},
  cleanFields: function() {},
  onSendClick: function() {},
  onMessageSending: function() {},
  onMessageSent: function() {},
  onMessageFailed: function() {},
  onDeliverySuccess: function() {},
  onReadSuccess: function() {},
  removeMessageDOM: function() {},
  retrieveMMS: function() {},
  resendMessage: function() {},
  toFieldKeypress: function() {},
  toFieldInput: function() {},
  searchContact: function() {},
  onHeaderActivation: function() {},
  promptContact: function() {},
  prompt: function() {},
  saveDraft: function() {},
  discardDraft: function() {},
  onCreateContact: function() {},
  isShowMessageErrorCalledTimes: 0,
  showMessageError: function() {
    this.isShowMessageErrorCalledTimes += 1;
  },
  mSetup: function() {
    this.isShowMessageErrorCalledTimes = 0;
  },

  mTeardown: function() {
    this.isShowMessageErrorCalledTimes = 0;
  }
};
