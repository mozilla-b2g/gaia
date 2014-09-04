'use strict';

window.addEventListener('homescreen-ready', function (event) {
	navigator.mozApps.getSelf().onsuccess = function (event) {
		var app = event.target.result;
		app.connect('fmdsms-wakeup');
	};
});