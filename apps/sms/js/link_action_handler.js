'use strict';
/*
 Centralized event handling for various
 data-actions url, email, phone in a message
*/

var LinkActionHandler = {
  handleBrowserEvent:
  function lah_handleBrowserEvent(link) {
    try {
      var activity = new MozActivity({
        name: 'view',
        data: {
          type: 'url',
          url: link
          }
      });
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },

  handlePhoneEvent:
  function lah_handlePhoneEvent(phoneNumber) {
    this.call(phoneNumber);
  },

   handleLongPressPhoneEvent:
  function lah_handleLongPressPhoneEvent(phoneNumber) {
    var self = this;
    var options = new OptionMenu({
    'items': [
      {
        name: _('createNewContact'),
        method: function optionMethod(param) {
          self.createNewContact(param);
        },
        params: [phoneNumber]
      },
      {
        name: _('addToExistingContact'),
        method: function optionMethod(param) {
          self.addToExistingContact(param);
        },
        params: [phoneNumber]
      },
      {
        name: _('cancel'),
        method: function optionMethod(param) {
          // TODO Add functionality if needed
        }
      }
    ],
    'title': phoneNumber
    });
    options.show();
  },

   createNewContact: function lah_createNewContact(phoneNumber) {
    try {
      var activity = new MozActivity({
        name: 'new',
        data: {
          type: 'webcontacts/contact',
          params: {
            'tel': phoneNumber
          }
        }
      });
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },

  addToExistingContact: function lah_addToExistingContact(phoneNumber, 
    onSuccess, onFailure) {
      try {
        var activity = new MozActivity({
          name: 'update',
          data: {
            type: 'webcontacts/contact',
            params: {
              'tel': phoneNumber
            }
          }
        });
        activity.onsuccess = function lah_contactUpdateSuccess() {
          if (onSuccess && typeof onSuccess === 'function') {
            onSuccess();
          }
        };
        activity.onerror = function lah_contactUpdateFailure() {
          if (onFailure && typeof onFailure === 'function') {
            onFailure();
          }
        };
    } catch (e) {
        console.log('WebActivities unavailable? : ' + e);
    }
  },

  call: function lah_call(phoneNumber) {
    try {
      var activity = new MozActivity({
        name: 'dial',
        data: {
          type: 'webtelephony/number',
          number: phoneNumber
        }
      });
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },

  //Invokes handleBrowserEvent for now, and
  //in future will expand to call handlePhoneEvent,
  //handleEmailEvent.
  handleTapEvent:
   function lah_handleTapEvent(evt) {
     //Return if activity is already invoked
     if (this.activityInProgress) { return; }
     var eventAction = evt.target.dataset.action;
     if (eventAction) {
      switch (eventAction) {
        case 'url-link':
          this.activityInProgress = true;
          this.handleBrowserEvent(evt.target.dataset.url);
        break;
        case 'phone-link':
          this.activityInProgress = true;
          this.handlePhoneEvent(evt.target.dataset.phonenumber);
        break;
      }
    }
  },

  //Invokes handleLongPressPhoneEvent for now, and
  //in future will expand to call handleLongPressEmailEvent
  handleLongPressEvent:
   function lah_handleLongPressEvent(evt) {
     var eventAction = evt.target.dataset.action;
     if (eventAction) {
      switch (eventAction) {
        case 'phone-link':
          this.handleLongPressPhoneEvent(evt.target.dataset.phonenumber);
        break;
      }
    }
  },

  resetActivityInProgress:
   function lah_resetActivityInProgress() {
     this.activityInProgress = false;
  }
};
