'use strict';

requireApp('system/js/stack_manager.js');

requireApp('system/test/unit/mock_window_manager.js');

var mocksForStackManager = new MocksHelper([
  'WindowManager'
]).init();

suite('system/StackManager >', function() {
  mocksForStackManager.attachTestHelpers();

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
    evt.initCustomEvent('launchapp', true, false, configify(app));
    window.dispatchEvent(evt);
  }

  function wrapperLaunch(app, warm) {
    if (!warm) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('appcreated', true, false, app);
      window.dispatchEvent(evt);
    }

    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('launchwrapper', true, false, configify(app));
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

  var dialer = {
    url: 'app://communications.gaiamobile.org/dialer/index.html',
    origin: 'app://communications.gaiamobile.org/',
    manifestURL: 'app://communications.gaiamobile.org/dialer/manifest.webapp',
    name: 'Dialer',
    frame: document.createElement('div'),
    iframe: document.createElement('frame')
  };

  var contact = {
    url: 'app://communications.gaiamobile.org/contact/index.html',
    origin: 'app://communications.gaiamobile.org/',
    manifestURL: 'app://communications.gaiamobile.org/contact/manifest.webapp',
    name: 'Contact',
    frame: document.createElement('div'),
    iframe: document.createElement('frame')
  };
  var settings = {
    url: 'app://settings.gaiamobile.org/index.html',
    origin: 'app://settings.gaiamobile.org/',
    manifestURL: 'app://settings.gaiamobile.org/manifest.webapp',
    name: 'Settings',
    frame: document.createElement('div'),
    iframe: document.createElement('frame')
  };
  var google = {
    url: 'http://google.com/index.html',
    origin: 'http://google.com',
    frame: document.createElement('div'),
    iframe: document.createElement('frame')
  };

  suite('Moving through history', function() {
    setup(function() {
      appLaunch(dialer);
      appLaunch(contact);
      appLaunch(settings);
    });

    suite('> goPrev()', function() {
      test('should move back in the stack without modifying it', function() {
        StackManager.goPrev();
        assert.deepEqual(StackManager.getCurrent(), contact);
        assert.deepEqual(StackManager.getNext(), settings);
        assert.deepEqual(StackManager.getPrev(), dialer);
      });

      test('should inform the WindowManager of the app change', function() {
        var setActiveSpy = this.sinon.spy(MockWindowManager, 'setActiveApp');
        StackManager.goPrev();
        assert.isTrue(setActiveSpy.calledWith(contact));
      });


      test('should do nothing when we\'re at the bottom of the stack',
      function() {
        StackManager.goPrev();
        StackManager.goPrev();
        assert.deepEqual(StackManager.getCurrent(), dialer);
        StackManager.goPrev();
        assert.deepEqual(StackManager.getCurrent(), dialer);
      });
    });

    suite('> goNext()', function() {
      setup(function() {
        StackManager.goPrev();
        StackManager.goPrev();
      });

      test('should move forward in the stack without modifying it', function() {
        StackManager.goNext();
        assert.deepEqual(StackManager.getCurrent(), contact);
        assert.deepEqual(StackManager.getNext(), settings);
        assert.deepEqual(StackManager.getPrev(), dialer);
      });

      test('should inform the WindowManager of the app change', function() {
        var setActiveSpy = this.sinon.spy(MockWindowManager, 'setActiveApp');
        StackManager.goNext();
        assert.isTrue(setActiveSpy.calledWith(contact));
      });

      test('should do nothing when we\'re at the top of the stack',
      function() {
        StackManager.goNext();
        StackManager.goNext();
        assert.deepEqual(StackManager.getCurrent(), settings);
        StackManager.goNext();
        assert.deepEqual(StackManager.getCurrent(), settings);
      });
    });
  });

  suite('When an app is launched', function() {
    setup(function() {
      appLaunch(dialer);
    });

    test('it should become the current stack item', function() {
      assert.deepEqual(StackManager.getCurrent(), dialer);
    });

    suite('then another app is launched', function() {
      setup(function() {
        appLaunch(contact);
      });

      test('it should go on top of the stack', function() {
        assert.deepEqual(StackManager.getPrev(), dialer);
        assert.deepEqual(StackManager.getCurrent(), contact);
      });
    });

    suite('if it\'s already in the stack', function() {
      setup(function() {
        appLaunch(contact);
        appLaunch(settings);
      });

      test('it should go on top of the stack', function() {
        appLaunch(dialer, true);
        assert.deepEqual(StackManager.getCurrent(), dialer);
        assert.deepEqual(StackManager.getPrev(), settings);
      });

      test('it should not be duplicated', function() {
        appLaunch(dialer, true);

        assert.deepEqual(StackManager.getCurrent(), dialer);
        assert.deepEqual(StackManager.getPrev(), settings);

        StackManager.goPrev();
        assert.deepEqual(StackManager.getCurrent(), settings);
        assert.deepEqual(StackManager.getPrev(), contact);

        StackManager.goPrev();
        assert.deepEqual(StackManager.getCurrent(), contact);
        assert.isUndefined(StackManager.getPrev());
      });
    });

    suite('if it\'s launched in background', function() {
      setup(function() {
        settings.stayBackground = true;
        appLaunch(settings);
      });

      teardown(function() {
        settings.stayBackground = false;
      });

      test('it should go at the bottom of the stack while keeping the current',
      function() {
        assert.deepEqual(StackManager.getCurrent(), dialer);
        assert.deepEqual(StackManager.getPrev(), settings);
      });

      suite('and the stack is empty', function() {
        setup(function() {
          StackManager.__clearAll();
          appLaunch(settings);
        });

        test('it should go at the bottom of the stack and become the current',
        function() {
          assert.deepEqual(StackManager.getCurrent(), settings);
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
      assert.deepEqual(StackManager.getCurrent(), google);
    });

    suite('if it\'s already in the stack', function() {
      setup(function() {
        appLaunch(settings);
      });

      test('it should go on top of the stack', function() {
        wrapperLaunch(google, true);
        assert.deepEqual(StackManager.getCurrent(), google);
        assert.deepEqual(StackManager.getPrev(), settings);
      });

      test('it should not be duplicated', function() {
        wrapperLaunch(google, true);

        assert.deepEqual(StackManager.getCurrent(), google);
        assert.deepEqual(StackManager.getPrev(), settings);

        StackManager.goPrev();
        assert.deepEqual(StackManager.getCurrent(), settings);
        assert.isUndefined(StackManager.getPrev(), contact);
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
        assert.deepEqual(StackManager.getPrev(), dialer);
        assert.deepEqual(StackManager.getCurrent(), settings);
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
        assert.deepEqual(StackManager.getPrev(), settings);
        assert.deepEqual(StackManager.getCurrent(), contact);
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
        assert.deepEqual(StackManager.getPrev(), dialer);
        assert.deepEqual(StackManager.getCurrent(), settings);
      });
    });
  });

  suite('When the home button is pressed', function() {
    setup(function() {
      appLaunch(dialer);
      appLaunch(contact);
      StackManager.goPrev();
    });

    test('the current sheet should move to the top of the stack', function() {
      assert.deepEqual(StackManager.getCurrent(), dialer);
      assert.deepEqual(StackManager.getNext(), contact);
      home();
      assert.deepEqual(StackManager.getCurrent(), dialer);
      assert.deepEqual(StackManager.getPrev(), contact);
    });

    suite('if the stack is empty', function() {
      setup(function() {
        StackManager.__clearAll();
        home();
      });

      test('it shouldn\'t do anything', function() {
        assert.equal(StackManager.length, 0);
      });
    });
  });
});
