'use strict';

/* exported CallGroupMenu */

/* globals CallInfo, LazyLoader, MozActivity, OptionMenu */

var CallGroupMenu = (function() {

  var _showCallInfo = function(phoneNumber, day, type) {
    LazyLoader.load(['/dialer/js/call_info.js',
                     '/dialer/style/call_info.css'], function() {
      CallInfo.show(phoneNumber, day, type);
    });
  };

  var _sendSms = function(phoneNumber) {
    /* jshint nonew: false */
    try {
      new MozActivity({
        name: 'new',
        data: {
          type: 'websms/sms',
          number: phoneNumber
        }
      });
    } catch (e) {
      console.error('Error while creating activity: ' + e);
    }
  };

  return {
    show: function(groupPrimaryInfo, phoneNumber, day, type) {
      var params = {
        items: [{
          l10nId: 'callInformation',
          method: _showCallInfo,
          params: [phoneNumber, day, type]
        },{
          l10nId: 'sendSms',
          method: _sendSms,
          params: [phoneNumber]
        },{ // Last item is the Cancel button
          l10nId: 'cancel',
          incomplete: true
        }],
        header: groupPrimaryInfo,
        classes: ['call-group-menu']
      };

      LazyLoader.load(['/shared/js/option_menu.js',
                       '/shared/style/action_menu.css'], function() {
        new OptionMenu(params).show();
      });
    }
  };

}());
