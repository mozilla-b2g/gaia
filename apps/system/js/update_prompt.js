/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var UpdatePrompt = {
  init: function up_init() {
    window.addEventListener('mozChromeEvent', this);
  },

  handleEvent: function up_handleEvent(evt) {
    if (evt.type !== 'mozChromeEvent') {
      return;
    }

    var detail = evt.detail;
    if (detail.type !== 'update-prompt') {
      return;
    }

    this.showUpdatePrompt(detail);
  },

  formatTimeout: function up_formatTimeout(timeout) {
    var _ = navigator.mozL10n.get;
    if (timeout > 1000 * 60) { // Greater than a minute, show in minutes
      return _("minutes", { n: Math.floor(timeout / 1000 / 60) });
    }

    // Show in seconds
    return _("seconds", { n: Math.floor(timeout / 1000) });
  },

  showUpdatePrompt: function up_showUpdatePrompt(data) {
    if (ModalDialog.isVisible()) {
      // TODO - what to do in this case? (might need UX guidance)
      return;
    }

    if (!data) {
      return;
    }

    var _ = navigator.mozL10n.get;
    var promptTimeout = this.formatTimeout(data.promptTimeout);
    var waitTimeout = this.formatTimeout(data.waitTimeout);

    ModalDialog.showWithPseudoEvent({
      type: 'updateprompt',
      text: _('update-message', {
        displayVersion: data.update.displayVersion,
        promptTimeout: promptTimeout
      }),
      okText: _('update-install'),
      cancelText: _('update-wait', {
        waitTimeout: waitTimeout
      }),
      callback: this.sendResult.bind(this)
    });
  },

  sendResult: function up_sendResult(install) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, {
      type: 'update-prompt-result',
      result: install ? 'restart' : 'wait'
    });
    window.dispatchEvent(event);
  }
};

UpdatePrompt.init();
