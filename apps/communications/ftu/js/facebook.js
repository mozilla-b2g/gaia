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

  get fbImportFeedback() {
    delete this.fbImportFeedback;
    return this.fbImportFeedback = document.getElementById(
      'fb_import_feedback');
  },

  init: function fb_init() {
    this.fbImport.addEventListener('click', this);
    document.addEventListener('fb_imported', this);
  },

  handleEvent: function fb_he(event) {
    switch (event.type) {
      case 'click':
        FbLauncher.start();
        break;
      case 'fb_imported':
        this.updateContactsNumber();
        break;
    }
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

  var req = utilities.config.load('/contacts/config.json');
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
