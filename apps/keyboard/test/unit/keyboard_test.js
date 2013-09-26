/*global requireApp suiteSetup suite teardown setup test sinon assert
  suiteTeardown initKeyboard defaultKeyboardName Keyboards IMERender
  isKeyboardRendered */
requireApp('keyboard/js/keyboard.js');

defaultKeyboardName = 'Default';
Keyboards = {
  Default: {
    keys: []
  },
  telLayout: {
    keys: []
  },
  en: {
    keys: []
  }
};
IMERender = {};

suite('Keyboard', function() {
  var imeRender;
  var imm, _mozInputMethod;

  function setupIMERender() {
    return {
      init: sinon.stub(),
      draw: sinon.stub(),
      ime: document.createElement('div'),
      hideIME: sinon.stub(),
      showIME: sinon.stub(),
      setInputMethodName: sinon.stub(),
      setUpperCaseLock: sinon.stub(),
      showCandidates: sinon.stub(),
      getWidth: sinon.stub().returns(100)
    };
  }

  suiteSetup(function() {
    document.body.innerHTML += '<div id="confirm-dialog"></div>' +
      '<div id="ftu-ok"></div>';

    var confirmDialog = document.createElement('div');
    confirmDialog.id = 'confirm-dialog';
    document.body.appendChild(confirmDialog);

    _mozInputMethod = navigator.mozInputMethod;
    navigator.mozInputMethod = imm = {};

    window.IMERender = setupIMERender();
    initKeyboard();
  });

  setup(function() {
    window.IMERender = imeRender = setupIMERender();
    window.location.hash = '#';

    isKeyboardRendered = false;
  });

  suiteTeardown(function() {
    navigator.mozInputMethod = _mozInputMethod;
  });

  suite('Focus change', function() {
    test('onInputContextChange w/o context, hide', function(next) {
      imm.inputcontext = null;
      imm.oninputcontextchange();

      setTimeout(function() {
        sinon.assert.callCount(imeRender.hideIME, 1);
        next();
      }, 150);
    });

    test('onInputContextChange with text context', function(next) {
      imm.inputcontext = {
        type: 'text',
        inputType: 'text',
        inputMode: 'verbatim',
        getText: createStubPromise(true, 'This is le text')
      };
      imm.oninputcontextchange();

      setTimeout(function() {
        sinon.assert.callCount(imeRender.draw, 1);
        sinon.assert.calledWith(imeRender.draw, Keyboards.Default,
          { inputType: 'text', showCandidatePanel: false, uppercase: false });
        next();
      }, 0);
    });

    test('onInputContextChange with tel context', function(next) {
      imm.inputcontext = {
        type: 'tel',
        inputType: 'tel',
        inputMode: '',
        getText: createStubPromise(true, '01234567')
      };
      imm.oninputcontextchange();

      setTimeout(function() {
        sinon.assert.callCount(imeRender.draw, 1);
        sinon.assert.calledWith(imeRender.draw, Keyboards.Default,
          { inputType: 'tel', showCandidatePanel: false, uppercase: false });
        next();
      }, 0);
    });

    test('Hashchange should call draw for en-US', function(next) {
      imm.inputcontext = {
        type: 'text',
        inputType: 'text',
        inputMode: 'verbatim',
        getText: createStubPromise(true, 'heeeeyo')
      };

      window.location.hash = '#en-US';

      setTimeout(function() {
        sinon.assert.callCount(imeRender.draw, 1);
        sinon.assert.calledWith(imeRender.draw, Keyboards.en,
          { inputType: 'text', showCandidatePanel: false, uppercase: false });
        sinon.assert.callCount(imeRender.showIME, 1);
        next();
      }, 150);
    });

    test('Hashchange should call draw for tel', function(next) {
      imm.inputcontext = {
        type: 'tel',
        inputType: 'tel',
        inputMode: '',
        getText: createStubPromise(true, 'heeeeyo')
      };

      window.location.hash = '#telLayout';

      setTimeout(function() {
        sinon.assert.callCount(imeRender.draw, 1);
        sinon.assert.calledWith(imeRender.draw, Keyboards.telLayout,
          { inputType: 'tel', showCandidatePanel: false, uppercase: false });
        sinon.assert.callCount(imeRender.showIME, 1);
        next();
      }, 150);
    });

    test('Hashchange should call draw for tel', function(next) {
      imm.inputcontext = {
        type: 'tel',
        inputType: 'tel',
        inputMode: '',
        getText: createStubPromise(true, 'heeeeyo')
      };

      window.location.hash = '#telLayout';

      setTimeout(function() {
        sinon.assert.callCount(imeRender.draw, 1);
        sinon.assert.calledWith(imeRender.draw, Keyboards.telLayout,
          { inputType: 'tel', showCandidatePanel: false, uppercase: false });
        sinon.assert.callCount(imeRender.showIME, 1);
        next();
      }, 150);
    });

    test('Wait to show IME until hashevent occured', function(next) {
      imm.inputcontext = {
        type: 'text',
        inputType: 'text',
        inputMode: 'verbatim',
        getText: createStubPromise(true, 'heeeeyo')
      };
      imm.oninputcontextchange();
      // hashchange comes in a bit later...
      setTimeout(function() {
        window.location.hash = '#en-US';
      }, 50);

      setTimeout(function() {
        sinon.assert.callCount(imeRender.draw, 1);
        sinon.assert.calledWith(imeRender.draw, Keyboards.en);
        sinon.assert.callCount(imeRender.showIME, 1);
        next();
      }, 150);
    });
  });

  suite('Hiding', function() {
    // Focus on an input field and callback when done the whole flow
    function focus(next) {
      imm.inputcontext = {
        type: 'text',
        inputType: 'text',
        inputMode: 'verbatim',
        getText: createStubPromise(true, 'heeeeyo')
      };
      imm.oninputcontextchange();
      // hashchange comes in a bit later...
      setTimeout(function() {
        window.location.hash = '#en-US';
        setTimeout(next, 0);
      }, 50);
    }

    test('Hide when blur', function(next) {
      focus(function() {
        imm.inputcontext = null;
        imm.oninputcontextchange();

        setTimeout(function() {
          sinon.assert.callCount(imeRender.hideIME, 1);
          next();
        }, 100);
      });
    });

    test('Don\'t hide on quick blur/focus', function(next) {
      focus(function() {
        imm.inputcontext = null;
        imm.oninputcontextchange();

        // and directly get the next element
        focus(function() {
          setTimeout(function() {
            sinon.assert.callCount(imeRender.hideIME, 0);
            next();
          }, 200);
        });
      });
    });
  });

  function createStubPromise(success, returnValue, timeout) {
    var ret = {
      then: function(successCb, failureCb) {
        setTimeout(
          (success ? successCb : failureCb).bind(null, returnValue),
          timeout || 0);
      }
    };
    var o = sinon.stub().returns(ret);
    return o;
  }
});
