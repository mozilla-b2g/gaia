/*global MozActivity */

(function(exports) {
'use strict';

function tryActivity(opts, onsuccess, onerror) {
  var activity;

  if (typeof onerror !== 'function') {
    onerror = function(error) {
      console.warn('Unhandled error spawning activity; ' + error.message);
    };
  }

  try {
    activity = new MozActivity(opts);

    if (typeof onsuccess === 'function') {
      activity.onsuccess = onsuccess;
    }

    activity.onerror = onerror;

  } catch (e) {
    onerror.call(activity, e);
  }
}

var ActivityPicker = {
  dial: function ap_call(number, onsuccess, onerror) {
    var params = {
      name: 'dial',
      data: {
        type: 'webtelephony/number',
        number: number
      }
    };

    tryActivity(params, onsuccess, onerror);
  },
  email: function ap_email(email, onsuccess, onerror) {
    var params = {
      name: 'new',
      data: {
        type: 'mail',
        URI: 'mailto:' + email
      }
    };

    tryActivity(params, onsuccess, onerror);
  },
  url: function ap_browse(url, onsuccess, onerror) {
    var params = {
      name: 'view',
      data: {
        type: 'url',
        url: url
      }
    };

    tryActivity(params, onsuccess, onerror);
  },
  createNewContact:
   function ap_createNewContact(contactProps, onsuccess, onerror) {
    var params = {
      name: 'new',
      data: {
        type: 'webcontacts/contact',
        params: contactProps
      }
    };

    tryActivity(params, onsuccess, onerror);
  },
  addToExistingContact:
   function ap_addToExistingContact(contactProps, onsuccess, onerror) {
    var params = {
      name: 'update',
      data: {
        type: 'webcontacts/contact',
        params: contactProps
      }
    };

    tryActivity(params, onsuccess, onerror);
  },
  viewContact:
   function ap_viewContact(contactProps, onsuccess, onerror) {
    var params = {
      name: 'open',
      data: {
        type: 'webcontacts/contact',
        params: contactProps
      }
    };

    tryActivity(params, onsuccess, onerror);
  },
  sendMessage: function ap_sendMessage(phone, onsuccess, onerror) {
    var params = {
      name: 'new',
      data: {
        type: 'websms/sms',
        number: phone
      }
    };

    tryActivity(params, onsuccess, onerror);
  },
  openSettings: function ap_openSettings(onsuccess, onerror) {
    var params = {
      name: 'configure',
      data: {
        target: 'device',
        section: 'messaging'
      }
    };

    tryActivity(params, onsuccess, onerror);
  }
};

exports.ActivityPicker = ActivityPicker;

}(this));
