/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Bluetooth = {
	init: function bt_init() {
		var settings = window.navigator.mozSettings;
    if (!settings) {
			return;
		}
		var req = settings.getLock().get('bluetooth.enabled');
    req.onsuccess = function bt_EnabledFetched() {
      var enabled = req.result['bluetooth.enabled'];			
			var bluetooth = window.navigator.mozBluetooth;
			if (!bluetooth) {
				dump("Bluetooth not available!\n");
				return;
			}
			if (enabled) {
				bluetooth.setEnabled(true);
			}
    };
		req.onerror = function bt_EnabledFucked() {
			dump("Settings error!\n");
		};
	}
};