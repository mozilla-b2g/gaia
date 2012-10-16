// FB constants
var fb = window.fb || {};
fb.CATEGORY = 'facebook';

var FacebookIntegration = {
	get fbExtensions() {
    delete this.fbExtensions;
    return this.fbExtensions = document.getElementById('fb-extensions');
  },
  get fbImport() {
    delete this.fbImport;
    return this.fbImport = document.getElementById('fb_import');
  },
	init: function fb_init(){
		this.fbImport.addEventListener('click', this);
		document.addEventListener('fb_imported', this);
	},
	handleEvent: function fb_he(event) {
		switch(event.type) {
			case 'click':
				this.fbExtensions.classList.remove('hidden');
				Contacts.extFb.importFBFromUrl('/contacts/fb_import.html');
				break;

			case 'fb_imported':
        this.fbExtensions.classList.add('hidden');
				this.updateContactsNumber();
				break;
		}
	},
	updateContactsNumber: function fb_ucn() {
		var fbMessage = document.querySelector('#fb_import > small');
		fbMessage.textContent = '... checking';

		var fbUpdateTotals = function fbUpdateTotals(imported, total) {
        if (total == null) {
          fbMessage.textContent = 'Contacts not imported';
        } else {
  		    fbMessage.textContent = imported + ' imported of ' + total;
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
    }

    req.onerror = function() {
      console.error('Could not get number of local contacts');
    }
	}


}