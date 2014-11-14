'use strict';

/* exported CallGroupMenu */


/* globals ConfirmDialog, CallLogDBManager, CallInfo, LazyLoader, MozActivity, 
           OptionMenu  */

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

  var _delete = function(evt) {

    var msg = {'id': 'delete-n-log?', 'args': {n: 1}};
    var yesObject = {
      title: 'delete',
      isDanger: true,
      callback: function deleteLogGroup() {

        
        var logGroup = evt.target;

        var dataset = logGroup.dataset;
        var toDelete = {
          date: parseInt(dataset.timestamp),
          number: dataset.phoneNumber === null ? '' : dataset.phoneNumber,
          type: dataset.type
        };
        if (dataset.status) {
          toDelete.status = dataset.status;
        }

        CallLogDBManager.deleteGroupList([toDelete], function() {
          // remove DOM elements.
          var olContainer = logGroup.parentNode;
          olContainer.removeChild(logGroup);
          if (olContainer.children.length === 0) {
            var section = olContainer.parentNode;
            section.parentNode.removeChild(section);
          }
        });

        ConfirmDialog.hide();
      }
    };

    var noObject = {
      title: 'cancel',
      callback: function onCancel() {
        ConfirmDialog.hide();
      }
    };

    ConfirmDialog.show(null, msg, noObject, yesObject);
  };

  return {
    show: function(groupPrimaryInfo, phoneNumber, date, type, status, evt) {

      var params = {
        items: [{
          l10nId: 'callInformation',
          method: _showCallInfo,
          params: [phoneNumber, date, type, status]
        },{
          l10nId: 'sendSms',
          method: _sendSms,
          params: [phoneNumber]
        },{
          l10nId: 'delete',
          method: _delete,
          params: [evt]
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
