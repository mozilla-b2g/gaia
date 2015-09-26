/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global InputMethods */

(function() {
	'use strict';

	var keyboard = null;
	
	InputMethods.thai = {
		init: function(interfaceObject) {
      keyboard = interfaceObject;
		},

		click: function(keyCode, isRepeat) {
			keyboard.sendKey(keyCode, isRepeat);
			keyboard.setUpperCase({isUpperCase: false});
		},
	};
})();
