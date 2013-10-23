/*global Recipients, Template */
/*exported MockThreadUI */

'use strict';

var MockThreadUI = {
  LAST_MESSSAGES_BUFFERING_TIME: 600000,
  CHUNK_SIZE: 10,
  CONVERTED_MESSAGE_DURATION: 3000,
  IMAGE_RESIZE_DURATION: 3000,
  recipients: null,
  recipientsList: document.createElement('div'),
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
  setMessageBody: function() {},
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
  setInputMaxHeight: function() {},
  back: function() {},
  isKeyboardDisplayed: function() {},
  enableSend: function() {},
  updateSmsSegmentLimit: function() {},
  updateCounter: function() {},
  updateCounterForMms: function() {},
  updateInputHeight: function() {},
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
  groupView: function() {},
  prompt: function() {},
  onCreateContact: function() {},
  isShowSendMessageErrorCalledTimes: 0,
  showSendMessageError: function() {
    this.isShowSendMessageErrorCalledTimes += 1;
  },
  mSetup: function() {
    this.isShowSendMessageErrorCalledTimes = 0;
    this.inThread = false;
  },

  mTeardown: function() {
    this.isShowSendMessageErrorCalledTimes = 0;
  }
};

MockThreadUI.groupView.reset = function() {};
