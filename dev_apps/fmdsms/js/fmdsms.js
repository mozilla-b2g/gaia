/* global Crypto */

'use strict';

var RING_ENABLED = 'rpp.ring.enabled';
var LOCK_ENABLED = 'rpp.lock.enabled';
var LOCATE_ENABLED = 'rpp.locate.enabled';
var WIPE_ENABLED = 'rpp.wipe.enabled';
var PASSWORD = 'rpp.password';
var PREFIX_CMD = 'FmD:';
var RING_CMD = 'SoundAlarm';
var LOCK_CMD = 'LockDevice';
var LOCATE_CMD = 'LocateDevice';
var WIPE_CMD = 'WipeDevice';

var FmdSms = {

	_ringEnabled : false,
	_lockEnabled : false,
	_locateEnabled : false,
	_wipeEnabled : false,
	_password : null,

	init : function () {
		console.log('!!!!!!!!!!!!!! [fmdsms] init !!!!!!!!!!!!!!');

		this._getSettings();
		this._observeSettings();
		this._addListener();
	},

	_getSettings : function () {
		var self = this;

		var settings = navigator.mozSettings;
		if (settings) {
			var lock = settings.createLock();
			if (lock) {
				var reqRing = lock.get(RING_ENABLED);
				if (reqRing) {
					reqRing.onsuccess = function () {
						var value = reqRing.result[RING_ENABLED];
						if (typeof value == 'boolean') {
							self._ringEnabled = value;
						} else if (typeof value == 'string') {
							self._ringEnabled = (value == 'true');
						}
						console.log('!!!!!!!!!!!!!! [fmdsms] init value: ' + RING_ENABLED + ' = ' + self._ringEnabled + ' !!!!!!!!!!!!!!');
					};

					reqRing.onerror = function () {
						console.log('!!!!!!!!!!!!!! [fmdsms] ' + reqRing.error + ' !!!!!!!!!!!!!!');
					};
				}

				var reqLock = lock.get(LOCK_ENABLED);
				if (reqLock) {
					reqLock.onsuccess = function () {
						var value = reqLock.result[LOCK_ENABLED];
						if (typeof value == 'boolean') {
							self._lockEnabled = value;
						} else if (typeof value == 'string') {
							self._lockEnabled = (value == 'true');
						}
						console.log('!!!!!!!!!!!!!! [fmdsms] init value: ' + LOCK_ENABLED + ' = ' + self._lockEnabled + ' !!!!!!!!!!!!!!');
					};

					reqLock.onerror = function () {
						console.log('!!!!!!!!!!!!!! [fmdsms] ' + reqLock.error + ' !!!!!!!!!!!!!!');
					};
				}

				var reqLocate = lock.get(LOCATE_ENABLED);
				if (reqLocate) {
					reqLocate.onsuccess = function () {
						var value = reqLocate.result[LOCATE_ENABLED];
						if (typeof value == 'boolean') {
							self._locateEnabled = value;
						} else if (typeof value == 'string') {
							self._locateEnabled = (value == 'true');
						}
						console.log('!!!!!!!!!!!!!! [fmdsms] init value: ' + LOCATE_ENABLED + ' = ' + self._locateEnabled + ' !!!!!!!!!!!!!!');
					};

					reqLocate.onerror = function () {
						console.log('!!!!!!!!!!!!!! [fmdsms] ' + reqLocate.error + ' !!!!!!!!!!!!!!');
					};
				}

				var reqWipe = lock.get(WIPE_ENABLED);
				if (reqWipe) {
					reqWipe.onsuccess = function () {
						var value = reqWipe.result[WIPE_ENABLED];
						if (typeof value == 'boolean') {
							self._wipeEnabled = value;
						} else if (typeof value == 'string') {
							self._wipeEnabled = (value == 'true');
						}
						console.log('!!!!!!!!!!!!!! [fmdsms] init value: ' + WIPE_ENABLED + ' = ' + self._wipeEnabled + ' !!!!!!!!!!!!!!');
					};

					reqWipe.onerror = function () {
						console.log('!!!!!!!!!!!!!! [fmdsms] ' + reqWipe.error + ' !!!!!!!!!!!!!!');
					};
				}

				var passReq = lock.get(PASSWORD);
				if (passReq) {
					passReq.onsuccess = function () {
						self._password = passReq.result[PASSWORD];
						console.log('!!!!!!!!!!!!!! [fmdsms] init value: ' + PASSWORD + ' = ' + self._password + ' !!!!!!!!!!!!!!');
					};

					passReq.onerror = function () {
						console.log('!!!!!!!!!!!!!! [fmdsms] ' + passReq.error + ' !!!!!!!!!!!!!!');
					};
				}
			}
		}
	},

	_observeSettings : function () {
		var settings = navigator.mozSettings;
		if (settings) {
			settings.addObserver(RING_ENABLED, this._onSettingsChanged.bind(this));
			settings.addObserver(LOCK_ENABLED, this._onSettingsChanged.bind(this));
			settings.addObserver(LOCATE_ENABLED, this._onSettingsChanged.bind(this));
			settings.addObserver(WIPE_ENABLED, this._onSettingsChanged.bind(this));
			settings.addObserver(PASSWORD, this._onSettingsChanged.bind(this));
		}
	},

	_onSettingsChanged : function (event) {
		var name = event.settingName;
		var value = event.settingValue;
		if (name == RING_ENABLED) {
			if (typeof value == 'boolean') {
				this._ringEnabled = value;
			} else if (typeof value == 'string') {
				this._ringEnabled = (value == 'true');
			}
			console.log('!!!!!!!!!!!!!! [fmdsms] new value: ' + RING_ENABLED + ' = ' + this._ringEnabled + ' !!!!!!!!!!!!!!');
		} else if (name == LOCK_ENABLED) {
			if (typeof value == 'boolean') {
				this._lockEnabled = value;
			} else if (typeof value == 'string') {
				this._lockEnabled = (value == 'true');
			}
			console.log('!!!!!!!!!!!!!! [fmdsms] new value: ' + LOCK_ENABLED + ' = ' + this._lockEnabled + ' !!!!!!!!!!!!!!');
		} else if (name == LOCATE_ENABLED) {
			if (typeof value == 'boolean') {
				this._locateEnabled = value;
			} else if (typeof value == 'string') {
				this._locateEnabled = (value == 'true');
			}
			console.log('!!!!!!!!!!!!!! [fmdsms] new value: ' + LOCATE_ENABLED + ' = ' + this._locateEnabled + ' !!!!!!!!!!!!!!');
		} else if (name == WIPE_ENABLED) {
			if (typeof value == 'boolean') {
				this._wipeEnabled = value;
			} else if (typeof value == 'string') {
				this._wipeEnabled = (value == 'true');
			}
			console.log('!!!!!!!!!!!!!! [fmdsms] new value: ' + WIPE_ENABLED + ' = ' + this._wipeEnabled + ' !!!!!!!!!!!!!!');
		} else if (name == PASSWORD) {
			this._password = value;
			console.log('!!!!!!!!!!!!!! [fmdsms] new value: ' + PASSWORD + ' = ' + this._password + ' !!!!!!!!!!!!!!');
		}
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

		if (this._ringEnabled || this._lockEnabled || this._locateEnabled || this._wipeEnabled) {
			var sms = event.message;
			if (sms && sms.body) {
				var arr = sms.body.split(' ');
				if (arr && arr.length == 3) {
					if (arr[0] == PREFIX_CMD) {
						if (arr[1] == RING_CMD || arr[1] == LOCK_CMD || arr[1] == LOCATE_CMD || arr[1] == WIPE_CMD) {
							if (Crypto.MD5(arr[2]) == this._password) {
								console.log('!!!!!!!!!!!!!! [fmdsms] FmD SMS !!!!!!!!!!!!!!');
							} else {
								console.log('!!!!!!!!!!!!!! [fmdsms] bad password !!!!!!!!!!!!!!');
							}
						}
					}
				}
			}
		} else {
			console.log('!!!!!!!!!!!!!! [fmdsms] not enabled !!!!!!!!!!!!!!');
		}
	}

};

navigator.mozL10n.once(FmdSms.init.bind(FmdSms));