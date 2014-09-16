'use strict';

var PrivacyPanel = {

 init : function () {
   console.log('!!!!!!!!!!!!!! [privacy-panel] init !!!!!!!!!!!!!!');

   this._addListener();
 },

 _addListener : function () {
   var mobileMessage = navigator.mozMobileMessage;
   if (mobileMessage) {
     mobileMessage.getThreads();
     mobileMessage.addEventListener('received', this._onSMSReceived.bind(this));
   }
 },

 _onSMSReceived : function (event) {
   console.log('!!!!!!!!!!!!!! [privacy-panel] sender = ' + event.message.sender + ' !!!!!!!!!!!!!!');
   console.log('!!!!!!!!!!!!!! [privacy-panel] message = ' + event.message.body + ' !!!!!!!!!!!!!!');
 }

};

navigator.mozL10n.once(FmdSms.init.bind(FmdSms));