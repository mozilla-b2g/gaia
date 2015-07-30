/*global MozActivity */

(function(exports) {
'use strict';

function handleActivity(activity, onsuccess, onerror) {
  // Note: the MozActivity is intentionally constructed in the caller and
  // passed down to this function in order to make it possible to pass an
  // inline option to its constructor in the caller for the sake of static
  // analysis tools.  Please do not change that!

  if (typeof onsuccess === 'function') {
    activity.onsuccess = onsuccess;
  }

  activity.onerror = typeof onerror === 'function' ? onerror : function(error) {
    console.warn('Unhandled error spawning activity; ' + error.message);
  };
}

var ActivityPicker = {
  dial: function ap_call(number, onsuccess, onerror) {
    handleActivity(new MozActivity({
      name: 'dial',
      data: {
        type: 'webtelephony/number',
        number: number
      }
    }), onsuccess, onerror);
  },
  email: function ap_email(email, onsuccess, onerror) {
    handleActivity(new MozActivity({
      name: 'new',
      data: {
        type: 'mail',
        URI: 'mailto:' + email
      }
    }), onsuccess, onerror);
  },
  url: function ap_browse(url, onsuccess, onerror) {
    handleActivity(new MozActivity({
      name: 'view',
      data: {
        type: 'url',
        url: url
      }
    }), onsuccess, onerror);
  },
  createNewContact: function ap_createNewContact(contactProps) {
    handleActivity(new MozActivity({
      name: 'new',
      data: {
        type: 'webcontacts/contact',
        params: contactProps
      }
    }));
  },
  addToExistingContact: function ap_addToExistingContact(contactProps) {
    handleActivity(new MozActivity({
      name: 'update',
      data: {
        type: 'webcontacts/contact',
        params: contactProps
      }
    }));
  },
  viewContact: function ap_viewContact(contactProps) {
    handleActivity(new MozActivity({
      name: 'open',
      data: {
        type: 'webcontacts/contact',
        params: contactProps
      }
    }));
  },
  openSettings: function ap_openSettings(onsuccess, onerror) {
    handleActivity(new MozActivity({
      name: 'configure',
      data: {
        target: 'device',
        section: 'messaging'
      }
    }), onsuccess, onerror);
  }
};

exports.ActivityPicker = ActivityPicker;

}(this));
