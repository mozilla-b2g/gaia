'use strict';

mocha.globals(['homescreenLauncher', 'layoutManager']);

requireApp('system/js/stack_manager.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_homescreen_launcher.js');
requireApp('system/test/unit/mock_layout_manager.js');

var mocksForStackManager = new MocksHelper([
  'AppWindow', 'HomescreenLauncher', 'LayoutManager'
]).init();

suite('system/StackManager >', function() {
  var dialer, contact, settings, google, system;
  var contact_sheet_1, contact_sheet_2;
  var settings_sheet_1, settings_sheet_2, settings_sheet_3;
  mocksForStackManager.attachTestHelpers();

  setup(function() {
    window.homescreenLauncher = new HomescreenLauncher().start();
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

    system = new AppWindow({
      url: 'app://system.gaiamobile.org/index.html',
      origin: 'app://system.gaiamobile.org/',
      manifestURL:
        'app://system.gaiamobile.org/contact/manifest.webapp',
      name: 'System',
      manifest: { role: 'system' }
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

    contact_sheet_1.groupID = contact.groupID;
    contact_sheet_2.groupID = contact.groupID;
    settings_sheet_1.groupID = settings.groupID;
    settings_sheet_2.groupID = settings.groupID;
    settings_sheet_3.groupID = settings.groupID;
  });

  teardown(function() {
    window.homescreenLauncher = undefined;
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

  function openAppFromCardView(app) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appopening', true, false, app);
    window.dispatchEvent(evt);
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

  suite('Homescreen', function() {
    setup(function(done) {
      home();
      setTimeout(done);
    });

    test('the position indicates we are on the homescreen',
    function() {
      assert.equal(StackManager.position, -1, 'position should be -1');
    });
  });

  suite('Stack vs System App', function() {
    setup(function() {
      appLaunch(system);
    });

    test('system app should never be in the stack', function() {
      StackManager.snapshot().forEach(function(app) {
        if (app.manifest) {
          assert.notEqual(app.manifest.role,
                          'system',
                          'system app should not be in snapshot');
        }
      });
    });

    teardown(function() {
      StackManager.__clearAll();
    });
  });

  suite('Cards View Events', function() {
    setup(function() {
      appLaunch(dialer);
      appLaunch(contact);
      appLaunch(settings);
    });

    test('stack position updates on cardviewclosed', function() {
      assert.equal(StackManager.position, 2, 'wrong starting position');
      var cardClosedEvent =
        new CustomEvent('cardviewclosed',
                        { 'detail': { 'newStackPosition': 1 }});
      StackManager.handleEvent(cardClosedEvent);
      assert.equal(StackManager.position, 1, 'new position is wrong');
    });

    test('and does not cause the position to stringify', function() {
      assert.equal(StackManager.position, 2, 'wrong starting position');
      StackManager.position = '2';
      StackManager.goPrev();
      StackManager.goNext();
      assert.deepEqual(StackManager.getCurrent(), settings);
      assert.equal(StackManager.position, 2, 'wrong end position');
    });

    teardown(function() {
      StackManager.__clearAll();
    });
  });

  suite('Moving through history', function() {
    setup(function() {
      appLaunch(dialer);
      appLaunch(contact);
      appLaunch(settings);
      appLaunch(system);
    });

    suite('> snapshot()', function() {
      test('snapshot returned should equal stack internal value', function() {
        var snapshot = StackManager.snapshot();
        assert.deepEqual(snapshot, StackManager._stack);
      });
    });

    suite('> goPrev()', function() {
      test('should move back in the stack without modifying it', function() {
        StackManager.goPrev();
        assert.deepEqual(StackManager.getCurrent().config, contact.config);
        assert.deepEqual(StackManager.getNext().config, settings.config);
        assert.deepEqual(StackManager.getPrev().config, dialer.config);
      });

      test('and the position should be updated properly', function() {
        assert.equal(StackManager.position, 2);
      });

      test('should do nothing when we\'re at the bottom of the stack',
      function() {
        StackManager.goPrev();
        StackManager.goPrev();
        assert.deepEqual(StackManager.getCurrent().config, dialer.config);
        StackManager.goPrev();
        assert.deepEqual(StackManager.getCurrent().config, dialer.config);
      });

      test('and the position should not change', function() {
        assert.equal(StackManager.position, 2);
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

      test('the position should be updated properly', function() {
        assert.equal(StackManager.position, 0);
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

      test('and the position should be updated properly', function() {
        assert.equal(StackManager.position, 2);
      });

      test('it should bring the current app on top too', function() {
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

      test('and the position should remain the same', function() {
        assert.equal(StackManager.position, 1);
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

        test('and the position should be 0', function() {
          assert.equal(StackManager.position, 0);
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

      test('the position should be updated properly', function() {
        assert.equal(StackManager.position, 1);
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

      test('the position should be updated properly', function() {
        assert.equal(StackManager.position, 1);
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

      test('the position should not change', function() {
        assert.equal(StackManager.position, 1);
      });

      test('the current should not move',
      function() {
        assert.deepEqual(StackManager.getPrev().config, dialer.config);
        assert.deepEqual(StackManager.getCurrent().config, settings.config);
      });
    });
  });

  test('open app from card should update the ordering', function() {
    appLaunch(dialer);
    appLaunch(contact);
    appLaunch(settings);
    openAppFromCardView(dialer);
    assert.deepEqual(StackManager.getCurrent().config, dialer.config);
  });

  suite('In-app sheets support', function() {
    setup(function() {
      appLaunch(dialer);
      appLaunch(contact);
      appLaunch(settings);
    });
    test('goPrev() should go the the parent window if there is one',
      function() {
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
    test('goNext() should go to the child window if there is one', function() {
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
    test('goNext() should go to the next app root window if we are on a leaf',
      function() {
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
    test('goPrev() should go to the previous app leaf if we are on a root',
      function() {
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

      test('the position should be -1', function() {
        assert.equal(StackManager.position, -1);
      });

      test('setting the position should do nothing', function() {
        StackManager.position = 2;
        assert.equal(StackManager.position, -1);
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
