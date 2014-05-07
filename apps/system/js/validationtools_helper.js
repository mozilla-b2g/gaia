'use strict';

/* exported ValidationToolsHelper*/
/* globals IACHandler*/

/**
* Validation Tools Helper
*
* This file is a temporary solution for validationTools app to hack several special events such as
* hardware-button etc.. The current architecture of gecko only supports reporting those events to
* system module and no loger dispatching to other gaia apps. Therefore, we have to establish an
* customized channel base on IAC so as to satisfy the specific function of validationTools.
*
*/

(function(exports) {

	var DEBUG = true;

	// Specified type identifier for hardware-button event
	var EVENTTYPE = 'keypad';

	// List all events type here and should be strict one to one mapping
	// with the set of system_connection in validationtools app
	var EVENTLIST = {
		home: 'home',
		holdhome: 'holdhome',
		volumeup: 'volumeup',
		volumedown: 'volumedown'
	};

	// Important:to place this file before other system modules so as to ensure
	// we can prevent those modules from receiving and responding the event.
	var ValidationToolsHelper = function(){

		// true: port existes and validationtools app is alive
		// false: validationtools app is dead(no matter what status the port is)
		this._isPortEnable = false;

		this._eventList = null;

		// the identifier is to ensure the fault-tolerant especially on some abnormal conditions
		// such as validationtools app was exceptionally killed with no chance to terminate the monitoring
		this._appIdentifier = null;

	};

	ValidationToolsHelper.prototype = {

	    debug: function vth_debug() {
	      if (DEBUG) {
	        console.log('[ValidationToolsHelper]' + '[' + Date.now() + ']'
						+ Array.prototype.slice.call(arguments).concat().join());
	      }
	    },

		attachEvent: function vth_attachEvent() {
			var list = this._eventList;

			for(var key in list) {
				window.addEventListener(list[key], this, true);
			}
		},

		detachEvent: function vth_attachEvent() {
			var list = this._eventList;

			for(var key in list) {
				window.removeEventListener(list[key], this);
			}
		},

		// Beacuse we must intercept the hardware-button events if needed,
		// so the monitor should be registered at the initial time to prevent
		// system app from receiving those messages first 
		start: function vth_start() {
			this.debug(' start.');

			this._eventList = EVENTLIST;
			this.attachEvent();
			window.addEventListener('iac-validationtools-request', this.handleMessage.bind(this));
		},

		stop: function vth_stop() {
			this.debug(' end.');
			window.removeEventListener('iac-validationtools-request', this.handleMessage.bind(this));
		},

		// To response the iac message from validationtools app
		// all message types should be consistent with the remote
		handleMessage: function vth_handleMessage(evt) {
			var message = evt.detail;
			var command = message.detail.command;

			if(command === 'open') {
				var currentApp = WindowManager.getDisplayedApp();

				this._isPortEnable = true;
				this._appIdentifier = currentApp;
			}else if(command === 'close') {
				this._appIdentifier = null;
				this._isPortEnable = false;
				this.detachEvent();
			}

			this.debug('Exit handleMessage:' + JSON.stringify(message) 
											 + ', _isPortEnable=' + this._isPortEnable
											 + ', _appIdentifier=' + this._appIdentifier);
		},

		handleEvent: function vth_handleEvent(evt) {
			var type = evt.type;
			var message = {};
			var currentApp = WindowManager.getDisplayedApp();
			this.debug(' handleEvent, current type is ' + type);

			//To judge if the port is existed or not
			if(!this._isPortEnable) {
				this.debug(' Error: no handling for port is not enable.');
				return;
			}

			// Notice:if current app is not validationtools and portEnable is true,
			// we judge that validationtools app has been killed abnormally and then
			// the monitor should be released immediately to enable system functioning.
			if(this._isPortEnable && currentApp !== this._appIdentifier) {
				this.debug(' Error: current app is not validationtools but port is enable!!!');
				this._isPortEnable = false;
				this.detachEvent();
				return;
			}

			if(type in this._eventList) {
				evt.stopImmediatePropagation();

				message.detail = this._packageMessage(type);
				this._sendMessage(message, this.notifySuccess.bind(this), this.notifyError.bind(this));
			}
		},

		// The detail of message should be defined as:
		// {
		//		command : XXX
		//		eventType: YYY
		// }
		_packageMessage: function vth_packageMessage(typeData) {
			if(typeData) {
				return {
					type: EVENTTYPE,
					data: typeData
				};
			}
		},

		_sendMessage: function vth_sendMessage(message, successCallback, errorCallback) {
			var port;

			try {
				port = IACHandler.getPort('validationtools-request');
				port.postMessage(message);

				if (typeof successCallback === 'function') {
					this.debug('[ notifySuccess]' + JSON.stringify(message));
					successCallback(message);
				}
			} catch (e) {
				if (typeof errorCallback === 'function') {
					this.debug('[ notifyError] errorInfo:' + JSON.stringify(e) + '\n message:' + JSON.stringify(message));
					errorCallback(e.message, message);
				}
			}
		},

		// When callback function is called, there's no defination of this
		// currently no time to research the issue and will solve soon...
		notifySuccess: function vth_notifySuccess(message) {
			this.debug('[ notifySuccess]' + JSON.stringify(message));
			return true;
		},

		notifyError: function vth_notifyError(errorInfo, message) {
			this.debug('[ notifyError] errorInfo:' + JSON.stringify(errorInfo) + '\n message:' + JSON.stringify(message));
			return true;
		}
	};

	exports.ValidationToolsHelper = ValidationToolsHelper;
})(window);

window.ValidationToolsHelper = new ValidationToolsHelper().start();