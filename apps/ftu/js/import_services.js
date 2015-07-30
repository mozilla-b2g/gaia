/* global ServicesLauncher */
/* exported ImportIntegration */
'use strict';

var ImportIntegration = {

  get liveImportButton() {
    delete this.liveImportButton;
    return (this.liveImportButton =
      document.getElementById('live-import-button'));
  },

  get gmailImportButton() {
    delete this.gmailImportButton;
    return (this.gmailImportButton =
      document.getElementById('gmail-import-button'));
  },

  init: function () {
    this.liveImportButton.addEventListener('click', this);
    this.gmailImportButton.addEventListener('click', this);
  },

  handleEvent: function (event) {
    switch (event.type) {
      case 'click':
        if (event.target === this.liveImportButton) {
          ServicesLauncher.start('live');
        }
        else if (event.target === this.gmailImportButton) {
          ServicesLauncher.start('gmail');
        }
        break;
    }
  },

  checkImport: function (nextState) {

    if (nextState === 'disabled') {
      this.gmailImportButton.setAttribute('disabled', 'disabled');
      this.liveImportButton.setAttribute('disabled', 'disabled');
    }
    else if (nextState === 'enabled') {
      this.gmailImportButton.removeAttribute('disabled');
      this.liveImportButton.removeAttribute('disabled');
    }
  }
};
