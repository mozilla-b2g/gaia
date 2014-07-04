/* globals CallScreen, FontSizeManager, MockCallsHandler, MockLazyL10n,
           MockHandledCall, MockMozActivity, MockNavigatorMozTelephony,
           MockMozL10n, MocksHelper, MockSettingsListener */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');
require('/shared/test/unit/mocks/dialer/mock_handled_call.js');
require('/shared/test/unit/mocks/dialer/mock_calls_handler.js');
require('/shared/test/unit/mocks/dialer/mock_font_size_manager.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');

var mocksHelperForCallScreen = new MocksHelper([
  'CallsHandler',
  'MozActivity',
  'LazyL10n',
  'FontSizeManager'
]).init();

// The CallScreen binds stuff when evaluated so we load it
// after the fake dom and we don't want it to show up as a leak.
if (!window.CallScreen) {
  window.CallScreen = null;
}

suite('call screen', function() {
  var realMozTelephony;
  var realMozL10n;
  var realSettingsListener;

  var screen;
  var container;
  var contactBackground;
  var calls;
  var groupCalls;
  var groupCallsList;
  var callToolbar;
  var muteButton;
  var speakerButton;
  var statusMessage,
      statusMessageText;
  var lockedHeader,
      lockedClockTime,
      lockedDate;
  var incomingContainer;
  var bluetoothButton,
      bluetoothMenu;

  mocksHelperForCallScreen.attachTestHelpers();

  suiteSetup(function() {
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;
    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;
  });

  suiteTeardown(function() {
    MockNavigatorMozTelephony.mSuiteTeardown();
    navigator.mozTelephony = realMozTelephony;
    window.SettingsListener = realSettingsListener;
    navigator.mozL10n = realMozL10n;
  });

  setup(function(done) {
    screen = document.createElement('div');
    screen.id = 'call-screen';
    document.body.appendChild(screen);

    container = document.createElement('article');
    container.id = 'main-container';
    screen.appendChild(container);

    contactBackground = document.createElement('div');
    contactBackground.id = 'contact-background';
    screen.appendChild(contactBackground);

    calls = document.createElement('article');
    calls.id = 'calls';
    screen.appendChild(calls);

    groupCalls = document.createElement('form');
    groupCalls.id = 'group-call-details';
    screen.appendChild(groupCalls);

    groupCallsList = document.createElement('ul');
    groupCallsList.id = 'group-call-details-list';
    groupCalls.appendChild(groupCallsList);

    callToolbar = document.createElement('section');
    callToolbar.id = 'co-advanced';
    screen.appendChild(callToolbar);

    muteButton = document.createElement('button');
    muteButton.id = 'mute';
    callToolbar.appendChild(muteButton);

    speakerButton = document.createElement('button');
    speakerButton.id = 'speaker';
    callToolbar.appendChild(speakerButton);

    statusMessage = document.createElement('div');
    statusMessage.id = 'statusMsg';
    statusMessageText = document.createElement('p');
    statusMessage.appendChild(statusMessageText);
    screen.appendChild(statusMessage);

    lockedHeader = document.createElement('div');
    lockedClockTime = document.createElement('div');
    lockedHeader.appendChild(lockedClockTime);
    lockedDate = document.createElement('div');
    lockedHeader.appendChild(lockedDate);
    screen.appendChild(lockedHeader);

    incomingContainer = document.createElement('article');
    incomingContainer.id = 'incoming-container';
    screen.appendChild(incomingContainer);

    bluetoothButton = document.createElement('div');
    bluetoothButton.id = 'bt';
    screen.appendChild(bluetoothButton);

    bluetoothMenu = document.createElement('form');
    bluetoothMenu.id = 'bluetooth-menu';
    bluetoothMenu.dataset.dummy = 'dummy';
    bluetoothMenu.innerHTML = '<menu>' +
        '<button data-l10n-id="cancel" id="btmenu-btdevice"></button>' +
        '<button data-l10n-id="cancel" id="btmenu-receiver"></button>' +
        '<button data-l10n-id="cancel" id="btmenu-speaker"></button>' +
        '<button data-l10n-id="cancel" id="btmenu-cancel"></button>' +
      '</menu>';
    screen.appendChild(bluetoothMenu);

    // Replace the existing elements
    // Since we can't make the CallScreen look for them again
    if (CallScreen != null) {
      CallScreen.screen = screen;
      CallScreen.mainContainer = container;
      CallScreen.contactBackground = contactBackground;
      CallScreen.calls = calls;
      CallScreen.callToolbar = callToolbar;
      CallScreen.muteButton = muteButton;
      CallScreen.speakerButton = speakerButton;
      CallScreen.groupCalls = groupCalls;
      CallScreen.groupCallsList = groupCallsList;
      CallScreen.lockedClockTime = lockedClockTime;
      CallScreen.lockedDate = lockedDate;
      CallScreen.incomingContainer = incomingContainer;
      CallScreen.bluetoothButton = bluetoothButton;
      CallScreen.bluetoothMenu = bluetoothMenu;
    }

    require('/js/call_screen.js', done);
  });

  teardown(function() {
    MockNavigatorMozTelephony.mTeardown();
    screen.parentNode.removeChild(screen);
  });

  suite('call screen initialize', function() {
    var mockElements = ['keypadButton', 'placeNewCallButton', 'answerButton',
      'rejectButton', 'holdButton', 'showGroupButton', 'hideGroupButton',
      'incomingAnswer', 'incomingEnd', 'incomingIgnore'];

    setup(function() {
      this.sinon.stub(CallScreen, 'showClock');
      this.sinon.stub(CallScreen, 'initLockScreenSlide');
      this.sinon.stub(CallScreen, 'render');
      mockElements.forEach(function(name) {
        CallScreen[name] = document.createElement('button');
      });
    });

    test('screen init type other than incoming-locked', function() {
      CallScreen.init();
      sinon.assert.notCalled(CallScreen.showClock);
      sinon.assert.notCalled(CallScreen.initLockScreenSlide);
      sinon.assert.notCalled(CallScreen.render);
    });

    suite('incoming-locked screen initialize', function() {
      var oldHash;

      setup(function() {
        oldHash = window.location.hash;
        window.location.hash = '#locked?timestamp=0';
      });

      teardown(function() {
        window.location.hash = oldHash;
      });

      test('incoming-locked screen init without layout set', function() {
        CallScreen.init();
        sinon.assert.called(CallScreen.showClock);
        sinon.assert.called(CallScreen.initLockScreenSlide);
        sinon.assert.called(CallScreen.render);
      });

      test('incoming-locked screen init with layout set', function() {
        CallScreen.screen.dataset.layout = 'incoming-locked';
        CallScreen.init();
        sinon.assert.called(CallScreen.showClock);
        sinon.assert.called(CallScreen.initLockScreenSlide);
        sinon.assert.notCalled(CallScreen.render);
      });
    });
  });

  suite('calls', function() {
    suite('setters', function() {
      test('cdmaCallWaiting should toggle the appropriate classes', function() {
        assert.isFalse(calls.classList.contains('switch'));
        assert.isFalse(callToolbar.classList.contains('no-add-call'));

        CallScreen.cdmaCallWaiting = true;
        assert.isTrue(calls.classList.contains('switch'));
        assert.isTrue(callToolbar.classList.contains('no-add-call'));

        CallScreen.cdmaCallWaiting = false;
        assert.isFalse(calls.classList.contains('switch'));
        assert.isFalse(callToolbar.classList.contains('no-add-call'));
      });

      test('holdAndAnswerOnly should add the hold-and-answer-only class',
        function() {
          assert.isFalse(
            incomingContainer.classList.contains('hold-and-answer-only'));
          CallScreen.holdAndAnswerOnly = true;
          assert.isTrue(
            incomingContainer.classList.contains('hold-and-answer-only'));
        }
      );
    });

    suite('updateCallsDisplay', function() {
      test('should toggle single-line/big-duration class',
      function() {
        assert.isFalse(calls.classList.contains('single-line'));
        assert.isFalse(calls.classList.contains('big-duration'));

        calls.innerHTML = '<section></section>';
        CallScreen.updateCallsDisplay();
        assert.isTrue(calls.classList.contains('single-line'));
        assert.isTrue(calls.classList.contains('big-duration'));

        calls.innerHTML = '<section></section>' +
                          '<section></section>';
        CallScreen.updateCallsDisplay();
        assert.isFalse(calls.classList.contains('single-line'));
        assert.isFalse(calls.classList.contains('big-duration'));
      });

      test('should toggle single-line/big-duration class without visible calls',
      function() {
        assert.isFalse(calls.classList.contains('single-line'));
        assert.isFalse(calls.classList.contains('big-duration'));

        calls.innerHTML = '<section></section>' +
                          '<section hidden=""></section>';
        CallScreen.updateCallsDisplay();
        assert.isTrue(calls.classList.contains('single-line'));
        assert.isTrue(calls.classList.contains('big-duration'));

        calls.innerHTML = '<section></section>' +
                          '<section></section>' +
                          '<section hidden=""></section>';

        CallScreen.updateCallsDisplay();
        assert.isFalse(calls.classList.contains('single-line'));
        assert.isFalse(calls.classList.contains('big-duration'));
      });

      test('should trigger call list reformat',
      function() {
        var updateAllPhoneNumberDisplaysStub =
          this.sinon.stub(MockCallsHandler, 'updateAllPhoneNumberDisplays');
        CallScreen.updateCallsDisplay();
        assert.isTrue(updateAllPhoneNumberDisplaysStub.calledOnce);
        updateAllPhoneNumberDisplaysStub.restore();
      });
    });

    suite('insertCall', function() {
      test('should insert the node in the calls article and update calls style',
      function() {
        var fakeNode = document.createElement('section');
        var singleLineStub = this.sinon.stub(CallScreen, 'updateCallsDisplay');
        CallScreen.insertCall(fakeNode);
        assert.equal(fakeNode.parentNode, CallScreen.calls);
        assert.isTrue(singleLineStub.calledOnce);
      });

      test('should get the right scenario when single call', function() {
        var fakeNode = document.createElement('section');
        CallScreen.insertCall(fakeNode);
        assert.equal(CallScreen.getScenario(), FontSizeManager.SINGLE_CALL);
      });

      test('should get the right scenario when call waiting', function() {
        var fakeNode = document.createElement('section');
        CallScreen.insertCall(fakeNode);
        CallScreen.insertCall(fakeNode.cloneNode());
        assert.equal(CallScreen.getScenario(), FontSizeManager.CALL_WAITING);
      });
    });

    suite('removeCall', function() {
      var fakeNode = document.createElement('section');
      setup(function() {
        CallScreen.insertCall(fakeNode);
      });

      test('should remove the node in the calls article and update calls style',
      function() {
        var singleLineStub = this.sinon.stub(CallScreen, 'updateCallsDisplay');
        CallScreen.removeCall(fakeNode);
        assert.equal(fakeNode.parentNode, null);
        assert.isTrue(singleLineStub.calledOnce);
      });

      test('should remove the node in the groupList',
      function() {
        CallScreen.moveToGroup(fakeNode);
        CallScreen.removeCall(fakeNode);
        assert.equal(fakeNode.parentNode, null);
      });
    });

    suite('moveToGroup', function() {
      test('should insert the node in the group calls article', function() {
        var fakeNode = document.createElement('section');
        CallScreen.moveToGroup(fakeNode);
        assert.equal(fakeNode.parentNode, CallScreen.groupCallsList);
      });
    });
  });

  suite('background image setter', function() {
    var fakeBlob = new Blob([], {type: 'image/png'});
    var fakeURL = URL.createObjectURL(fakeBlob);

    setup(function() {
      this.sinon.stub(URL, 'createObjectURL').returns(fakeURL);
    });

    test('should change background of the main container', function(done) {
      MockSettingsListener.mTriggerCallback('wallpaper.image', fakeBlob);
      setTimeout(function() {
        assert.equal(CallScreen.mainContainer.style.backgroundImage,
                     'url("' + fakeURL + '")');
        done();
      });
    });
  });

  suite('background image setter from string', function() {
    var fakeImage =
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAg' +
      'IDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8' +
      'QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ' +
      'EBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARC';

    test('should change background of the main container', function(done) {
      MockSettingsListener.mTriggerCallback('wallpaper.image', fakeImage);
      setTimeout(function() {
        assert.equal(CallScreen.mainContainer.style.backgroundImage,
                     'url("' + fakeImage + '")');
        done();
      });
    });
  });

  suite('toggling', function() {
    suiteSetup(function() {
      CallScreen._wallpaperReady = false;
    });

    teardown(function() {
      CallScreen._transitioning = false;
    });

    test('it should wait for the wallpaper to load', function(done) {
      var toggleSpy = this.sinon.spy(screen.classList, 'toggle');
      CallScreen.toggle();
      assert.isTrue(toggleSpy.notCalled);
      MockSettingsListener.mTriggerCallback('wallpaper.image', new Blob());

      setTimeout(function() {
        assert.isTrue(toggleSpy.calledOnce);
        done();
      });
    });

    suite('once the wallpaper is loaded', function() {
      test('should toggle the displayed classlist', function() {
        var toggleSpy = this.sinon.spy(screen.classList, 'toggle');
        CallScreen.toggle();
        assert.isTrue(toggleSpy.calledWith('displayed'));
      });

      suite('when a callback is given', function() {
        var addEventListenerSpy;
        var removeEventListenerSpy;
        var spyCallback;

        setup(function() {
          addEventListenerSpy = this.sinon.spy(screen, 'addEventListener');
          removeEventListenerSpy = this.sinon.spy(screen,
                                                  'removeEventListener');
          spyCallback = this.sinon.spy();
          CallScreen.toggle(spyCallback);
        });

        test('should listen for transitionend', function() {
          assert.isTrue(addEventListenerSpy.calledWith('transitionend'));
        });

        suite('once the transition ended', function() {
          setup(function() {
            addEventListenerSpy.yield({target: screen});
          });

          test('should remove the event listener', function() {
            assert.isTrue(removeEventListenerSpy.calledWith('transitionend'));
          });

          test('should trigger the callback', function() {
            assert.isTrue(spyCallback.calledOnce);
          });
        });
      });

      suite('when opening in incoming-locked mode', function() {
        var addEventListenerSpy;
        var spyCallback;

        setup(function() {
          CallScreen.screen.dataset.layout = 'incoming-locked';
          addEventListenerSpy = this.sinon.spy(screen, 'addEventListener');
          spyCallback = this.sinon.spy();

          CallScreen.toggle(spyCallback);
        });

        test('should not listen for transitionend', function() {
          assert.isFalse(addEventListenerSpy.called);
        });

        test('should call the callback', function(done) {
          setTimeout(function() {
            assert.isTrue(spyCallback.called);
            done();
          });
        });
      });

      suite('when toggling again in the middle of a transition', function() {
        var addEventListenerSpy;
        var spyCallback;

        setup(function() {
          addEventListenerSpy = this.sinon.spy(screen, 'addEventListener');
          spyCallback = this.sinon.spy();

          CallScreen.toggle(spyCallback);
          CallScreen.toggle(spyCallback);
        });

        test('should not wait for transitionend the second time', function() {
          assert.isTrue(addEventListenerSpy.calledOnce);
        });

        test('should call the callback once', function(done) {
          setTimeout(function() {
            assert.isTrue(spyCallback.calledOnce);
            done();
          });
        });
      });
    });
  });

  suite('contact image setter', function() {
    var fakeBlob = new Blob([], {type: 'image/png'});
    var fakeURL = URL.createObjectURL(fakeBlob);

    suiteSetup(function() {
      CallScreen._transitionDone = false;
    });

    setup(function() {
      MockCallsHandler.mActiveCallForContactImage = new MockHandledCall();
      MockCallsHandler.mActiveCallForContactImage.photo = fakeBlob;
    });

    test('it should wait for the transition to be over', function(done) {
      var addEventListenerSpy = this.sinon.spy(screen, 'addEventListener');

      MockCallsHandler.mActiveCallForContactImage = new MockHandledCall();
      MockCallsHandler.mActiveCallForContactImage.photo =
        new Blob([], {type: 'image/png'});

      CallScreen.setCallerContactImage();
      assert.equal(CallScreen.contactBackground.style.backgroundImage, '');

      CallScreen.toggle();

      setTimeout(function() {
        addEventListenerSpy.yield({target: screen});
        assert.ok(CallScreen.contactBackground.style.backgroundImage);
        CallScreen.setCallerContactImage();
        done();
      });
    });

    suite('once the transition is over', function() {
      test('should change background of the contact photo', function() {
        this.sinon.stub(URL, 'createObjectURL').returns(fakeURL);
        CallScreen.setCallerContactImage();
        assert.equal(CallScreen.contactBackground.style.backgroundImage,
                       'url("' + fakeURL + '")');
      });

      test('should clean up background property if null', function() {
        MockCallsHandler.mActiveCallForContactImage = null;
        CallScreen.setCallerContactImage();
        assert.equal(CallScreen.contactBackground.style.backgroundImage, '');
      });
    });
  });

  suite('toggleMute', function() {
    test('should change active-state class', function() {
      var classList = CallScreen.muteButton.classList;
      var originalState = classList.contains('active-state');

      CallScreen.toggleMute();
      assert.notEqual(classList.contains('active-state'), originalState);

      CallScreen.toggleMute();
      assert.equal(classList.contains('active-state'), originalState);
    });

    test('should change muted class', function() {
      var classList = CallScreen.calls.classList;
      var originalState = classList.contains('muted');

      CallScreen.toggleMute();
      assert.notEqual(classList.contains('muted'), originalState);

      CallScreen.toggleMute();
      assert.equal(classList.contains('muted'), originalState);
    });

    test('should call CallsHandler.toggleMute', function() {
      var toggleMuteSpy = this.sinon.spy(MockCallsHandler, 'toggleMute');
      CallScreen.toggleMute();
      assert.isTrue(toggleMuteSpy.calledOnce);
    });
  });

  suite('unmute', function() {
    test('should remove active-state', function() {
      var classList = CallScreen.muteButton.classList;

      CallScreen.unmute();
      assert.isFalse(classList.contains('active-state'));
    });

    test('should remove muted', function() {
      var classList = CallScreen.calls.classList;

      CallScreen.unmute();
      assert.isFalse(classList.contains('muted'));
    });

    test('should call CallsHandler.unmute', function() {
      var unmuteSpy = this.sinon.spy(MockCallsHandler, 'unmute');
      CallScreen.unmute();
      assert.isTrue(unmuteSpy.calledOnce);
    });
  });

  suite('toggleSpeaker', function() {
    test('should change active-state', function() {
      var classList = CallScreen.speakerButton.classList;
      var originalState = classList.contains('active-state');

      CallScreen.toggleSpeaker();
      assert.notEqual(classList.contains('active-state'), originalState);

      CallScreen.toggleSpeaker();
      assert.equal(classList.contains('active-state'), originalState);
    });

    test('should call CallsHandler.toggleSpeaker', function() {
      var toggleSpeakerSpy = this.sinon.spy(MockCallsHandler, 'toggleSpeaker');
      CallScreen.toggleSpeaker();
      assert.isTrue(toggleSpeakerSpy.calledOnce);
    });

  });

  suite('switchToSpeaker', function() {
    test('should add active-state on speakerButton', function() {
      var classList = CallScreen.speakerButton.classList;

      CallScreen.switchToSpeaker();
      assert.isTrue(classList.contains('active-state'));
    });

    test('should add active-state on bluetoothButton', function() {
      var classList = CallScreen.bluetoothButton.classList;

      CallScreen.switchToSpeaker();
      assert.isTrue(classList.contains('active-state'));
    });

    test('should call CallsHandler.switchToSpeaker', function() {
      var switchToSpeakerSpy =
        this.sinon.spy(MockCallsHandler, 'switchToSpeaker');
      CallScreen.switchToSpeaker();
      assert.isTrue(switchToSpeakerSpy.calledOnce);
    });

    test('should collapse bluetooth menu', function() {
      var toggleMenuSpy = this.sinon.spy(CallScreen, 'toggleBluetoothMenu');
      CallScreen.switchToSpeaker();
      assert.isTrue(toggleMenuSpy.withArgs(false).calledOnce);
    });
  });

  suite('switchToDefaultOut', function() {
    test('should remove active-state on speakerButton', function() {
      var classList = CallScreen.speakerButton.classList;

      CallScreen.switchToDefaultOut();
      assert.isFalse(classList.contains('active-state'));
    });

    test('should add active-state on bluetoothButton', function() {
      var classList = CallScreen.bluetoothButton.classList;

      CallScreen.switchToSpeaker();
      assert.isTrue(classList.contains('active-state'));
    });

    test('should call CallsHandler.switchToDefaultOut', function() {
      var switchToDefaultOutSpy =
        this.sinon.spy(MockCallsHandler, 'switchToDefaultOut');
      CallScreen.switchToDefaultOut();
      assert.isTrue(switchToDefaultOutSpy.calledOnce);
    });

    test('should pass |doNotConnect| parameter to CallsHandler', function() {
      var switchToDefaultOutSpy =
        this.sinon.spy(MockCallsHandler, 'switchToDefaultOut');
      CallScreen.switchToDefaultOut(true);
      assert.isTrue(switchToDefaultOutSpy.calledWith(true));
    });

    test('should collapse bluetooth menu', function() {
      var toggleMenuSpy = this.sinon.spy(CallScreen, 'toggleBluetoothMenu');
      CallScreen.switchToSpeaker();
      assert.isTrue(toggleMenuSpy.withArgs(false).calledOnce);
    });
  });

  suite('switchToReceiver', function() {
    test('should remove active-state on speakerButton', function() {
      var classList = CallScreen.speakerButton.classList;

      CallScreen.switchToReceiver();
      assert.isFalse(classList.contains('active-state'));
    });

    test('should remove active-state on bluetoothButton', function() {
      var classList = CallScreen.bluetoothButton.classList;

      CallScreen.switchToReceiver();
      assert.isFalse(classList.contains('active-state'));
    });

    test('should call CallsHandler.switchToReceiver', function() {
      var switchToReceiverSpy =
        this.sinon.spy(MockCallsHandler, 'switchToReceiver');
      CallScreen.switchToReceiver();
      assert.isTrue(switchToReceiverSpy.calledOnce);
    });

    test('should collapse bluetooth menu', function() {
      var toggleMenuSpy = this.sinon.spy(CallScreen, 'toggleBluetoothMenu');
      CallScreen.switchToSpeaker();
      assert.isTrue(toggleMenuSpy.withArgs(false).calledOnce);
    });
  });

  suite('setBTReceiverIcon', function() {
    test('should switch to bluetoothButton when setting enabled', function() {
      var BTClassList = bluetoothButton.classList;
      var speakerClassList = speakerButton.classList;
      CallScreen.setBTReceiverIcon(true);
      assert.isFalse(BTClassList.contains('hide'));
      assert.isTrue(speakerClassList.contains('hide'));
    });

    test('should switch to SpeakerButton when setting disabled', function() {
      var BTClassList = bluetoothButton.classList;
      var speakerClassList = speakerButton.classList;
      CallScreen.setBTReceiverIcon(false);
      assert.isTrue(BTClassList.contains('hide'));
      assert.isFalse(speakerClassList.contains('hide'));
    });
  });

  suite('syncSpeakerEnabled', function() {
    test('mozTelephony.speakerEnabled = true', function() {
      var classList = CallScreen.speakerButton.classList;
      navigator.mozTelephony.speakerEnabled = true;
      CallScreen.syncSpeakerEnabled();
      assert.isTrue(classList.contains('active-state'));
    });

    test('mozTelephony.speakerEnabled = false', function() {
      var classList = CallScreen.speakerButton.classList;
      navigator.mozTelephony.speakerEnabled = false;
      CallScreen.syncSpeakerEnabled();
      assert.isFalse(classList.contains('active-state'));
    });
  });

  suite('placeNewCall', function() {
    test('launches the dialer app with an empty dial activity', function() {
      CallScreen.placeNewCall();
      var activity = MockMozActivity.calls[0];
      assert.deepEqual(activity, {
        name: 'dial',
        data: {
          type: 'webtelephony/number',
          number: ''
        }
      });
    });

    test('resizes the call screen in status bar mode', function() {
      var resizeSpy = this.sinon.spy(window, 'resizeTo');
      CallScreen.placeNewCall();
      assert.equal(resizeSpy.firstCall.args[1], 40);
    });
  });

  suite('resizeHandler', function() {
    test('updateCallsDisplay is called with the right arguments', function() {
      this.sinon.stub(CallScreen, 'updateCallsDisplay');
      CallScreen.resizeHandler();
      sinon.assert.calledWith(CallScreen.updateCallsDisplay, false);
    });
  });

  suite('hideIncoming', function() {
    var MockWakeLock;
    setup(function() {
      MockWakeLock = {
        unlock: this.sinon.stub()
      };
      this.sinon.stub(navigator, 'requestWakeLock').returns(MockWakeLock);

      CallScreen.showIncoming();
    });

    test('should remove class of callToolbar and incomingContainer',
    function() {
      assert.isTrue(callToolbar.classList.contains('transparent'));
      assert.isTrue(incomingContainer.classList.contains('displayed'));
      CallScreen.hideIncoming();
      assert.isFalse(callToolbar.classList.contains('transparent'));
      assert.isFalse(incomingContainer.classList.contains('displayed'));
    });

    test('should remove screen wakelock if exist', function() {
      assert.isFalse(MockWakeLock.unlock.calledOnce);
      CallScreen.hideIncoming();
      assert.isTrue(MockWakeLock.unlock.calledOnce);
    });

    test('should set caller photo to active call if exist', function() {
      this.sinon.stub(CallScreen, 'setCallerContactImage');
      CallScreen.hideIncoming();
      sinon.assert.calledOnce(CallScreen.setCallerContactImage);
    });
  });

  suite('showStatusMessage', function() {
    var statusMessage,
        bannerClass,
        addEventListenerSpy,
        removeEventListenerSpy;

    setup(function() {
      this.sinon.useFakeTimers();
      statusMessage = CallScreen.statusMessage;
      bannerClass = statusMessage.classList;
      addEventListenerSpy = this.sinon.spy(statusMessage, 'addEventListener');
      removeEventListenerSpy =
        this.sinon.spy(statusMessage, 'removeEventListener');

      CallScreen.showStatusMessage('message');
    });

    test('should show the banner', function() {
      assert.include(bannerClass, 'visible');
    });
    test('should show the text', function() {
      assert.equal(statusMessage.querySelector('p').textContent,
                   'message');
    });

    suite('once the transition ends', function() {
      var stopPropagationStub;

      setup(function() {
        stopPropagationStub = this.sinon.stub();
        addEventListenerSpy.yield({stopPropagation: stopPropagationStub});
      });

      test('should remove the listener', function() {
        assert.isTrue(removeEventListenerSpy.calledWith('transitionend'));
      });

      test('should call stopPropagation', function() {
        assert.isTrue(stopPropagationStub.calledOnce);
      });

      suite('after STATUS_TIME', function() {
        setup(function(done) {
          this.sinon.clock.tick(2000);
          done();
        });
        test('should hide the banner', function() {
          assert.isFalse(bannerClass.contains('visible'));
        });
      });
    });
  });

  suite('Toggling the group details screen', function() {
    test('should show group details', function() {
      CallScreen.showGroupDetails();
      assert.isTrue(groupCalls.classList.contains('display'));
    });

    test('should hide group details', function() {
      CallScreen.hideGroupDetails();
      assert.isFalse(groupCalls.classList.contains('display'));
    });
  });

  suite('showClock in screen locked status', function() {
    var formatArgs = [],
        currentDate,
        fakeClockTime = '12:02 <span>PM</span>',
        fakeDate = 'Monday, September 16';

    setup(function() {
      this.sinon.stub(navigator.mozL10n, 'DateTimeFormat', function() {
        this.localeFormat = function(date, format) {
          formatArgs.push(arguments);
          if (format === 'shortTimeFormat') {
            return fakeClockTime;
          }
          return fakeDate;
        };
      });
    });

    test('clock and date should display current clock/date info', function() {
      currentDate = new Date();
      CallScreen.showClock(currentDate);
      var clockTime = CallScreen.lockedClockTime.innerHTML;
      var dateStr = CallScreen.lockedDate.textContent;
      // The date parameter here should be equal to clock setup date.
      assert.equal(formatArgs.length, 2);
      assert.equal(formatArgs[0][0], currentDate);
      assert.equal(formatArgs[1][0], currentDate);
      assert.equal(clockTime, fakeClockTime);
      assert.equal(dateStr, fakeDate);
    });
  });

  suite('ticker functions', function() {
    var durationNode;
    var timeNode;
    setup(function() {
      this.sinon.useFakeTimers();

      durationNode = document.createElement('div');
      durationNode.className = 'duration';

      timeNode = document.createElement('span');
      durationNode.appendChild(timeNode);

      CallScreen.createTicker(durationNode);
    });

    test('createTicker should set a timer on durationNode', function() {
      assert.ok(durationNode.dataset.tickerId);
      assert.isTrue(durationNode.classList.contains('isTimer'));
    });

    test('createTicker should update timer every second', function() {
      this.sinon.clock.tick(1000);
      assert.deepEqual(MockLazyL10n.keys.callDurationMinutes, {
        h: '00',
        m: '00',
        s: '01'
      });
    });

    test('stopTicker should stop counter on durationNode', function() {
      CallScreen.stopTicker(durationNode);
      assert.isUndefined(durationNode.dataset.tickerId);
      assert.isFalse(durationNode.classList.contains('isTimer'));
    });
  });

  suite('set end conference call', function() {
    var fakeNode1 = document.createElement('section');
    var fakeNode2 = document.createElement('section');
    var fakeNode3 = document.createElement('section');

    setup(function() {
      CallScreen.moveToGroup(fakeNode1);
      CallScreen.moveToGroup(fakeNode2);
      CallScreen.moveToGroup(fakeNode3);
    });

    test('should set groupHangup to all nodes in group detail lists',
    function() {
      CallScreen.setEndConferenceCall();
      assert.equal(fakeNode1.dataset.groupHangup, 'groupHangup');
      assert.equal(fakeNode2.dataset.groupHangup, 'groupHangup');
      assert.equal(fakeNode3.dataset.groupHangup, 'groupHangup');
    });
  });

  suite('Bluetooth sound menu', function() {
    setup(function() {
      bluetoothMenu.classList.toggle('display', false);
    });

    test('Should toggle bluetoothMenu if parameter is not boolean', function() {
      var fakeEvt = {type: 'click'};
      CallScreen.toggleBluetoothMenu(fakeEvt);
      assert.isTrue(bluetoothMenu.classList.contains('display'));
      CallScreen.toggleBluetoothMenu(fakeEvt);
      assert.isFalse(bluetoothMenu.classList.contains('display'));
    });

    test('Should set bluetoothMenu by parameter if parameter is boolean',
    function() {
      CallScreen.toggleBluetoothMenu(false);
      assert.isFalse(bluetoothMenu.classList.contains('display'));
      CallScreen.toggleBluetoothMenu(true);
      assert.isTrue(bluetoothMenu.classList.contains('display'));
    });
  });

  suite('hidePlaceNewCallButton', function() {
    test('should toggle no-add-call class', function() {
      CallScreen.hidePlaceNewCallButton();
      assert.isTrue(callToolbar.classList.contains('no-add-call'));
    });
  });

  suite('showPlaceNewCallButton', function() {
    test('should not toggle no-add-call class', function() {
      CallScreen.showPlaceNewCallButton();
      assert.isFalse(callToolbar.classList.contains('no-add-call'));
    });
  });

  suite('cdmaConferenceCall', function() {
    test('should toggle no-add-call class and hidden group-show', function() {
      CallScreen.cdmaConferenceCall();
      assert.isTrue(callToolbar.classList.contains('no-add-call'));
      assert.isTrue(calls.classList.contains('cdma-conference-call'));
    });
  });
});
