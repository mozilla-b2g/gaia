(function(exports) {
  'use strict';
  /*
   Centralized event handling for various
   data-actions url, email, phone in a message
  */
  var activityInProgress = false;

  function createOptionMenuOnLongPress(param, title) {
    var _ = navigator.mozL10n.get;
    var options = new OptionMenu({
      'items': [
      {
        name: _('createNewContact'),
        method: function optionMethod(param) {
          ActivityPicker.createNewContact(param);
        },
        params: param
      },
      {
        name: _('addToExistingContact'),
        method: function optionMethod(param) {
          ActivityPicker.addToExistingContact(param);
        },
        params: param
      },
      {
        name: _('cancel'),
        method: function optionMethod(param) {
        // TODO Add functionality if needed
        }
      }
      ],
      'title': title
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
            createOptionMenuOnLongPress(
              [{'tel': dataset.phonenumber}], dataset.phonenumber);
            break;
          case 'email-link':
            createOptionMenuOnLongPress(
              [{'email': dataset.email}], dataset.email);
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
