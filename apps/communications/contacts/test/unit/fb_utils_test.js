'use strict';

/* global MockImportStatusData, fb */

require('/shared/js/contacts/import/facebook/fb_contact_utils.js');
require('/shared/js/contacts/import/facebook/fb_utils.js');
require('/shared/js/fb/fb_request.js');
requireApp('communications/contacts/test/unit/mock_import_status_data.js');

suite('Fb Utils Tests', function() {
  var subject;
  var messageCallback;
  var pendingSchedule = false, timesToExecute = 0;
  var realImportStatusData;

  // We need this as sinon.useFaketimers does not support partial stub of
  // setInterval and we need setTimeout to work as usual
  function tick(times) {
    pendingSchedule = true;
    timesToExecute = times;
  }

  function resolveLogout(callback) {
    if (typeof callback !== 'function') {
      return;
    }

    window.setTimeout(callback, 0, {
      origin: location.origin,
      data: 'closed',
      stopImmediatePropagation: function() {}
    });
  }

  suiteSetup(function() {
    subject = fb.utils;

    sinon.stub(window, 'open', function() {
      resolveLogout(messageCallback);

      return {
        closed: false
      };
    });

    sinon.stub(window, 'addEventListener', function(event, cb) {
      if (event === 'message') {
        messageCallback = cb;
      }
    });

    sinon.stub(window, 'setInterval', function(cb, interval) {
      if (pendingSchedule === true) {
        for (var j = 0; j < timesToExecute; j++) {
          window.setTimeout(cb);
        }
      }
      pendingSchedule = false; timesToExecute = 0;
      return 1;
    });

    realImportStatusData = window.ImportStatusData;
    window.ImportStatusData = MockImportStatusData;
  });

  suiteTeardown(function() {
    window.open.restore();
    window.addEventListener.restore();
    window.setInterval.restore();

    window.ImportStatusData = realImportStatusData;
  });


  setup(function() {
    MockImportStatusData.keys = {
      'tokenData': {
        access_token: '1234'
      }
    };
  });


  test('Logout, everything goes well', function(done) {
    var req = subject.logout();

    req.onsuccess = function(e) {
      done(function() {
        assert.ok('everything went well');
      });
    };

    req.onerror = done.bind(null, req.error);

    tick(1);
  });


  test('Logout, timeout happens. Error raised', function(done) {
    window.open.restore();
    sinon.stub(window, 'open', function() {
      return {
        closed: false
      };
    });

    var req = subject.logout();

    req.onsuccess = done;

    req.onerror = function() {
      done(function() {
        assert.equal(req.error, 'Timeout');
      });
    };

    tick(10);
  });


  test('Logout, window is closed. Error raised', function(done) {
    window.open.restore();
    sinon.stub(window, 'open', function() {
      return {
        closed: true
      };
    });

    var req = subject.logout();

    // If onsuccess is called done is called with params and the test fails
    req.onsuccess = done;

    req.onerror = function() {
      done(function() {
        assert.equal(req.error, 'UserCancelled');
      });
    };

    tick(1);
  });

});
