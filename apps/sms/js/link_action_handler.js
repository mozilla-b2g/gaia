(function(exports) {
  'use strict';
  /*
   Centralized event handling for various
   data-actions url, email, phone in a message
  */
  var activityInProgress = false;

  function createNewContact(param) {
    try {
      var activity = new MozActivity({
        name: 'new',
        data: {
          type: 'webcontacts/contact',
          params: param
        }
      });
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  };

  function addToExistingContact(param, 
    onSuccess, onFailure) {
    try {
      var activity = new MozActivity({
        name: 'update',
        data: {
          type: 'webcontacts/contact',
          params: param
        }
      });
      activity.onsuccess = function contactUpdateSuccess() {
        if (onSuccess && typeof onSuccess === 'function') {
          onSuccess();
        }
      };
      activity.onerror = function contactUpdateFailure() {
        if (onFailure && typeof onFailure === 'function') {
          onFailure();
        }
      };
    } catch (e) {
        console.log('WebActivities unavailable? : ' + e);
    }
  };

  function handleLongPressPhoneEvent(phoneNumber) {
    var options = new OptionMenu({
      'items': [
      {
        name: _('createNewContact'),
        method: function optionMethod(param) {
          createNewContact(param);
        },
        params: [{'tel': phoneNumber}]
      },
      {
        name: _('addToExistingContact'),
        method: function optionMethod(param) {
          addToExistingContact(param);
        },
        params: [{'tel': phoneNumber}]
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
  };

  var LinkActionHandler = {
    handleTapEvent:
      function lah_handleTapEvent(evt) {
      var dataset, action, activity;
      //Return if activity is already invoked
      if (activityInProgress) { return; }
      action = evt.target.dataset.action;
      dataset = evt.target.dataset;
      if (action) {
        switch (action) {
          case 'url-link':
            activity = {
              name: 'view',
              data: {
                type: 'url',
                url: dataset.url
              }
            };
            activityInProgress = true;
            break;
          case 'email-link':
            activity = {
              name: 'new',
              data: {
                type: 'mail',
                URI: 'mailto:' + dataset.email
              }
            };
            activityInProgress = true;
            break;
          case 'phone-link':
            activity = {
              name: 'dial',
              data: {
                type: 'webtelephony/number',
                number: dataset.phonenumber
              }
            };
            activityInProgress = true;
            break;
        }
        if (activity && MozActivity) {
          try {
            new MozActivity(activity);
          }
          catch (e) {
            console.log('WebActivities unavailable? : ' + e);
          }
        }
      }
    },
    //Invokes handleLongPressPhoneEvent for now, and
    //in future will expand to call handleLongPressEmailEvent
    handleLongPressEvent:
      function lah_handleLongPressEvent(evt) {
      var action = evt.target.dataset.action;
      var dataset = evt.target.dataset;
      if (action) {
        switch (action) {
          case 'phone-link':
            handleLongPressPhoneEvent(dataset.phonenumber);
            break;
        }
      }
    },
    resetActivityInProgress:
      function lah_resetActivityInProgress() {
      activityInProgress = false;
    }
  };
  exports.LinkActionHandler = LinkActionHandler;
}(this));
