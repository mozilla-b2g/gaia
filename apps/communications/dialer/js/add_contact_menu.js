'use strict';

/* exported AddContactMenu */

/* globals LazyLoader, MozActivity, OptionMenu */

var AddContactMenu = (function() {

  var _createNewContact = function _createNewContact(phoneNumber) {
    launchActivity('new', phoneNumber);
  };

  var _addToExistingContact = function _addToExistingContact(phoneNumber) {
    launchActivity('update', phoneNumber);
  };

  var launchActivity = function launchActivity(name, phoneNumber) {
    var options = {
      name: name,
      data: {
        type: 'webcontacts/contact',
        params: {
          'tel': phoneNumber
        }
      }
    };
    try {
      /* jshint nonew: false */
      new MozActivity(options);
    } catch (e) {
      console.error('Error while creating activity');
    }
  };

  return {
    show: function show(phoneNumber) {
      var params = {
        items: [{
          l10nId: 'createNewContact',
          method: _createNewContact,
          params: [phoneNumber]
        },{
          l10nId: 'addToExistingContact',
          method: _addToExistingContact,
          params: [phoneNumber]
        },{ // Last item is the Cancel button
          l10nId: 'cancel',
          incomplete: true
        }],
        header: phoneNumber
      };

      LazyLoader.load(['/shared/js/option_menu.js',
                       '/shared/style/action_menu.css'], function () {
        /* jshint nonew: false */
        new OptionMenu(params).show();
      });
    }
  };

}());
