/**
 * @fileoverview This script mocks the vibration API
 *      (https://developer.mozilla.org/en-US/docs/Web/Guide/API/Vibration) for
 *      app integration tests. You should use and improve this if you want to
 *      write a marionette test which verifies that your app uses vibration
 *      correctly.
 */
'use strict';

(function() {
    var fake_vibrations = 0;
    var document_visibility_state = true;
    var vibrationPattern = null;
    var screenEnabled = window.wrappedJSObject.ScreenManager.screenEnabled;

    window.navigator.wrappedJSObject.__defineGetter__('vibrate', function() {
        return function(pattern) {
            fake_vibrations++;
            vibrationPattern = pattern;
            return true;
        };
    });

    window.wrappedJSObject.__defineGetter__('__fakeVibrationsNo', function() {
        return fake_vibrations;
    });

    window.document.wrappedJSObject.__defineGetter__('hidden', function() {
        return !document_visibility_state;
    });

    window.wrappedJSObject.__defineGetter__(
        '__setDocumentVisibility', function() {
        return function(visible) {
            document_visibility_state = visible;

            return true;
        };
    });

    window.wrappedJSObject.__defineGetter__('__fakeVibrationPattern',
                                            function() {
        return vibrationPattern;
    });

    window.wrappedJSObject.ScreenManager.__defineGetter__(
        'turnScreenOff', function() {
        return function(_dim) {
            screenEnabled = false;
        };
    });

    window.wrappedJSObject.ScreenManager.__defineGetter__(
        'turnScreenOn', function() {
        return function(_dim) {
            screenEnabled = true;
        };
    });

    window.wrappedJSObject.ScreenManager.__defineGetter__(
        'screenEnabled', function() {
        return screenEnabled;
    });
})();
