'use strict';

// FB constants
var fb = window.fb || {};
// fb.Category: contact category
fb.CATEGORY = 'facebook';
fb.CONTACTS_APP_ORIGIN = document.location.protocol +
  '//' + document.location.host;

var _ = navigator.mozL10n.get;

var FacebookIntegration = {
  get fbExtensions() {
    delete this.fbExtensions;
    return this.fbExtensions = document.getElementById('fb-extensions');
  },

  get fbImport() {
    delete this.fbImport;
    return this.fbImport = document.getElementById('fb_import');
  },

  get fbImportButton() {
    delete this.fbImportButton;
    return this.fbImportButton = document.getElementById('fb-import-button');
  },

  get noNetworkMsg() {
    delete this.noNetworkMsg;
    return this.noNetworkMsg = document.getElementById('no-network');
  },

  get fbImportFeedback() {
    delete this.fbImportFeedback;
    return this.fbImportFeedback = document.getElementById(
      'fb_import_feedback');
  },

  get fbAfterImport1() {
    delete this.fbAfterImport1;
    return this.fbAfterImport1 = document.getElementById(
      'fb_after_import1');
  },

  get fbAfterImport2() {
    delete this.fbAfterImport2;
    return this.fbAfterImport2 = document.getElementById(
      'fb_after_import2');
  },

  init: function fb_init() {
    this.fbImportButton.addEventListener('click', this);
    document.addEventListener('fb_imported', this);
  },

  handleEvent: function fb_he(event) {
    switch (event.type) {
      case 'click':
        if (event.target === this.fbImportButton) {
          FbLauncher.start('facebook');
        }
        break;
      case 'fb_imported':
        this.toggleToImportedState();
        this.updateContactsNumber();
        break;
    }
  },

  checkFbImport: function fb_check(nextState) {
    var fbOption = this.fbImportButton;
    var noNetMsg = this.noNetworkMsg;

    if (nextState === 'disabled') {
      fbOption.setAttribute('disabled', 'disabled');
      noNetMsg.classList.remove('hidden');
    }
    else if (nextState === 'enabled') {
      fbOption.removeAttribute('disabled');
      noNetMsg.classList.add('hidden');
    }
  },

  toggleToImportedState: function fb_tg_imported() {
    this.fbImport.classList.add('hidden');
    this.fbAfterImport1.classList.remove('hidden');
    this.fbAfterImport2.classList.remove('hidden');
    this.fbImport.parentNode.classList.remove('importOption');
  },

  updateContactsNumber: function fb_ucn() {
    this.fbImportFeedback.textContent = _('fb-checking');

    var self = this;
    var fbUpdateTotals = function fbUpdateTotals(imported, total) {
      if (total == null) {
        self.fbImportFeedback.textContent = _('notImportedYet');
      } else {
        self.fbImportFeedback.textContent = _('facebook-import-msg', {
          'imported': imported,
          'total': total
        });
      }
    };

    var req = fb.utils.getNumFbContacts();
    req.onsuccess = function() {
      var friendsOnDevice = req.result;
      var callbackListener = {
        'local': function localContacts(number) {
          fbUpdateTotals(friendsOnDevice, number);
        },
        'remote': function remoteContacts(number) {
          fbUpdateTotals(friendsOnDevice, number);
        }
      };
      fb.utils.numFbFriendsData(callbackListener);
    };
    req.onerror = function() {
      console.error('Could not get number of local contacts');
    };
  }
};

var FacebookConfiguration = function FacebookConfiguration() {
  var disableFacebook = function disableFacebook() {
    FacebookIntegration.fbImport.classList.add('hidden');
  };

  var enableFacebook = function enableFacebook() {
    FacebookIntegration.fbImport.classList.remove('hidden');
  };

  var req = utils.config.load('/contacts/config.json');
  req.onload = function(configData) {
    if (configData.facebookEnabled === true) {
      enableFacebook();
    } else {
      disableFacebook();
    }
  };
  req.onerror = function(code) {
    disableFacebook();
  };
}();
