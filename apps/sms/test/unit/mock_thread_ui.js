/*global Recipients, Template */
/*exported MockThreadUI */

'use strict';

var MockThreadUI = {
  LAST_MESSSAGES_BUFFERING_TIME: 600000,
  CHUNK_SIZE: 10,
  CONVERTED_MESSAGE_DURATION: 3000,
  IMAGE_RESIZE_DURATION: 3000,
  recipients: {
    add: function() {}
  },
  recipientsList: document.createElement('div'),

  // For Information view testing. Need to be updated with ThreadUI layout
  optionsIcon: document.createElement('a'),
  attachButton: document.createElement('a'),
  subheader: document.createElement('div'),
  container: document.createElement('article'),
  composeForm: document.createElement('form'),
  headerText: document.createElement('h1'),

  inEditMode: false,
  inThread: false,
  init: function() {},
  initRecipients: function() {
    this.recipients = new Recipients({
      outer: 'messages-to-field',
      inner: 'messages-recipients-list',
      template: new Template('messages-recipient-tmpl')
    });
  },
  initSentAudio: function() {},
  enableActivityRequestMode: function() {},
  resetActivityRequestMode: function() {},
  getAllInputs: function() {},
  getSelectedInputs: function() {},
  messageComposerInputHandler: function() {},
  assimilateRecipients: function() {},
  messageComposerTypeHandler: function() {},
  subheaderMutationHandler: function() {},
  resizeHandler: function() {},
  requestContact: function() {},
  updateComposerHeader: function() {},
  isScrolledManually: false,
  manageScroll: function() {},
  scrollViewToBottom: function() {},
  updateInputMaxHeight: function() {},
  back: function() {},
  isKeyboardDisplayed: function() {},
  enableSend: function() {},
  updateSmsSegmentLimit: function() {},
  updateCounter: function() {},
  updateCounterForMms: function() {},
  updateElementsHeight: function() {},
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
  cleanForm: function() {},
  clear: function() {},
  toggleCheckedAll: function() {},
  startEdit: function() {},
  delete: function() {},
  cancelEdit: function() {},
  chooseMessage: function() {},
  checkInputs: function() {},
  handleMessageClick: function() {},
  handleEvent: function() {},
  cleanFields: function() {},
  onSendClick: function() {},
  onMessageSending: function() {},
  onMessageSent: function() {},
  onMessageFailed: function() {},
  onDeliverySuccess: function() {},
  removeMessageDOM: function() {},
  retrieveMMS: function() {},
  resendMessage: function() {},
  renderContact: function() {},
  toFieldKeypress: function() {},
  toFieldInput: function() {},
  searchContact: function() {},
  onHeaderActivation: function() {},
  onParticipantClick: function() {},
  promptContact: function() {},
  prompt: function() {},
  saveDraft: function() {},
  onCreateContact: function() {},
  isShowMessageErrorCalledTimes: 0,
  showMessageError: function() {
    this.isShowMessageErrorCalledTimes += 1;
  },
  mSetup: function() {
    this.isShowMessageErrorCalledTimes = 0;
    this.inThread = false;
  },

  mTeardown: function() {
    this.isShowMessageErrorCalledTimes = 0;
  }
};
