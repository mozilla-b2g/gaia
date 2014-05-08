/* global asyncStorage, clearInterval, setInterval, Compose, ThreadUI */

'use strict';

var SMSDraft = {
  DRAFT_MESSAGE_KEY: 'tarako-sms-draft-index',
  DRAFT_SAVE_TIMEOUT: 2000,
  _draft: null,
  _timerId: null,
  _sendButton: null,

  init: function() {
    this._timerId = null;
    this._draft = null;
    this._sendButton = document.getElementById('messages-send-button');

    // normal launch
    if (!window.location.hash) {
      this.loadDraft();
    }

    // prebinding so that it's possible to remove the listener in uninit
    this.onHashChange = this.onHashChange.bind(this);
    this.clearDraft = this.clearDraft.bind(this);
    this.onInput = this.onInput.bind(this);

    window.addEventListener('hashchange', this.onHashChange);
    this._sendButton.addEventListener('click', this.clearDraft);
  },

  uninit: function() {
    window.removeEventListener('hashchange', this.onHashChange);
    this._sendButton.removeEventListener('click', this.clearDraft);
  },

  startMonitor: function() {
    Compose.on('input', this.onInput);
    ThreadUI.recipients.on('add', this.onInput);
    ThreadUI.recipients.on('remove', this.onInput);
  },

  stopMonitor: function() {
    Compose.off('input', this.onInput);
    ThreadUI.recipients.off('add', this.onInput);
    ThreadUI.recipients.off('remove', this.onInput);
  },

  onHashChange: function() {
    if (window.location.hash === '#new') {
      this.recoverDraft();
      this.startMonitor();
    } else {
      this.stopMonitor();
      this.clearDraft();
    }
  },

  onInput: function() {
    if (this._timerId) {
      return;
    }

    this._timerId = setTimeout(function saveDraft() {
      this._timerId = null;

      ThreadUI.assimilateRecipients();

      var draft = {
        recipients: ThreadUI.recipients.list,
        subject: Compose.getSubject(),
        content: Compose.getContent(),
        timestamp: Date.now(),
        threadId: this.DRAFT_MESSAGE_KEY,
        type: Compose.type
      };

      this.storeDraft(draft);
    }.bind(this), this.DRAFT_SAVE_TIMEOUT);
  },

  loadDraft: function() {
    asyncStorage.getItem(this.DRAFT_MESSAGE_KEY, function(draft) {
      if (!draft) {
        return;
      }
      this._draft = draft;
      if (draft.content && draft.content.length > 0) {
        this.jump2DraftView();
      }
    }.bind(this));
  },

  storeDraft: function(draft) {
    this._draft = draft;
    asyncStorage.setItem(this.DRAFT_MESSAGE_KEY, draft);
  },

  clearDraft: function() {
    this._draft = null;
    asyncStorage.removeItem(this.DRAFT_MESSAGE_KEY);
  },

  jump2DraftView: function() {
    // this will trigger an hashchange event, see the onHashChange method
    window.location.hash = '#new';
  },

  recoverDraft: function() {
    var draft = this._draft;
    if (!(draft && draft.content && draft.content.length)) {
       return;
    }

    Compose.fromDraft(draft);
    if (Array.isArray(draft.recipients)) {
      draft.recipients.forEach(function(to) {
        // the recipients coming from the draft were already resolved
        to.isQuestionable = to.isLookupable = false;
        ThreadUI.recipients.add(to);
      });
    }
  }
};


