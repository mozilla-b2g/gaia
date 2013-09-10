/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SimFdnLock = {
  dialog: document.getElementById('call-pin2-dialog'),
  simFdnDesc: document.querySelector('#fdn-enabled small'),
  simFdnCheckBox: document.querySelector('#fdn-enabled input'),
  changePin2Item: document.getElementById('fdn-changePIN2'),
  changePin2Button: document.querySelector('#fdn-changePIN2 button'),
  resetPin2Item: document.getElementById('fdn-changePIN2'),
  resetPin2Button: document.querySelector('#fdn-resetPIN2 button'),
  contactsContainer: document.getElementById('fdn-contactsContainer'),

  updateFdnStatus: function spl_updateSimStatus() {
    var self = this;
    var req = IccHelper.getCardLock('fdn');
    req.onsuccess = function spl_checkSuccess() {
      var enabled = req.result.enabled;
      localize(self.simFdnDesc, enabled ? 'enabled' : 'disabled');
      self.simFdnCheckBox.disabled = false;
      self.simFdnCheckBox.checked = enabled;
      self.changePin2Item.hidden = !enabled;
    };
  },

  init: function spl_init() {
    if (!IccHelper.enabled) {
      return;
    }

    FDN_AuthorizedNumbers.init();
    this.renderAuthorizedNumbers();

    var callback = this.updateFdnStatus.bind(this);
    IccHelper.addEventListener('cardstatechange', callback);

    var pinDialog = new SimPinDialog(this.dialog);

    this.simFdnCheckBox.onchange = function spl_togglePin2() {
      console.log('cardState = ' + IccHelper.cardState);
      var action = this.checked ? 'enable_fdn' : 'disable_fdn';
      if (IccHelper.cardState === 'puk2Required') { // XXX not implemented yet
        action = 'unlock_puk2';
      }
      pinDialog.show(action, callback, callback);
    };

    this.changePin2Button.onclick = function spl_changePin2() {
      pinDialog.show('change_pin2');
    };

    this.resetPin2Button.onclick = function spl_resetPin2() {
      pinDialog.show('unlock_puk2');
    };

    this.updateFdnStatus();
  },

  renderAuthorizedNumbers: function() {
    this.contactsContainer.innerHTML = '';

    FDN_AuthorizedNumbers.getContacts(null, function(contacts) {
      var contact;
      for (var i = 0, l = contacts.length; i < l; i++) {
        contact = this.renderFDNContact(
          contacts[i].name,
          contacts[i].number
        );
        this.contactsContainer.appendChild(contact);
      }
    }.bind(this));
  },

  renderFDNContact: function(name, number) {
    var li = document.createElement('li');
    var nameContainer = document.createElement('span');
    var numberContainer = document.createElement('small');

    nameContainer.textContent = name;
    numberContainer.textContent = number;
    li.appendChild(numberContainer);
    li.appendChild(nameContainer);

    return li;
  }
};

navigator.mozL10n.ready(SimFdnLock.init.bind(SimFdnLock));

