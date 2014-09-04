'use strict';

var FmdSms = {

	init : function () {
		console.log('!!!!!!!!!!!!!! [fmdsms] init !!!!!!!!!!!!!!');

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
		console.log('!!!!!!!!!!!!!! [fmdsms] sender = ' + event.message.sender + ' !!!!!!!!!!!!!!');
		console.log('!!!!!!!!!!!!!! [fmdsms] message = ' + event.message.body + ' !!!!!!!!!!!!!!');
	}

};

navigator.mozL10n.once(FmdSms.init.bind(FmdSms));