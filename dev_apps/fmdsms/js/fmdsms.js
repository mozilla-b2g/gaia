/* global Crypto */
/* global Commands */

'use strict';

var RING_ENABLED = 'rpp.ring.enabled';
var LOCK_ENABLED = 'rpp.lock.enabled';
var LOCATE_ENABLED = 'rpp.locate.enabled';
var WIPE_ENABLED = 'rpp.wipe.enabled';
var PASSWORD = 'rpp.password';
var PASSCODE_ENABLED = 'lockscreen.passcode-lock.enabled';
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
	_passcodeEnabled : false,

	init : function () {
		console.log('!!!!!!!!!!!!!! [fmdsms] init !!!!!!!!!!!!!!');

		this._getSettings();
		this._observeSettings();
		this._addListener();
	},

	_getSettings : function () {
		var self = this;

		var apps = navigator.mozApps;
		if (apps) {
			var reqPerm = apps.getSelf();
			if (reqPerm) {
				reqPerm.onsuccess = function () {
					var app = reqPerm.result;
					if (app) {
						var permission = navigator.mozPermissionSettings;
						if (permission) {
							console.log('!!!!!!!!!!!!!! [fmdsms] set geolocation permission !!!!!!!!!!!!!!');
							permission.set('geolocation', 'allow', app.manifestURL, app.origin, false);
						}
					}
				};

				reqPerm.onerror = function () {
					console.log('!!!!!!!!!!!!!! [fmdsms] ' + reqPerm.error.name + ' !!!!!!!!!!!!!!');
				};
			}
		}

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

				var passcodeReq = lock.get(PASSCODE_ENABLED);
				if (passcodeReq) {
					passcodeReq.onsuccess = function () {
						var value = passcodeReq.result[PASSCODE_ENABLED];
						if (typeof value == 'boolean') {
							self._passcodeEnabled = value;
						} else if (typeof value == 'string') {
							self._passcodeEnabled = (value == 'true');
						}
						console.log('!!!!!!!!!!!!!! [fmdsms] init value: ' + PASSCODE_ENABLED + ' = ' + self._passcodeEnabled + ' !!!!!!!!!!!!!!');
					};

					passcodeReq.onerror = function () {
						console.log('!!!!!!!!!!!!!! [fmdsms] ' + passcodeReq.error + ' !!!!!!!!!!!!!!');
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
			settings.addObserver(PASSCODE_ENABLED, this._onSettingsChanged.bind(this));
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
		} else if (name == PASSCODE_ENABLED) {
			if (typeof value == 'boolean') {
				this._passcodeEnabled = value;
			} else if (typeof value == 'string') {
				this._passcodeEnabled = (value == 'true');
			}
			console.log('!!!!!!!!!!!!!! [fmdsms] new value: ' + PASSCODE_ENABLED + ' = ' + this._passcodeEnabled + ' !!!!!!!!!!!!!!');
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
								if (arr[1] == RING_CMD && this._ringEnabled) {
									console.log('!!!!!!!!!!!!!! [fmdsms] invoke ring !!!!!!!!!!!!!!');
									this._ring();
								} else if (arr[1] == LOCK_CMD && this._lockEnabled) {
									console.log('!!!!!!!!!!!!!! [fmdsms] invoke lock !!!!!!!!!!!!!!');
									this._lock();
								} else if (arr[1] == LOCATE_CMD && this._locateEnabled) {
									console.log('!!!!!!!!!!!!!! [fmdsms] invoke locate !!!!!!!!!!!!!!');
									this._locate();
								} else if (arr[1] == WIPE_CMD && this._wipeEnabled) {
									console.log('!!!!!!!!!!!!!! [fmdsms] invoke wipe !!!!!!!!!!!!!!');
									this._wipe();
								}
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
	},

	_ring : function () {
		var ringReply = function (res, err) {
			if (!res) {
				console.log('!!!!!!!!!!!!!! [fmdsms] ring err = ' + err + ' !!!!!!!!!!!!!!');
			} else {
				console.log('!!!!!!!!!!!!!! [fmdsms] ring OK !!!!!!!!!!!!!!');
			}
		};
		Commands.invokeCommand('ring', [30, ringReply]);
	},

	_lock : function () {
		var lockReply = function (res, err) {
			if (!res) {
				console.log('!!!!!!!!!!!!!! [fmdsms] lock err = ' + err + ' !!!!!!!!!!!!!!');
			} else {
				console.log('!!!!!!!!!!!!!! [fmdsms] lock OK !!!!!!!!!!!!!!');
			}
		};
		var passcode = null;
		if (!this._passcodeEnabled) {
			var d1 = Math.floor(Math.random() * 10);
			var d2 = Math.floor(Math.random() * 10);
			var d3 = Math.floor(Math.random() * 10);
			var d4 = Math.floor(Math.random() * 10);
			passcode = '' + d1 + d2 + d3 + d4;
		}
		Commands.invokeCommand('lock', [null, passcode, lockReply]);
	},

	_locate : function () {
		var locateReply = function (res, err) {
			if (!res) {
				console.log('!!!!!!!!!!!!!! [fmdsms] locate err = ' + err + ' !!!!!!!!!!!!!!');
			} else {
				var pos = err;
				var latitude = pos.coords.latitude;
				var longitude = pos.coords.longitude;
				console.log('!!!!!!!!!!!!!! latitude = ' + latitude + ', longitude = ' + longitude + ' !!!!!!!!!!!!!!');
			}
		};
		Commands.invokeCommand('track', [6, locateReply]);
	},

	_wipe : function () {
		var wipeReply = function (res) {
			if (res) {
				console.log('!!!!!!!!!!!!!! [fmdsms] wipe OK !!!!!!!!!!!!!!');
			}
		};
		Commands.invokeCommand('erase', [wipeReply]);
	}

};

navigator.mozL10n.once(FmdSms.init.bind(FmdSms));