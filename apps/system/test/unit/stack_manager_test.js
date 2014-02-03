'use strict';

requireApp('system/js/stack_manager.js');
requireApp('system/test/unit/mock_app_window.js');

var mocksForStackManager = new MocksHelper([
  'AppWindow'
]).init();

suite('system/StackManager >', function() {
  var dialer, contact, settings, google;
  var contact_sheet_1, contact_sheet_2;
  var settings_sheet_1, settings_sheet_2, settings_sheet_3;
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

    contact_sheet_1 = new AppWindow({
      url: 'app://communications.gaiamobile.org/contact/sheet1.html',
      origin: 'app://communications.gaiamobile.org/',
      manifestURL:
        'app://communications.gaiamobile.org/contact/manifest.webapp',
      name: 'Contact',
      parentWindow: contact
    });

    contact_sheet_2 = new AppWindow({
      url: 'app://communications.gaiamobile.org/contact/sheet1.html',
      origin: 'app://communications.gaiamobile.org/',
      manifestURL:
        'app://communications.gaiamobile.org/contact/manifest.webapp',
      name: 'Contact',
      parentWindow: contact_sheet_1
    });

    settings_sheet_1 = new AppWindow({
      url: 'app://settings.gaiamobile.org/sheet1.html',
      origin: 'app://settings.gaiamobile.org/',
      manifestURL: 'app://settings.gaiamobile.org/manifest.webapp',
      name: 'Settings',
      parentWindow: settings
    });

    settings_sheet_2 = new AppWindow({
      url: 'app://settings.gaiamobile.org/sheet1.html',
      origin: 'app://settings.gaiamobile.org/',
      manifestURL: 'app://settings.gaiamobile.org/manifest.webapp',
      name: 'Settings',
      parentWindow: settings_sheet_1
    });

    settings_sheet_3 = new AppWindow({
      url: 'app://settings.gaiamobile.org/sheet1.html',
      origin: 'app://settings.gaiamobile.org/',
      manifestURL: 'app://settings.gaiamobile.org/manifest.webapp',
      name: 'Settings',
      parentWindow: settings_sheet_2
    });

    contact_sheet_1.sheetID = contact.sheetID;
    contact_sheet_2.sheetID = contact.sheetID;
    settings_sheet_1.sheetID = settings.sheetID;
    settings_sheet_2.sheetID = settings.sheetID;
    settings_sheet_3.sheetID = settings.sheetID;
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
      manifestURL: app.manifestURL,
      instanceID: app.instanceID
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
        StackManager._dump();
        StackManager.goPrev();
        StackManager._dump();
        appLaunch(dialer, true);
        StackManager._dump();

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

  suite('in-app sheets', function() {
    setup(function() {
      appLaunch(dialer);
      appLaunch(contact);
      appLaunch(settings);
    });
    test('the current sheet has parent window', function() {
      var stub1 = this.sinon.stub(settings, 'getActiveWindow');
      stub1.returns(settings_sheet_2);
      var stub2 = this.sinon.stub(settings_sheet_2, 'getPrev');
      stub2.returns(settings_sheet_1);
      var stubBroadcast1 = this.sinon.stub(settings_sheet_1, 'broadcast');
      var stubBroadcast2 = this.sinon.stub(settings_sheet_2, 'broadcast');

      StackManager.goPrev();
      assert.isTrue(stubBroadcast1.calledWith('swipein'));
      assert.isTrue(stubBroadcast2.calledWith('swipeout'));
    });
    test('the current sheet has child window', function() {
      var stub1 = this.sinon.stub(settings, 'getActiveWindow');
      stub1.returns(settings_sheet_2);
      var stub2 = this.sinon.stub(settings_sheet_2, 'getNext');
      stub2.returns(settings_sheet_3);
      var stubBroadcast1 = this.sinon.stub(settings_sheet_2, 'broadcast');
      var stubBroadcast2 = this.sinon.stub(settings_sheet_3, 'broadcast');

      StackManager.goNext();
      assert.isTrue(stubBroadcast1.calledWith('swipeout'));
      assert.isTrue(stubBroadcast2.calledWith('swipein'));
    });
    test('the next sheet has root window', function() {
      StackManager.goPrev();
      var stub1 = this.sinon.stub(settings, 'getRootWindow');
      stub1.returns(settings);
      var stub2 = this.sinon.stub(contact, 'getActiveWindow');
      stub2.returns(contact_sheet_2);
      var stubBroadcast1 = this.sinon.stub(settings, 'broadcast');
      var stubBroadcast2 = this.sinon.stub(contact_sheet_2, 'broadcast');

      StackManager.goNext();
      assert.isTrue(stubBroadcast2.calledWith('swipeout'));
      assert.isTrue(stubBroadcast1.calledWith('swipein'));
    });
    test('the prev sheet has leaf window', function() {
      var stub1 = this.sinon.stub(contact, 'getLeafWindow');
      stub1.returns(contact_sheet_2);
      var stub2 = this.sinon.stub(settings, 'getActiveWindow');
      stub2.returns(settings);
      var stubBroadcast1 = this.sinon.stub(settings, 'broadcast');
      var stubBroadcast2 = this.sinon.stub(contact_sheet_2, 'broadcast');

      StackManager.goPrev();
      assert.isTrue(stubBroadcast1.calledWith('swipeout'));
      assert.isTrue(stubBroadcast2.calledWith('swipein'));
    });
  });

  suite('When the home button is pressed', function() {
    setup(function() {
      appLaunch(dialer);
      appLaunch(contact);
      StackManager.goPrev();
    });

    test('the current sheet should move to the top of the stack', function() {
      assert.deepEqual(StackManager.getCurrent().config, dialer.config);
      assert.deepEqual(StackManager.getNext().config, contact.config);
      home();
      assert.deepEqual(StackManager.getCurrent().config, dialer.config);
      assert.deepEqual(StackManager.getPrev().config, contact.config);
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
