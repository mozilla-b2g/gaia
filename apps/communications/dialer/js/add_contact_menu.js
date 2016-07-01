'use strict';

/* exported AddContactMenu */

/* globals LazyLoader, MozActivity, OptionMenu */

var AddContactMenu = (function() {

  var _createNewContact = function(phoneNumber) {
    launchActivity('new', phoneNumber);
  };

  var _addToExistingContact = function(phoneNumber) {
    launchActivity('update', phoneNumber);
  };

  var launchActivity = function(name, phoneNumber) {
    try {
      /* jshint nonew: false */
      new MozActivity({
        name: name,
        data: {
          type: 'webcontacts/contact',
          params: {
            'tel': phoneNumber
          }
        }
      });
    } catch (e) {
      console.error('Error while creating activity');
    }
  };

  return {
    show: function(phoneNumber) {
      var params = {
        items: [{
          l10nId: 'createNewContact',
          method: _createNewContact,
          params: [phoneNumber],
          hideTimeout: 300
        },{
          l10nId: 'addToExistingContact',
          method: _addToExistingContact,
          params: [phoneNumber],
          hideTimeout: 300
        },{ // Last item is the Cancel button
          l10nId: 'cancel',
          incomplete: true
        }],
        header: phoneNumber
      };

      LazyLoader.load(['/shared/js/option_menu.js',
                       '/shared/style/action_menu.css'], function() {
        /* jshint nonew: false */
        new OptionMenu(params).show();
      });
    }
  };

}());
