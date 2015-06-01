/* global StackManager, AppWindow, MockAppWindowManager, Event, MocksHelper,
          MockService, HomescreenLauncher, MockSheetsTransition */
'use strict';

requireApp('system/js/stack_manager.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_homescreen_launcher.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/test/unit/mock_sheets_transition.js');

var mocksForStackManager = new MocksHelper([
  'AppWindow', 'AppWindowManager',
  'HomescreenLauncher', 'LayoutManager',
  'SheetsTransition', 'Service'
]).init();

suite('system/StackManager >', function() {
  var dialer, contact, settings, google, system, operatorVariant;
  var contact_sheet_1, contact_sheet_2;
  var settings_sheet_1, settings_sheet_2, settings_sheet_3;
  mocksForStackManager.attachTestHelpers();

  setup(function() {
    this.sinon.useFakeTimers();

    window.homescreenLauncher = new HomescreenLauncher();
    window.homescreenLauncher.start();
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

    operatorVariant = new AppWindow({
      url: 'app://opvariant.gaiamobile.org/index.html',
      origin: 'app://opvariant.gaiamobile.org/',
      manifestURL:
        'app://opvariant.gaiamobile.org/contact/manifest.webapp',
      name: 'Operator Variant',
      manifest: { role: 'system' }
    });

    contact_sheet_1 = new AppWindow({
      url: 'app://communications.gaiamobile.org/contact/sheet1.html',
      origin: 'app://communications.gaiamobile.org/',
      manifestURL:
        'app://communications.gaiamobile.org/contact/manifest.webapp',
      name: 'Contact',
      previousWindow: contact
    });

    contact_sheet_2 = new AppWindow({
      url: 'app://communications.gaiamobile.org/contact/sheet1.html',
      origin: 'app://communications.gaiamobile.org/',
      manifestURL:
        'app://communications.gaiamobile.org/contact/manifest.webapp',
      name: 'Contact',
      previousWindow: contact_sheet_1
    });

    settings_sheet_1 = new AppWindow({
      url: 'app://settings.gaiamobile.org/sheet1.html',
      origin: 'app://settings.gaiamobile.org/',
      manifestURL: 'app://settings.gaiamobile.org/manifest.webapp',
      name: 'Settings',
      previousWindow: settings
    });

    settings_sheet_2 = new AppWindow({
      url: 'app://settings.gaiamobile.org/sheet1.html',
      origin: 'app://settings.gaiamobile.org/',
      manifestURL: 'app://settings.gaiamobile.org/manifest.webapp',
      name: 'Settings',
      previousWindow: settings_sheet_1
    });

    settings_sheet_3 = new AppWindow({
      url: 'app://settings.gaiamobile.org/sheet1.html',
      origin: 'app://settings.gaiamobile.org/',
      manifestURL: 'app://settings.gaiamobile.org/manifest.webapp',
      name: 'Settings',
      previousWindow: settings_sheet_2
    });

    contact_sheet_1.groupID = contact.groupID;
    contact_sheet_2.groupID = contact.groupID;
    settings_sheet_1.groupID = settings.groupID;
    settings_sheet_2.groupID = settings.groupID;
    settings_sheet_3.groupID = settings.groupID;
    window.appWindowManager = new MockAppWindowManager();
  });

  teardown(function() {
    this.sinon.clock.tick(800); // Making sure everything got broadcasted
    window.homescreenLauncher = undefined;
    StackManager.__clearAll();
    MockService.currentApp = null;
  });

  function appLaunch(app, warm) {
    if (!warm) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('appcreated', true, false, app);
      window.dispatchEvent(evt);
    }

    var evt2 = document.createEvent('CustomEvent');
    evt2.initCustomEvent('launchapp', true, false, app.config);
    window.dispatchEvent(evt2);
  }

  function wrapperLaunch(app, warm) {
    if (!warm) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('appcreated', true, false, app);
      window.dispatchEvent(evt);
    }

    var evt2 = document.createEvent('CustomEvent');
    evt2.initCustomEvent('launchapp', true, false, app.config);
    window.dispatchEvent(evt2);
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
    window.dispatchEvent(new Event('homescreenopened'));
  }

  function appOpening(app) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appopening', true, false, app);
    window.dispatchEvent(evt);
  }

  function appOpened(app) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('appopened', true, false, app);
    window.dispatchEvent(evt);
  }

  suite('Homescreen', function() {
    setup(function() {
      home();
    });

    test('the position indicates we are on the homescreen',
    function() {
      assert.equal(StackManager.position, -1, 'position should be -1');
    });
  });

  suite('Stack vs hidden apps', function() {
    setup(function() {
      appLaunch(system);
      appLaunch(operatorVariant);
    });

    test('role=system apps should never be in the stack', function() {
      StackManager.snapshot().forEach(function(app) {
        if (app.manifest) {
          assert.notEqual(app.manifest.role, 'system');
        }
      });
    });

    suite('when the app currently displayed is not part of the stack',
    function() {
      setup(function() {
        appLaunch(settings);
        appLaunch(operatorVariant);
        MockService.currentApp = operatorVariant;

        this.sinon.stub(settings, 'getActiveWindow').returns(null);
      });

      test('getCurrent should still work to allow event forwarding',
      function() {
        assert.equal(StackManager.getCurrent(), operatorVariant);
      });

      test('outOfStack should be true since we don\'t know where we are',
      function() {
        assert.isTrue(StackManager.outOfStack());
      });

      suite('but to prevent undefined swiping behaviors', function() {
        test('getPrev should return undefined', function() {
          assert.isUndefined(StackManager.getPrev());
        });

        test('getNext should return undefined', function() {
          assert.isUndefined(StackManager.getNext());
        });
      });
    });

    teardown(function() {
      StackManager.__clearAll();
    });
  });

  test('_didntMove by default is true', function() {
    appLaunch(dialer);
    this.sinon.stub(dialer, 'setNFCFocus');
    StackManager.commit();
    assert.isTrue(dialer.setNFCFocus.calledWith(true));
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
        assert.isFalse(StackManager._didntMove);
        StackManager.goPrev();
        assert.isFalse(StackManager._didntMove);
      });

      test('should move forward in the stack without modifying it', function() {
        StackManager.goNext();
        assert.deepEqual(StackManager.getCurrent().config, contact.config);
        assert.deepEqual(StackManager.getNext().config, settings.config);
        assert.deepEqual(StackManager.getPrev().config, dialer.config);
      });

      test('it should dispatch a stackchanged event after a delay',
      function(done) {
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
        this.sinon.clock.tick(800);
      });

      test('the position should be updated properly', function() {
        assert.equal(StackManager.position, 0);
      });

      test('should do nothing when we\'re at the top of the stack',
      function() {
        StackManager.goNext();
        assert.isFalse(StackManager._didntMove);
        StackManager.goNext();
        assert.isTrue(StackManager._didntMove);
        assert.deepEqual(StackManager.getCurrent().config, settings.config);
        StackManager.goNext();
        assert.deepEqual(StackManager.getCurrent().config, settings.config);
      });
    });

    test('going back to the start app', function() {
      var onSheetsGestureEnd = this.sinon.spy();
      window.addEventListener('sheets-gesture-end', onSheetsGestureEnd);
      StackManager.goPrev();
      StackManager.goNext();
      assert.isTrue(StackManager._didntMove);
      StackManager.commit();
      sinon.assert.calledOnce(onSheetsGestureEnd);
      this.sinon.clock.tick(800);
      sinon.assert.calledOnce(onSheetsGestureEnd);
      window.removeEventListener('sheets-gesture-end', onSheetsGestureEnd);
    });

    suite('> blasting through history', function() {
      var dialerBroadcast, contactBroadcast, settingsBroadcast;
      var dialerQueueShow, contactCancelQueuedShow, settingsQueueHide;
      var sendStopRecordingRequest;

      setup(function() {
        dialerBroadcast = this.sinon.stub(dialer, 'broadcast');
        contactBroadcast = this.sinon.stub(contact, 'broadcast');
        settingsBroadcast = this.sinon.stub(settings, 'broadcast');

        dialerQueueShow = this.sinon.stub(dialer, 'queueShow');
        contactCancelQueuedShow = this.sinon.stub(contact, 'cancelQueuedShow');
        settingsQueueHide = this.sinon.stub(settings, 'queueHide');

        sendStopRecordingRequest = this.sinon.stub(window.appWindowManager,
                                                   'sendStopRecordingRequest');

        StackManager.goPrev();
        assert.isFalse(StackManager._didntMove);
        StackManager.goPrev();
        assert.isFalse(StackManager._didntMove);
      });

      test('it should flag the next active app', function() {
        sinon.assert.calledOnce(dialerQueueShow);
      });

      test('it should unflag an app we passed over', function() {
        sinon.assert.calledOnce(contactCancelQueuedShow);
      });

      test('it should flag the app that will become inactive', function() {
        sinon.assert.calledOnce(settingsQueueHide);
      });

      test('it should broadcast only 1 app change', function() {
        sinon.assert.notCalled(dialerBroadcast);
        sinon.assert.notCalled(contactBroadcast);
        sinon.assert.notCalled(settingsBroadcast);

        this.sinon.clock.tick(800);

        sinon.assert.calledWith(dialerBroadcast, 'swipein');
        sinon.assert.notCalled(contactBroadcast);
        sinon.assert.calledWith(settingsBroadcast, 'swipeout');
      });

      test('it should call sendStopRecordingRequest', function() {
        sinon.assert.calledOnce(sendStopRecordingRequest);
      });

      suite('if we\'re back to the same place', function() {
        setup(function() {
          StackManager.goNext();
          StackManager.goNext();
          assert.isTrue(StackManager._didntMove);
        });

        test('it should just cleanup the transition classes', function() {
           var clearSpy = this.sinon.spy(settings.transitionController,
                                         'clearTransitionClasses');
          this.sinon.clock.tick(800);
          sinon.assert.calledOnce(clearSpy);
        });
      });

      suite('if we\'re still transitioning after the timeout', function() {
        setup(function() {
          MockSheetsTransition.transitioning = true;
          this.sinon.clock.tick(800);
        });

        test('commit should then broadcast', function() {
          sinon.assert.notCalled(dialerBroadcast);
          sinon.assert.notCalled(contactBroadcast);
          sinon.assert.notCalled(settingsBroadcast);

          MockSheetsTransition.transitioning = false;
          StackManager.commit();

          sinon.assert.calledWith(dialerBroadcast, 'swipein');
          sinon.assert.notCalled(contactBroadcast);
          sinon.assert.calledWith(settingsBroadcast, 'swipeout');
        });
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

    test('it should set the position when opened', function() {
      var fakePosition = 10;
      assert.equal(StackManager.position, 0);
      this.sinon.stub(StackManager, '_indexOfInstanceID').returns(fakePosition);
      appOpened(dialer);
      assert.equal(StackManager.position, fakePosition);
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

  suite('When the last app terminates', function() {
    setup(function() {
      appLaunch(contact);
      appCrash(contact);
    });
    test('the position should be -1',
    function() {
      assert.equal(StackManager.position, -1);
    });
    test('the stack should be empty',
    function() {
      assert.equal(StackManager._stack.length, 0);
    });
  });

  test('open app from card should update the ordering', function() {
    appLaunch(dialer);
    appLaunch(contact);
    appLaunch(settings);
    appOpening(dialer);
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
        this.sinon.clock.tick(800);
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
      this.sinon.clock.tick(800);
      assert.isTrue(stubBroadcast1.calledWith('swipeout'));
      assert.isTrue(stubBroadcast2.calledWith('swipein'));
    });

    test('goNext() should go to the next app root window if we are on a leaf',
      function() {
        StackManager.goPrev();
        this.sinon.clock.tick(800);
        var stub1 = this.sinon.stub(settings, 'getRootWindow');
        stub1.returns(settings);
        var stub2 = this.sinon.stub(contact, 'getActiveWindow');
        stub2.returns(contact_sheet_2);
        var stubBroadcast1 = this.sinon.stub(settings, 'broadcast');
        var stubBroadcast2 = this.sinon.stub(contact_sheet_2, 'broadcast');

        StackManager.goNext();
        this.sinon.clock.tick(800);
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
        this.sinon.clock.tick(800);
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

    test('it should do an emergency broadcast to prevent race conditions',
    function() {
      var clearSpy = this.sinon.spy(settings.transitionController,
                                    'clearTransitionClasses');
      var broadcastSpy = this.sinon.spy(dialer, 'broadcast');
      StackManager.goPrev();
      home();
      sinon.assert.calledWith(broadcastSpy, 'closed');
      sinon.assert.calledOnce(clearSpy);
      this.sinon.clock.tick(800);
      sinon.assert.calledOnce(broadcastSpy);
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
