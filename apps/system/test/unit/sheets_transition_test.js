'use strict';

requireApp('system/js/sheets_transition.js');

requireApp('system/test/unit/mock_stack_manager.js');
requireApp('system/test/unit/mock_window_manager.js');

var mocksForSheetsTransition = new MocksHelper([
  'StackManager'
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
    dialer.frame = dialerFrame;

    this.sinon.stub(MockStackManager, 'getCurrent').returns(settings);
    settingsFrame = document.createElement('div');
    settings.frame = settingsFrame;

    getNextStub = this.sinon.stub(MockStackManager, 'getNext');
    getNextStub.returns(contacts);
    contactsFrame = document.createElement('div');
    contacts.frame = contactsFrame;
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
      assert.equal(settingsFrame.style.transition, 'transform 0s ease 0s');
    });

    test('it should add the outside-edges-left class to the new sheet',
    function() {
      assert.isTrue(dialerFrame.classList.contains('outside-edges-left'));
    });

    test('it should set the transition property on the new sheet',
    function() {
      assert.equal(dialerFrame.style.transition, 'transform 0s ease 0s');
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
        assert.equal(contactsFrame.style.transition, 'transform 0s ease 0s');
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

    suite('if the direction is rtl', function() {
      setup(function() {
        SheetsTransition.begin('rtl');
        SheetsTransition.moveInDirection('rtl', 0.3);
      });

      test('it should set the transform property on the current sheet',
      function() {
        assert.equal(settingsFrame.style.transform, 'translateX(-6%)');
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
    });
  });

  suite('Snaping in place', function() {
    setup(function() {
      SheetsTransition.begin('ltr');
      SheetsTransition.moveInDirection('ltr', 0.35);
      SheetsTransition.snapInPlace();
    });

    test('it should set the transition duration on the sheets', function() {
      assert.equal(settingsFrame.style.transition, 'transform 105ms linear 0s');
      assert.equal(dialerFrame.style.transition, 'transform 105ms linear 0s');
    });

    suite('if the sheet barely moved', function() {
      setup(function() {
        SheetsTransition.begin('ltr');
        SheetsTransition.moveInDirection('ltr', 0.1);
        SheetsTransition.snapInPlace();
      });

      test('it should have a minimum duration', function() {
        assert.equal(settingsFrame.style.transition,
                     'transform 90ms linear 0s');
        assert.equal(dialerFrame.style.transition, 'transform 90ms linear 0s');
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
      assert.equal(settingsFrame.style.transition, 'transform 50ms linear 0s');
      assert.equal(dialerFrame.style.transition, 'transform 50ms linear 0s');
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

      assert.equal(settingsFrame.style.transition, 'transform 90ms linear 0s');
      assert.equal(dialerFrame.style.transition, 'transform 90ms linear 0s');
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
      assert.equal(settingsFrame.style.transition, 'transform 50ms linear 0s');
      assert.equal(contactsFrame.style.transition, 'transform 50ms linear 0s');
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

      assert.equal(settingsFrame.style.transition, 'transform 90ms linear 0s');
      assert.equal(contactsFrame.style.transition, 'transform 90ms linear 0s');
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
});
