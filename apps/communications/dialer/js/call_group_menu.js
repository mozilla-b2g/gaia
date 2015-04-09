'use strict';

/* exported CallGroupMenu */

/* globals CallInfo, LazyLoader, MozActivity, OptionMenu */

var CallGroupMenu = (function() {

  var _showCallInfo = function(phoneNumber, date, type, status) {
    LazyLoader.load(['/dialer/js/call_info.js',
                     '/dialer/style/call_info.css'], function() {
      CallInfo.show(phoneNumber, date, type, status);
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
    show: function(groupPrimaryInfo, phoneNumber, date, type, status) {
      var header = document.createElement('bdi');
      header.className = 'ellipsis-dir-fix';
      header.textContent = groupPrimaryInfo || '';

      var params = {
        items: [{
          l10nId: 'callInformation',
          method: _showCallInfo,
          params: [phoneNumber, date, type, status]
        },{
          l10nId: 'sendSms',
          method: _sendSms,
          params: [phoneNumber]
        },{ // Last item is the Cancel button
          l10nId: 'cancel',
          incomplete: true
        }],
        header: header,
        classes: ['call-group-menu']
      };

      LazyLoader.load(['/shared/js/option_menu.js',
                       '/shared/style/action_menu.css'], function() {
        new OptionMenu(params).show();
      });
    }
  };

}());
