'use strict';

requireApp('system/js/stack_manager.js');
requireApp('system/test/unit/mock_app_window.js');

var mocksForStackManager = new MocksHelper([
  'AppWindow'
]).init();

suite('system/StackManager >', function() {
  var dialer, contact, settings, google;
  mocksForStackManager.attachTestHelpers();

  setup(function() {
    dialer = new AppWindow({
      url: 'app://communications.gaiamobile.org/dialer/index.html',
      origin: 'app://communications.gaiamobile.org/',
      manifestURL: 'app://communications.gaiamobile.org/dialer/manifest.webapp',
      name: 'Dialer'
    });

    contact = new AppWindow({
      url: 'app://communications.gaiamobile.org/contact/index.html',
      origin: 'app://communications.gaiamobile.org/',
      manifestURL:
        'app://communications.gaiamobile.org/contact/manifest.webapp',
      name: 'Contact'
    });

    settings = new AppWindow({
      url: 'app://settings.gaiamobile.org/index.html',
      origin: 'app://settings.gaiamobile.org/',
      manifestURL: 'app://settings.gaiamobile.org/manifest.webapp',
      name: 'Settings'
    });

    google = new AppWindow({
      url: 'http://google.com/index.html',
      origin: 'http://google.com'
    });
  });

  teardown(function() {
    StackManager.__clearAll();
  });

  function appLaunch(app, warm) {
    if (!warm) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('appcreated', true, false, app);
      window.dispatchEvent(evt);
    }

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('launchapp', true, false, app.config);
    window.dispatchEvent(evt);
  }

  function wrapperLaunch(app, warm) {
    if (!warm) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('appcreated', true, false, app);
      window.dispatchEvent(evt);
    }

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('launchapp', true, false, app.config);
    window.dispatchEvent(evt);
  }

  function appCrash(app) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appterminated', true, false, {
      origin: app.origin,
      manifestURL: app.manifestURL
    });
    window.dispatchEvent(evt);
  }

  function home() {
    window.dispatchEvent(new Event('home'));
  }

  function configify(app) {
    var config = {};
    for (var key in app) {
      if (key != 'frame' && key != 'iframe') {
        config[key] = app[key];
      }
    }

    return config;
  }

  suite('Moving through history', function() {
    setup(function() {
      appLaunch(dialer);
      appLaunch(contact);
      appLaunch(settings);
    });

    suite('> goPrev()', function() {
      test('should move back in the stack without modifying it', function() {
        StackManager.goPrev();
        assert.deepEqual(StackManager.getCurrent().config, contact.config);
        assert.deepEqual(StackManager.getNext().config, settings.config);
        assert.deepEqual(StackManager.getPrev().config, dialer.config);
      });

      test('should do nothing when we\'re at the bottom of the stack',
      function() {
        StackManager.goPrev();
        StackManager.goPrev();
        assert.deepEqual(StackManager.getCurrent().config, dialer.config);
        StackManager.goPrev();
        assert.deepEqual(StackManager.getCurrent().config, dialer.config);
      });
    });

    suite('> goNext()', function() {
      setup(function() {
        StackManager.goPrev();
        StackManager.goPrev();
      });

      test('should move forward in the stack without modifying it', function() {
        StackManager.goNext();
        assert.deepEqual(StackManager.getCurrent().config, contact.config);
        assert.deepEqual(StackManager.getNext().config, settings.config);
        assert.deepEqual(StackManager.getPrev().config, dialer.config);
      });

      test('it should dispatch a stackchanged event', function(done) {
        window.addEventListener('stackchanged', function onStackChanged(evt) {
          window.removeEventListener('stackchanged', onStackChanged);

          var detail = evt.detail;
          assert.equal(detail.position, 1);
          assert.equal(detail.sheets.length, 3);
          assert.deepEqual(detail.sheets[0].config, dialer.config);
          assert.deepEqual(detail.sheets[1].config, contact.config);
          assert.deepEqual(detail.sheets[2].config, settings.config);
          done();
        });

        StackManager.goNext();
      });

      test('should do nothing when we\'re at the top of the stack',
      function() {
        StackManager.goNext();
        StackManager.goNext();
        assert.deepEqual(StackManager.getCurrent().config, settings.config);
        StackManager.goNext();
        assert.deepEqual(StackManager.getCurrent().config, settings.config);
      });
    });
  });

  suite('When an app is launched', function() {
    setup(function() {
      appLaunch(dialer);
    });

    test('it should become the current stack item', function() {
      assert.deepEqual(StackManager.getCurrent().config, dialer.config);
    });

    suite('then another app is launched', function() {
      setup(function() {
        appLaunch(contact);
      });

      test('it should go on top of the stack', function() {
        assert.deepEqual(StackManager.getPrev().config, dialer.config);
        assert.deepEqual(StackManager.getCurrent().config, contact.config);
      });

      suite('then we go back and launch a third app', function() {
        setup(function() {
          StackManager.goPrev();
          appLaunch(settings);
        });

        test('the current app at the time of the launch should move to the top',
        function() {
          assert.deepEqual(StackManager.getPrev(), dialer);
        });

        test('the new app should go on the top', function() {
          assert.deepEqual(StackManager.getCurrent(), settings);
        });
      });
    });

    suite('if it\'s already in the stack', function() {
      setup(function() {
        appLaunch(contact);
        appLaunch(settings);
      });

      test('it should go on top of the stack', function() {
        appLaunch(dialer, true);
        assert.deepEqual(StackManager.getCurrent().config, dialer.config);
        assert.deepEqual(StackManager.getPrev().config, settings.config);
      });

      test('it should bring the current app on top too', function() {
        StackManager.goPrev();
        appLaunch(dialer, true);

        assert.deepEqual(StackManager.getPrev(), contact);
      });

      test('it should not be duplicated', function() {
        appLaunch(dialer, true);

        assert.deepEqual(StackManager.getCurrent().config, dialer.config);
        assert.deepEqual(StackManager.getPrev().config, settings.config);

        StackManager.goPrev();
        assert.deepEqual(StackManager.getCurrent().config, settings.config);
        assert.deepEqual(StackManager.getPrev().config, contact.config);

        StackManager.goPrev();
        assert.deepEqual(StackManager.getCurrent().config, contact.config);
        assert.isUndefined(StackManager.getPrev());
      });

      test('it should dispatch a stackchanged event', function(done) {
        window.addEventListener('stackchanged', function onStackChanged(evt) {
          window.removeEventListener('stackchanged', onStackChanged);

          var detail = evt.detail;
          assert.equal(detail.position, 2);
          assert.equal(detail.sheets.length, 3);
          assert.deepEqual(detail.sheets[0].config, contact.config);
          assert.deepEqual(detail.sheets[1].config, settings.config);
          assert.deepEqual(detail.sheets[2].config, dialer.config);
          done();
        });

        appLaunch(dialer, true);
      });
    });

    suite('if it\'s launched in background', function() {
      setup(function() {
        settings.stayBackground = true;
        settings.config.stayBackground = true;
        appLaunch(settings);
      });

      teardown(function() {
        settings.stayBackground = false;
        settings.config.stayBackground = false;
      });

      test('it should go at the bottom of the stack while keeping the current',
      function() {
        assert.deepEqual(StackManager.getCurrent().config, dialer.config);
        assert.deepEqual(StackManager.getPrev().config, settings.config);
      });

      suite('and the stack is empty', function() {
        setup(function() {
          StackManager.__clearAll();
          appLaunch(settings);
        });

        test('it should go at the bottom of the stack and become the current',
        function() {
          assert.deepEqual(StackManager.getCurrent().config, settings.config);
          assert.isUndefined(StackManager.getPrev());
          assert.isUndefined(StackManager.getNext());
        });
      });
    });
  });

  suite('When a wrapper is launched', function() {
    setup(function() {
      wrapperLaunch(google);
    });

    test('it should become the current stack item', function() {
      assert.deepEqual(StackManager.getCurrent().config, google.config);
    });

    suite('if it\'s already in the stack', function() {
      setup(function() {
        appLaunch(settings);
      });

      test('it should go on top of the stack', function() {
        wrapperLaunch(google, true);
        assert.deepEqual(StackManager.getCurrent().config, google.config);
        assert.deepEqual(StackManager.getPrev().config, settings.config);
      });

      test('it should not be duplicated', function() {
        wrapperLaunch(google, true);

        assert.deepEqual(StackManager.getCurrent().config, google.config);
        assert.deepEqual(StackManager.getPrev().config, settings.config);

        StackManager.goPrev();
        assert.deepEqual(StackManager.getCurrent().config, settings.config);
        assert.isUndefined(StackManager.getPrev());
      });
    });
  });

  suite('When an app terminates', function() {
    setup(function() {
      appLaunch(dialer);
      appLaunch(settings);
      appLaunch(contact);
    });

    suite('if it\'s the current app', function() {
      setup(function() {
        appCrash(contact);
      });

      test('it should be removed from the stack', function() {
        assert.equal(StackManager.length, 2);
      });

      test('the current should go back',
      function() {
        assert.deepEqual(StackManager.getPrev().config, dialer.config);
        assert.deepEqual(StackManager.getCurrent().config, settings.config);
      });
    });

    suite('if it\'s an app deeper in the stack', function() {
      setup(function() {
        appCrash(dialer);
      });

      test('it should be removed from the stack', function() {
        assert.equal(StackManager.length, 2);
      });

      test('the current should go back',
      function() {
        assert.deepEqual(StackManager.getPrev().config, settings.config);
        assert.deepEqual(StackManager.getCurrent().config, contact.config);
      });
    });

    suite('if it\'s an app above in the stack', function() {
      setup(function() {
        StackManager.goPrev();
        appCrash(contact);
      });

      test('it should be removed from the stack', function() {
        assert.equal(StackManager.length, 2);
      });

      test('the current should not move',
      function() {
        assert.deepEqual(StackManager.getPrev().config, dialer.config);
        assert.deepEqual(StackManager.getCurrent().config, settings.config);
      });
    });
  });

  suite('When the home button is pressed', function() {
    setup(function() {
      appLaunch(dialer);
      appLaunch(contact);
      StackManager.goPrev();
    });

    test('the current position should be set to null', function() {
      home();
      assert.isUndefined(StackManager.getCurrent());
    });

    test('the current sheet should move to the top of the stack', function() {
      assert.deepEqual(StackManager.getCurrent().config, dialer.config);
      home();
      appLaunch(settings);
      assert.deepEqual(StackManager.getPrev().config, dialer.config);
    });

    test('it should dispatch a stackchanged event', function(done) {
      window.addEventListener('stackchanged', function onStackChanged(evt) {
        window.removeEventListener('stackchanged', onStackChanged);

        var detail = evt.detail;
        assert.equal(detail.position, -1);
        assert.equal(detail.sheets.length, 2);
        assert.deepEqual(detail.sheets[0].config, contact.config);
        assert.deepEqual(detail.sheets[1].config, dialer.config);
        done();
      });

      home();
    });

    suite('if the stack is empty', function() {
      setup(function() {
        StackManager.__clearAll();
        home();
      });

      test('it shouldn\'t do anything', function() {
        assert.equal(StackManager.length, 0);
      });

      suite('and we press home a second time', function() {
        setup(function() {
          home();
        });

        test('the stack should still be empty', function() {
          assert.equal(StackManager.length, 0);
        });
      });
    });
  });
});
