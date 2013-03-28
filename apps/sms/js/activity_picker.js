'use strict';

/*
The Activity Picker exposes common activity
calls used by SMS App
*/

var ActivityPicker = {
  call:
   function ap_call(phone) {
    try {
      var activity = new MozActivity({
        name: 'dial',
        data: {
          type: 'webtelephony/number',
          number: phone
        }
      });
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },
  createNewContact:
   function ap_createNewContact(param,
     onSuccess, onFailure) {
     try {
      var activity = new MozActivity({
        name: 'new',
        data: {
          type: 'webcontacts/contact',
          params: param
        }
      });
      activity.onsuccess = function ap_contactCreateSuccess() {
        if (onSuccess && typeof onSuccess === 'function') {
          onSuccess();
        }
      };
      activity.onerror = function ap_contactCreateFailure() {
        if (onFailure && typeof onFailure === 'function') {
          onFailure();
        }
      };
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },
  addToExistingContact:
   function ap_addToExistingContact(param, 
    onSuccess, onFailure) {
    try {
      var activity = new MozActivity({
        name: 'update',
        data: {
          type: 'webcontacts/contact',
          params: param
        }
      });
      activity.onsuccess = function ap_contactUpdateSuccess() {
        if (onSuccess && typeof onSuccess === 'function') {
          onSuccess();
        }
      };
      activity.onerror = function ap_contactUpdateFailure() {
        if (onFailure && typeof onFailure === 'function') {
          onFailure();
        }
      };
    } catch (e) {
        console.log('WebActivities unavailable? : ' + e);
    }
  }
};
