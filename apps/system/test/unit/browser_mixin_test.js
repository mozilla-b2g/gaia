'use strict';
/* global MockAppWindow */

requireApp('system/test/unit/mock_app_window.js');

suite('BrowserMixin', function() {
  var subject, realAppWindow;

  function extend(mixin) {
    for (var prop in mixin) {
      if (mixin.hasOwnProperty(prop)) {
        MockAppWindow.prototype[prop] = mixin[prop];
      }
    }
  }

  setup(function(done) {
    realAppWindow = window.AppWindow;
    window.AppWindow = MockAppWindow;
    this.sinon.stub(MockAppWindow, 'addMixin', extend);
    requireApp('system/js/browser_mixin.js', function() {
      subject = new MockAppWindow();
      done();
    });
  });

  teardown(function() {
    window.AppWindow = realAppWindow;
  });

  suite('on import >', function() {
    test('adds the mixin to the app window', function() {
      assert.isTrue(MockAppWindow.addMixin.called);
    });
  });

  suite('focus >', function() {
    setup(function() {
      this.sinon.spy(subject, 'getTopMostWindow');
    });

    test('uses the topMostWindow', function() {
      subject.focus();
      assert.isTrue(subject.getTopMostWindow.called);
    });

    test('focus the context menu if shown', function() {
      subject.contextmenu = {
        isShown: this.sinon.stub().returns(true),
        focus: this.sinon.stub()
      };
      subject.focus();
      assert.isTrue(subject.contextmenu.focus.called);
    });

    test('focus the browser element if no contextmenu', function() {
      this.sinon.spy(subject.browser.element, 'focus');
      subject.focus();
      assert.isTrue(subject.browser.element.focus.called);
    });

    test('does not focus the browser element if activeElement', function() {
      var element = subject.browser.element;
      this.sinon.stub(subject, 'getActiveElement').returns(element);
      this.sinon.spy(element, 'focus');
      subject.focus();
      assert.isFalse(element.focus.called);
    });
  });

  suite('blur >', function() {
    setup(function() {
      this.sinon.spy(subject, 'getTopMostWindow');
    });

    test('uses the topMostWindow', function() {
      subject.blur();
      assert.isTrue(subject.getTopMostWindow.called);
    });

    test('blur the browser element if activeElement', function() {
      var element = subject.browser.element;
      this.sinon.stub(subject, 'getActiveElement').returns(element);
      this.sinon.spy(element, 'blur');
      subject.blur();
      assert.isTrue(element.blur.called);
    });

    test('does not blur the browser element if !activeElement', function() {
      var element = subject.browser.element;
      this.sinon.stub(subject, 'getActiveElement').returns({});
      this.sinon.spy(element, 'blur');
      subject.blur();
      assert.isFalse(element.blur.called);
    });
  });
});
