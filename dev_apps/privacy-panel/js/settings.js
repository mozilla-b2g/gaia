'use strict';

var RING_ENABLED = 'rpp.ring.enabled';
var LOCK_ENABLED = 'rpp.lock.enabled';
var LOCATE_ENABLED = 'rpp.locate.enabled';
var WIPE_ENABLED = 'rpp.wipe.enabled';
var UNLOCK_ENABLED = 'rpp.unlock.enabled';
var PASSWORD = 'rpp.password';
var GEO_RADIUS = 'geolocation.blur.radius';
var GEO_COORDS = 'geolocation.blur.coords';

var Settings = {

	_lock : null,

	_init : function () {
		console.log('!!!!!!!!!!!!!! [privacy-panel] init !!!!!!!!!!!!!!');

		var settings = navigator.mozSettings;
		if (settings) {
			this._lock = settings.createLock();
			if (this._lock) {
				this._createParam(RING_ENABLED, false);
				this._createParam(LOCK_ENABLED, false);
				this._createParam(LOCATE_ENABLED, false);
				this._createParam(WIPE_ENABLED, false);
				this._createParam(UNLOCK_ENABLED, false);
				this._createParam(PASSWORD, '');
				this._createParam(GEO_RADIUS, 1);
				this._createParam(GEO_COORDS, '');
			}
		}
	},

	_createParam : function (name, value) {
		var self = this;
		var req = this._lock.get(name);
		req.onsuccess = function () {
			if (typeof req.result[name] == 'undefined') {
				console.log('!!!!!!!!!!!!!! [privacy-panel] create param ' + name + ' with value ' + value + ' !!!!!!!!!!!!!!');

				var param = {};
				param[name] = value;
				self._lock.set(param);
			} else {
				console.log('!!!!!!!!!!!!!! [privacy-panel] param ' + name + ' already exist !!!!!!!!!!!!!!');
			}
		};
		req.onerror = function () {
			console.log('!!!!!!!!!!!!!! [privacy-panel] ' + req.error + ' !!!!!!!!!!!!!!');
		};
	}

};

navigator.mozL10n.once(Settings._init.bind(Settings));