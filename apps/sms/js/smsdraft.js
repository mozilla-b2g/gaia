/* global asyncStorage, clearInterval, setInterval, Compose, ThreadUI */

'use strict';

var SMSDraft = {
  dom: {},
  DRAFT_MESSAGE_KEY: 'tarako-sms-draft-index',
  draft: null,
  dirty: false,
  timerid: null,
  monitorpaused: false,
  initDOM: function() {
    this.dom.sendButton = document.getElementById('messages-send-button');
  },
  init: function() {
    this.timerid = null;
    this.dirty = false;
    this.draft = null;
    this.monitorpaused = false;
    this.initDOM();

    // normal launch
    if (!window.location.hash) {
      this.loadDraft();
    }

    // prebinding so that it's possible to remove the listener in uninit
    this.onHashChange = this.onHashChange.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.clearDraft = this.clearDraft.bind(this);

    window.addEventListener('hashchange', this.onHashChange);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.dom.sendButton.addEventListener('click', this.clearDraft);
  },

  uninit: function() {
    window.removeEventListener('hashchange', this.onHashChange);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.dom.sendButton.removeEventListener('click', this.clearDraft);
  },

  startMonitor: function() {
    if (this.timerid) {
      return;
    }
    this.timerid = setInterval(function() {
       SMSDraft.onTimerSaverHandler();
    },2000);
    Compose.on('input', SMSDraft.onInput);
    ThreadUI.recipients.on('add', SMSDraft.onInput);
    ThreadUI.recipients.on('remove', SMSDraft.onInput);
  },
  stopMonitor: function() {
    clearInterval(this.timerid);
    this.timerid = null;
    Compose.off('input', SMSDraft.onInput);
    ThreadUI.recipients.off('add', SMSDraft.onInput);
    ThreadUI.recipients.off('remove', SMSDraft.onInput);
  },
  pauseMonitor: function() {
    if (this.timerid) {
      this.stopMonitor();
      this.monitorpaused = true;
    }
  },
  resumeMonitor: function() {
    if (this.monitorpaused) {
      this.startMonitor();
      this.monitorpaused = false;
    }
  },
  onHashChange: function() {
    if (window.location.hash == '#new') {
      this.recoverDraft();
      this.startMonitor();
    } else {
      this.stopMonitor();
      this.clearDraft();
    }
  },
  onVisibilityChange: function(e) {
    if (document.hidden) {
      this.pauseMonitor();
      this.onTimerSaverHandler();
    } else {
      this.resumeMonitor();
    }
  },
  onTimerSaverHandler: function() {
    if (!this.dirty) {
       return;
    }

    ThreadUI.assimilateRecipients();

    var draft = {
      recipients: ThreadUI.recipients.list,
      subject: Compose.getSubject(),
      content: Compose.getContent(),
      timestamp: Date.now(),
      threadId: this.DRAFT_MESSAGE_KEY,
      type: Compose.type
    };

    this.dirty = false;
    this.storeDraft(draft);
  },
  onInput: function() {
    SMSDraft.dirty = true;
  },
  loadDraft: function() {
    asyncStorage.getItem(this.DRAFT_MESSAGE_KEY, function(draft) {
      if (!draft) {
        return;
      }
      this.draft = draft;
      if (draft.content && draft.content.length > 0) {
        this.jump2DraftView(draft);
      }
    }.bind(this));
  },
  storeDraft: function(draft) {
    this.draft = draft;
    asyncStorage.setItem(this.DRAFT_MESSAGE_KEY, draft);
  },
  clearDraft: function() {
    this.draft = null;
    asyncStorage.removeItem(this.DRAFT_MESSAGE_KEY);
  },
  jump2DraftView: function(draft) {
    // this will trigger an hashchange event, see the onHashChange method
    window.location.hash = '#new';
  },
  recoverDraft: function() {
    var draft = this.draft;
    if (!(draft && draft.content && draft.content.length)) {
       return;
    }

    Compose.fromDraft(draft);
    if (Array.isArray(draft.recipients)) {
      draft.recipients.forEach(function(to) {
        ThreadUI.recipients.add(to);
      });
    }
  }
};


