'use strict';

(function() {
    var fakeData = null;

    window.wrappedJSObject.__defineGetter__(
        'mozSetMessageHandler', function() {
        return function(type) {
            window.navigator.wrappedJSObject.mozSetMessageHandler(type,
                                                                  function(m) {
                fakeData = m.data;
            });
        };
    });
    window.wrappedJSObject.__defineGetter__('__getFakeData', function() {
        return fakeData;
    });
})();

