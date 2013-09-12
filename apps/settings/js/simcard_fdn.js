/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SimFdnLock = {
  dialog: document.getElementById('call-pin2-dialog'),
  simFdnDesc: document.querySelector('#fdn-enabled small'),
  simFdnCheckBox: document.querySelector('#fdn-enabled input'),
  resetPin2Item: document.getElementById('fdn-resetPIN2'),
  resetPin2Button: document.querySelector('#fdn-resetPIN2 button'),
  contactsContainer: document.getElementById('fdn-contactsContainer'),

  // nodes needed to add number to authorized list
  addNumberSubmit: document.getElementById('fdn-addNumber-submit'),
  addNumberName: document.getElementById('fdn-addNumber-name'),
  addNumberNumber: document.getElementById('fdn-addNumber-number'),
  addNumberActionMenu: document.getElementById('add-contact-action-menu'),
  addNumberActionMenuCancel:
    document.getElementById('add-contact-action-menu-cancel'),
  addNumberActionMenuEdit:
    document.getElementById('add-contact-action-menu-edit'),
  addNumberActionMenuDelete:
    document.getElementById('add-contact-action-menu-delete'),

  editedNumber: null,

  updateFdnStatus: function spl_updateSimStatus() {
    var self = this;
    var req = IccHelper.getCardLock('fdn');
    req.onsuccess = function spl_checkSuccess() {
      var enabled = req.result.enabled;
      localize(self.simFdnDesc, enabled ? 'enabled' : 'disabled');
      self.simFdnCheckBox.disabled = false;
      self.simFdnCheckBox.checked = enabled;
      self.resetPin2Item.hidden = !enabled;
    };
  },

  init: function spl_init() {
    if (!IccHelper.enabled) {
      return;
    }

    var callback = this.updateFdnStatus.bind(this);
    IccHelper.addEventListener('cardstatechange', callback);

    var pinDialog = new SimPinDialog(this.dialog);

    this.simFdnCheckBox.disabled = true;
    this.simFdnCheckBox.onchange = function spl_togglePin2() {
      var action = this.checked ? 'enable_fdn' : 'disable_fdn';
      if (IccHelper.cardState === 'puk2Required') {
        action = 'unlock_puk2';
      }
      pinDialog.show(action, callback, callback);
    };

    this.resetPin2Button.onclick = function spl_resetPin2() {
      pinDialog.show('change_pin2');
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

