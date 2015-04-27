'use strict';
/* global MocksHelper */
/* global MockStackManager */
/* global SheetsTransition */
/* global MockService */

requireApp('system/js/sheets_transition.js');

requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_stack_manager.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

var mocksForSheetsTransition = new MocksHelper([
  'Service',
  'StackManager',
  'SettingsListener'
]).init();

suite('system/SheetsTransition >', function() {
  mocksForSheetsTransition.attachTestHelpers();

  var dialer = {
    origin: 'app://dialer.gaiamobile.org',
    broadcast: function() {},
    setNFCFocus: function() {}
  };
  var dialerFrame;

  var settings = {
    origin: 'app://settings.gaiamobile.org',
    broadcast: function() {},
    setNFCFocus: function() {}
  };
  var settingsFrame;

  var contacts = {
    origin: 'app://contacts.gaiamobile.org',
    broadcast: function() {},
    setNFCFocus: function() {}
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

  teardown(function() {
    window.homescreenLauncher = undefined;
  });

  suite('Begining the transition', function() {
    setup(function() {
      this.sinon.spy(dialer, 'broadcast');
      SheetsTransition.begin('ltr');
    });

    test('it should setNFCFocus(false) to current app', function() {
      this.sinon.spy(contacts, 'setNFCFocus');
      MockStackManager.getCurrent.returns(contacts);
      SheetsTransition.begin('ltr');
      assert.isTrue(contacts.setNFCFocus.calledWith(false));
    });

    test('it should cleanup previous sheet transitions', function() {
      SheetsTransition.moveInDirection('ltr', 0.3);

      MockStackManager.getCurrent.returns(contacts);
      SheetsTransition.begin('ltr');

      assert.isFalse(settingsFrame.classList.contains('inside-edges'));
      assert.equal(settingsFrame.style.transform, '');
    });

    test('it should add the inside-edges class to the current sheet',
    function() {
      assert.isTrue(settingsFrame.classList.contains('inside-edges'));
    });

    test('it should set the transition property on the current sheet',
    function() {
      var transition = 'transform 0ms linear 0s';
      assert.equal(settingsFrame.style.transition, transition);
    });

    test('it should add the outside-edges-left class to the new sheet',
    function() {
      assert.isTrue(dialerFrame.classList.contains('outside-edges-left'));
    });

    test('it should set the transition property on the new sheet',
    function() {
      var transition = 'transform 0ms linear 0s';
      assert.equal(dialerFrame.style.transition, transition);
    });

    test('it should let the new sheet know that it\'s going to be displayed',
    function() {
      sinon.assert.calledWith(dialer.broadcast, 'sheetdisplayed');
    });

    test('it should set the transitioning flag', function() {
      assert.isTrue(SheetsTransition.transitioning);
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
        var transition = 'transform 0ms linear 0s';
        assert.equal(contactsFrame.style.transition, transition);
      });

      test('it should not fail when we\'re at the end of the stack',
      function() {
        getNextStub.returns(null);
        SheetsTransition.begin('rtl');
        assert.isTrue(true, 'did not fail');
      });
    });
  });

  test('it should dispatch a sheets-gesture-begin event', function(done) {
    window.addEventListener('sheets-gesture-begin', function gotIt(evt) {
      window.removeEventListener('sheets-gesture-begin', gotIt);

      assert.isTrue(true, 'got it');
      done();
    });

    SheetsTransition.begin('ltr');
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
      assert.equal(dialerFrame.style.transform,
                   'translateX(calc(-70% - 2rem))');
    });

    suite('if the direction is rtl', function() {
      setup(function() {
        SheetsTransition.begin('rtl');
        SheetsTransition.moveInDirection('rtl', 0.3);
      });

      test('it should set the transform property on the current sheet',
      function() {
        assert.equal(settingsFrame.style.transform, 'translateX(-30%)');
      });

      test('it should set the transform property on the new sheet',
      function() {
        assert.equal(contactsFrame.style.transform,
                     'translateX(calc(70% + 2rem))');
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
    });
  });

  suite('Snaping in place', function() {
    setup(function() {
      SheetsTransition.begin('ltr');
      SheetsTransition.moveInDirection('ltr', 0.35);
      SheetsTransition.snapInPlace();
    });

    test('it should set the transition duration on the sheets', function() {
      var transition = 'transform 105ms linear 0s';
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
        var transition = 'transform 90ms linear 0s';
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
      var transition = 'transform 50ms linear 0s';
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

      var transition = 'transform 90ms linear 0s';
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
      var transition = 'transform 50ms linear 0s';
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

      var transition = 'transform 90ms linear 0s';
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
    var currentTrSpy, prevTrSpy;

    setup(function() {
      currentTrSpy = this.sinon.spy(settingsFrame, 'addEventListener');
      prevTrSpy = this.sinon.spy(dialerFrame, 'addEventListener');

      SheetsTransition.begin('ltr');
      SheetsTransition.moveInDirection('ltr', 0.2);
      SheetsTransition.snapInPlace();
    });

    test('it should clear the transform property on the current sheet',
    function() {
      assert.equal(settingsFrame.style.transform, '');
    });

    test('it should ignore opasity transitionend', function() {
      assert.isTrue(settingsFrame.classList.contains('inside-edges'));
      currentTrSpy.yield({propertyName: 'opacity'});
      assert.isTrue(settingsFrame.classList.contains('inside-edges'));
    });

    test('it should clean the current sheet css classes after the transition',
    function() {
      assert.isTrue(settingsFrame.classList.contains('inside-edges'));
      currentTrSpy.yield({propertyName: 'transform'});
      assert.isFalse(settingsFrame.classList.contains('inside-edges'));
    });

    test('it should clear the current transition property after the transition',
    function() {
      assert.ok(settingsFrame.style.transition);
      currentTrSpy.yield({propertyName: 'transform'});
      assert.equal(settingsFrame.style.transition, '');
    });

    test('it should clear the transform property on the new sheet',
    function() {
      assert.equal(dialerFrame.style.transform, '');
    });

    test('it should clean the new sheet css classes after the transition',
    function() {
      assert.isTrue(dialerFrame.classList.contains('outside-edges-left'));
      prevTrSpy.yield({propertyName: 'transform'});
      assert.isFalse(dialerFrame.classList.contains('outside-edges-left'));
    });

    test('it should clear the new transition property after the transition',
    function() {
      assert.ok(dialerFrame.style.transition);
      prevTrSpy.yield({propertyName: 'transform'});
      assert.equal(dialerFrame.style.transition, '');
    });

    test('it should not fail when we\'re at the beginning of the stack',
    function() {
      getPrevStub.returns(null);
      SheetsTransition.begin('ltr');
      SheetsTransition.end();
      assert.isTrue(true, 'did not fail');
    });

    test('it should update the transitioning flag', function() {
      assert.isFalse(SheetsTransition.transitioning);
    });

    suite('if the sheets didn\'t move', function() {
      setup(function() {
        SheetsTransition.begin('ltr');
        SheetsTransition.snapInPlace();
        SheetsTransition.end();
      });

      test('it should cleanup without waiting',
      function() {
        assert.isFalse(settingsFrame.classList.contains('outside-edges-left'));
        assert.equal(settingsFrame.style.transition, '');

        assert.isFalse(dialerFrame.classList.contains('outside-edges-left'));
        assert.equal(dialerFrame.style.transition, '');
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
        nextTrSpy.yield({propertyName: 'transform'});
        assert.isFalse(contactsFrame.classList.contains('outside-edges-right'));
      });

      test('it should clear the new transition property after the transition',
      function() {
        assert.ok(contactsFrame.style.transition);
        nextTrSpy.yield({propertyName: 'transform'});
        assert.equal(contactsFrame.style.transition, '');
      });

      test('it should not fail when we\'re at the end of the stack',
      function() {
        getNextStub.returns(null);
        SheetsTransition.begin('rtl');
        assert.isTrue(true, 'did not fail');
      });
    });
  });
});
