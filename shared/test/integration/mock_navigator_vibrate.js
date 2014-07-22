/**
 * @fileoverview This script mocks the vibration API
 *      (https://developer.mozilla.org/en-US/docs/Web/Guide/API/Vibration) for
 *      app integration tests. You should use and improve this if you want to
 *      write a marionette test which verifies that your app uses vibration
 *      correctly.
 */
'use strict';

(function () {
    var fake_vibrations = 0;
    var document_visibility_state = true;

    window.navigator.wrappedJSObject.__defineGetter__('vibrate', function() {
        return function(_pattern) {
            fake_vibrations++;

            return true;
        };
    });

    window.wrappedJSObject.__defineGetter__('__fakeVibrationsNo', function() {
        return fake_vibrations;
    });

    window.document.wrappedJSObject.__defineGetter__('hidden', function() {
        return !document_visibility_state;
    });

    window.wrappedJSObject.__defineGetter__('__setDocumentVisibility', function() {
        return function(visible) {
            document_visibility_state = visible;

            return true;
        };
    });
})();
