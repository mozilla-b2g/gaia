/* global Components, Services */
'use strict';


const Cu = Components.utils;
Cu.import('resource://gre/modules/Services.jsm');

Services.obs.addObserver(function(document) {
    if (!document || !document.location) {
        return;
    }
    var window = document.defaultView;

    var fake_vibrations = 0;
    var vibrationPattern = null;

    Object.defineProperty(window.wrappedJSObject.navigator, 'vibrate', {
        configurable: false,
        writable: true,
        value: function(pattern) {
            fake_vibrations++;
            vibrationPattern = pattern;
            return true;
        }
    });

    Object.defineProperty(window.wrappedJSObject, '__fakeVibrationsNo', {
        configurable: true,
        value: fake_vibrations
    });

}, 'document-element-inserted', false);

