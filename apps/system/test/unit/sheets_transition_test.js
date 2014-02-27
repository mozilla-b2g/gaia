'use strict';

requireApp('system/js/sheets_transition.js');

requireApp('system/test/unit/mock_stack_manager.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_homescreen_launcher.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

var mocksForSheetsTransition = new MocksHelper([
  'StackManager',
  'AppWindowManager',
  'HomescreenLauncher',
  'SettingsListener'
]).init();

suite('system/SheetsTransition >', function() {
  mocksForSheetsTransition.attachTestHelpers();

  var dialer = {
    origin: 'app://dialer.gaiamobile.org'
  };
  var dialerFrame;

  var settings = {
    origin: 'app://settings.gaiamobile.org'
  };
  var settingsFrame;

  var contacts = {
    origin: 'app://contacts.gaiamobile.org'
  };
  var contactsFrame;

  var getPrevStub, getNextStub;

  setup(function() {
    getPrevStub = this.sinon.stub(MockStackManager, 'getPrev');
    getPrevStub.returns(dialer);
    dialerFrame = document.createElement('div');
    dialer.element = dialerFrame;

    this.sinon.stub(MockStackManager, 'getCurrent').returns(settings);
    settingsFrame = document.createElement('div');
    settings.element = settingsFrame;

    getNextStub = this.sinon.stub(MockStackManager, 'getNext');
    getNextStub.returns(contacts);
    contactsFrame = document.createElement('div');
    contacts.element = contactsFrame;
  });

  suite('Begining the transition', function() {
    setup(function() {
      SheetsTransition.begin('ltr');
    });

    test('it should add the inside-edges class to the current sheet',
    function() {
      assert.isTrue(settingsFrame.classList.contains('inside-edges'));
    });

    test('it should set the transition property on the current sheet',
    function() {
      var transition = 'transform 0ms linear 0s, opacity 0ms linear 0s';
      assert.equal(settingsFrame.style.transition, transition);
    });

    test('it should add the outside-edges-left class to the new sheet',
    function() {
      assert.isTrue(dialerFrame.classList.contains('outside-edges-left'));
    });

    test('it should set the transition property on the new sheet',
    function() {
      var transition = 'transform 0ms linear 0s, opacity 0ms linear 0s';
      assert.equal(dialerFrame.style.transition, transition);
    });

    test('it should bump the zIndex of the new sheet',
    function() {
      assert.equal(dialerFrame.dataset.zIndexLevel, 'bottom-app');
    });

    test('it should not fail when we\'re at the beginning of the stack',
    function() {
      getPrevStub.returns(null);
      SheetsTransition.begin('ltr');
      assert.isTrue(true, 'did not fail');
    });

    suite('if the direction is rtl', function() {
      setup(function() {
        SheetsTransition.begin('rtl');
      });

      test('it should add the outside-edges-right class to the new sheet',
      function() {
        assert.isTrue(contactsFrame.classList.contains('outside-edges-right'));
      });

      test('it should set the transition property on the new sheet',
      function() {
        var transition = 'transform 0ms linear 0s, opacity 0ms linear 0s';
        assert.equal(contactsFrame.style.transition, transition);
      });

      test('it should bump the zIndex of the new sheet',
      function() {
        assert.equal(contactsFrame.dataset.zIndexLevel, 'top-app');
      });

      test('it should not fail when we\'re at the end of the stack',
      function() {
        getNextStub.returns(null);
        SheetsTransition.begin('rtl');
        assert.isTrue(true, 'did not fail');
      });
    });
  });

  suite('Moving the sheets', function() {
    setup(function() {
      SheetsTransition.begin('ltr');
      SheetsTransition.moveInDirection('ltr', 0.3);
    });

    test('it should set the transform property on the current sheet',
    function() {
      assert.equal(settingsFrame.style.transform, 'translateX(30%)');
    });

    test('it should set the transform property on the new sheet',
    function() {
      assert.equal(dialerFrame.style.transform, 'translateX(-14%)');
    });

    test('it should set the opacity property on the new sheet',
    function() {
      assert.equal(dialerFrame.style.opacity, '0.475');
    });

    suite('if the direction is rtl', function() {
      setup(function() {
        SheetsTransition.begin('rtl');
        SheetsTransition.moveInDirection('rtl', 0.3);
      });

      test('it should set the transform property on the current sheet',
      function() {
        assert.equal(settingsFrame.style.transform, 'translateX(-6%)');
      });

      test('it should set the opacity property on the current sheet',
      function() {
        assert.equal(settingsFrame.style.opacity, '0.775');
      });

      test('it should set the transform property on the new sheet',
      function() {
        assert.equal(contactsFrame.style.transform, 'translateX(70%)');
      });
    });

    suite('if we\'re overflowing', function() {
      setup(function() {
        getPrevStub.returns(null);
        SheetsTransition.begin('ltr');
      });

      test('it should set the transform normally at first',
      function() {
        SheetsTransition.moveInDirection('ltr', 0.2);
        assert.equal(settingsFrame.style.transform, 'translateX(20%)');
      });

      test('it should resist after 20% of progress',
      function() {
        SheetsTransition.moveInDirection('ltr', 0.3);
        var transform = settingsFrame.style.transform;
        var percentage = parseFloat(transform.split('(')[1].replace('%)', ''));
        assert.isTrue(percentage > 24);
        assert.isTrue(percentage < 24.5);
      });

      suite('at the top of the stack', function() {
        setup(function() {
          getNextStub.returns(null);
          SheetsTransition.begin('rtl');
        });

        test('it should not change the opacity of the current sheet',
        function() {
          SheetsTransition.moveInDirection('rtl', 0.2);
          assert.equal(settingsFrame.style.opacity, '');
        });
      });
    });
  });

  suite('Snaping in place', function() {
    setup(function() {
      SheetsTransition.begin('ltr');
      SheetsTransition.moveInDirection('ltr', 0.35);
      SheetsTransition.snapInPlace();
    });

    test('it should set the transition duration on the sheets', function() {
      var transition = 'transform 105ms linear 0s, opacity 105ms linear 0s';
      assert.equal(settingsFrame.style.transition, transition);
      assert.equal(dialerFrame.style.transition, transition);
    });

    suite('if the sheet barely moved', function() {
      setup(function() {
        SheetsTransition.begin('ltr');
        SheetsTransition.moveInDirection('ltr', 0.1);
        SheetsTransition.snapInPlace();
      });

      test('it should have a minimum duration', function() {
        var transition = 'transform 90ms linear 0s, opacity 90ms linear 0s';
        assert.equal(settingsFrame.style.transition, transition);
        assert.equal(dialerFrame.style.transition, transition);
      });
    });
  });

  suite('Snaping back', function() {
    setup(function() {
      SheetsTransition.begin('ltr');
      SheetsTransition.moveInDirection('ltr', 0.7);
      SheetsTransition.snapBack(0.005);
    });

    test('it should set the transition duration on the sheets', function() {
      var transition = 'transform 50ms linear 0s, opacity 50ms linear 0s';
      assert.equal(settingsFrame.style.transition, transition);
      assert.equal(dialerFrame.style.transition, transition);
    });

    test('it should remove the initial css classes on the sheets', function() {
      assert.isFalse(settingsFrame.classList.contains('inside-edges'));
      assert.isFalse(dialerFrame.classList.contains('outside-edges-left'));
    });

    test('it should add the final css classes on the sheets', function() {
      assert.isTrue(settingsFrame.classList.contains('outside-edges-right'));
      assert.isTrue(dialerFrame.classList.contains('inside-edges'));
    });

    test('but it should have a maximum duration when velocity is too low',
    function() {
      SheetsTransition.begin('ltr');
      SheetsTransition.moveInDirection('ltr', 0.7);
      SheetsTransition.snapBack(0.0001);

      var transition = 'transform 90ms linear 0s, opacity 90ms linear 0s';
      assert.equal(settingsFrame.style.transition, transition);
      assert.equal(dialerFrame.style.transition, transition);
    });

    suite('when we\'re at the beginning of the stack', function() {
      var snapSpy;

      setup(function() {
        snapSpy = this.sinon.spy(SheetsTransition, 'snapInPlace');
        getPrevStub.returns(null);
        SheetsTransition.begin('ltr');
        SheetsTransition.moveInDirection('ltr', 0.7);
        SheetsTransition.snapBack(0.005);
      });

      test('it should just snapInPlace instead', function() {
        assert.isTrue(snapSpy.calledOnce);
      });

      test('it should not change the current sheet class', function() {
        assert.isTrue(settingsFrame.classList.contains('inside-edges'));
      });
    });
  });

  suite('Snaping forward', function() {
    setup(function() {
      SheetsTransition.begin('rtl');
      SheetsTransition.moveInDirection('rtl', 0.7);
      SheetsTransition.snapForward(0.005);
    });

    test('it should set the transition duration on the sheets', function() {
      var transition = 'transform 50ms linear 0s, opacity 50ms linear 0s';
      assert.equal(settingsFrame.style.transition, transition);
      assert.equal(contactsFrame.style.transition, transition);
    });

    test('it should remove the initial css classes on the sheets', function() {
      assert.isFalse(settingsFrame.classList.contains('inside-edges'));
      assert.isFalse(contactsFrame.classList.contains('outside-edges-right'));
    });

    test('it should add the final css classes on the sheets', function() {
      assert.isTrue(settingsFrame.classList.contains('outside-edges-left'));
      assert.isTrue(contactsFrame.classList.contains('inside-edges'));
    });

    test('but it should have a maximum duration when velocity is too low',
    function() {
      SheetsTransition.begin('rtl');
      SheetsTransition.moveInDirection('rtl', 0.7);
      SheetsTransition.snapBack(0.0001);

      var transition = 'transform 90ms linear 0s, opacity 90ms linear 0s';
      assert.equal(settingsFrame.style.transition, transition);
      assert.equal(contactsFrame.style.transition, transition);
    });

    suite('when we\'re at the end of the stack', function() {
      var snapSpy;

      setup(function() {
        snapSpy = this.sinon.spy(SheetsTransition, 'snapInPlace');
        getNextStub.returns(null);
        SheetsTransition.begin('rtl');
        SheetsTransition.moveInDirection('rtl', 0.7);
        SheetsTransition.snapForward(0.005);
      });

      test('it should just snapInPlace instead', function() {
        assert.isTrue(snapSpy.calledOnce);
      });

      test('it should not change the current sheet class', function() {
        assert.isTrue(settingsFrame.classList.contains('inside-edges'));
      });
    });
  });

  suite('Ending the transition', function() {
    var currentTrSpy, prevTrSpy, callbackSpy;

    setup(function() {
      currentTrSpy = this.sinon.spy(settingsFrame, 'addEventListener');
      prevTrSpy = this.sinon.spy(dialerFrame, 'addEventListener');
      callbackSpy = this.sinon.spy();

      SheetsTransition.begin('ltr');
      SheetsTransition.moveInDirection('ltr', 0.2);
      SheetsTransition.snapInPlace();
      SheetsTransition.end(callbackSpy);
    });

    test('it should clear the transform property on the current sheet',
    function() {
      assert.equal(settingsFrame.style.transform, '');
    });

    test('it should clean the current sheet css classes after the transition',
    function() {
      assert.isTrue(settingsFrame.classList.contains('inside-edges'));
      currentTrSpy.yield();
      assert.isFalse(settingsFrame.classList.contains('inside-edges'));
    });

    test('it should clear the current transition property after the transition',
    function() {
      assert.ok(settingsFrame.style.transition);
      currentTrSpy.yield();
      assert.equal(settingsFrame.style.transition, '');
    });

    test('it should clear the transform property on the new sheet',
    function() {
      assert.equal(dialerFrame.style.transform, '');
    });

    test('it should clean the new sheet css classes after the transition',
    function() {
      assert.isTrue(dialerFrame.classList.contains('outside-edges-left'));
      prevTrSpy.yield();
      assert.isFalse(dialerFrame.classList.contains('outside-edges-left'));
    });

    test('it should clear the new transition property after the transition',
    function() {
      assert.ok(dialerFrame.style.transition);
      prevTrSpy.yield();
      assert.equal(dialerFrame.style.transition, '');
    });

    test('it should trigger the callback once after the transition',
    function() {
      prevTrSpy.yield();
      currentTrSpy.yield();
      assert.isTrue(callbackSpy.calledOnce);
    });

    test('it should not fail when we\'re at the beginning of the stack',
    function() {
      getPrevStub.returns(null);
      SheetsTransition.begin('ltr');
      SheetsTransition.end();
      assert.isTrue(true, 'did not fail');
    });

    suite('if the sheets didn\'t move', function() {
      setup(function() {
        SheetsTransition.begin('ltr');
        SheetsTransition.snapInPlace();
        SheetsTransition.end(callbackSpy);
      });

      test('it should cleanup without waiting',
      function() {
        assert.isFalse(settingsFrame.classList.contains('outside-edges-left'));
        assert.equal(settingsFrame.style.transition, '');

        assert.isFalse(dialerFrame.classList.contains('outside-edges-left'));
        assert.equal(dialerFrame.style.transition, '');
      });

      test('it should trigger the callback once without waiting',
      function() {
        assert.isTrue(callbackSpy.calledOnce);
      });
    });

    suite('if the direction is rtl', function() {
      var nextTrSpy;

      setup(function() {
        nextTrSpy = this.sinon.spy(contactsFrame, 'addEventListener');

        SheetsTransition.begin('rtl');
        SheetsTransition.moveInDirection('rtl', 0.2);
        SheetsTransition.snapInPlace();
        SheetsTransition.end();
      });

      test('it should clear the transform property on the new sheet',
      function() {
        assert.equal(contactsFrame.style.transform, '');
      });

      test('it should clean the new sheet css classes after the transition',
      function() {
        assert.isTrue(contactsFrame.classList.contains('outside-edges-right'));
        nextTrSpy.yield();
        assert.isFalse(contactsFrame.classList.contains('outside-edges-right'));
      });

      test('it should clear the new transition property after the transition',
      function() {
        assert.ok(contactsFrame.style.transition);
        nextTrSpy.yield();
        assert.equal(contactsFrame.style.transition, '');
      });

      test('it should clear the new zIndex property after the transition',
      function() {
        assert.ok(contactsFrame.dataset.zIndexLevel);
        nextTrSpy.yield();
        assert.isUndefined(contactsFrame.dataset.zIndexLevel);
      });


      test('it should not fail when we\'re at the end of the stack',
      function() {
        getNextStub.returns(null);
        SheetsTransition.begin('rtl');
        assert.isTrue(true, 'did not fail');
      });
    });
  });

  suite('Preparing edge candidates >', function() {
    function dispatchStackChanged(apps, position) {
      var details = {
        position: position,
        sheets: apps
      };

      var evt = new CustomEvent('stackchanged', { detail: details });
      window.dispatchEvent(evt);
    };

    setup(function() {
      SheetsTransition.init();
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);
    });

    suite('Going back to the homescreen', function() {
      setup(function() {
        dialerFrame.classList.add('edge-candidate');
        dispatchStackChanged([dialer, contacts, settings], null);
      });

      test('it should remove the css class', function() {
        assert.isFalse(dialerFrame.classList.contains('edge-candidate'));
        assert.isFalse(contactsFrame.classList.contains('edge-candidate'));
        assert.isFalse(settingsFrame.classList.contains('edge-candidate'));
      });
    });

    suite('With one sheet before and one after', function() {
      setup(function() {
        dispatchStackChanged([dialer, contacts, settings], 1);
      });

      test('it should put the css class on all of them', function() {
        assert.isTrue(dialerFrame.classList.contains('edge-candidate'));
        assert.isTrue(contactsFrame.classList.contains('edge-candidate'));
        assert.isTrue(settingsFrame.classList.contains('edge-candidate'));
      });
    });

    suite('With sheets only after', function() {
      setup(function() {
        dispatchStackChanged([dialer, contacts, settings], 0);
      });

      test('it should put the css class on the next one', function() {
        assert.isTrue(dialerFrame.classList.contains('edge-candidate'));
        assert.isTrue(contactsFrame.classList.contains('edge-candidate'));
        assert.isFalse(settingsFrame.classList.contains('edge-candidate'));
      });
    });

    suite('With sheets only before', function() {
      setup(function() {
        dispatchStackChanged([dialer, contacts, settings], 2);
      });

      test('it should put the css class on the previous one', function() {
        assert.isFalse(dialerFrame.classList.contains('edge-candidate'));
        assert.isTrue(contactsFrame.classList.contains('edge-candidate'));
        assert.isTrue(settingsFrame.classList.contains('edge-candidate'));
      });
    });

    suite('If the edge gestures are disabled', function() {
      setup(function() {
        MockSettingsListener.mCallbacks['edgesgesture.enabled'](false);
        dispatchStackChanged([dialer, contacts, settings], 1);
      });

      teardown(function() {
        MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);
      });

      test('it should not touch the sheets', function() {
        assert.isFalse(dialerFrame.classList.contains('edge-candidate'));
        assert.isFalse(contactsFrame.classList.contains('edge-candidate'));
        assert.isFalse(settingsFrame.classList.contains('edge-candidate'));
      });
    });
  });
});
