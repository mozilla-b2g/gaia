'use strict';

/* global loadBodyHTML, MocksHelper, MockL10n, AppWindow, ValueSelector */

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/shared/js/template.js');
requireApp('system/test/unit/mock_app_window.js');

var mocksForValueSelector = new MocksHelper([
  'AppWindow',
  'LazyLoader'
]).init();

suite('value selector/value selector', function() {
  var realL10n, realKeyboard, stubMozl10nGet, app, fragment, vs;

  var fakeAppConfig = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake',
    name: 'Fake Application'
  };
  var fakeTimeInputMethodContextChangeEvent = {
    type: '_inputmethod-contextchange',
    detail: {
      inputType: 'time'
    }
  };
  var fakeDateInputMethodContextChangeEvent = {
    type: '_inputmethod-contextchange',
    detail: {
      inputType: 'date'
    }
  };
  var fakeBlurInputMethodContextChangeEvent = {
    type: '_inputmethod-contextchange',
    detail: {
      inputType: 'blur'
    }
  };

  var fakeClosing = { type: '_closing' };
  var fakeClosed = { type: '_closed' };
  var fakeOpening = { type: '_opening' };
  var fakeLocalizedEvent = { type: '_localized' };
  var fakeTimeFormatChangeEvent = { type: 'timeformatchange' };

  mocksForValueSelector.attachTestHelpers();

  setup(function(done) {

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realKeyboard = window.navigator.mozInputMethod;
    window.navigator.mozInputMethod = sinon.stub();

    loadBodyHTML('/index.html');

    requireApp('system/js/base_ui.js');
    requireApp('system/js/value_selector/value_picker.js');
    requireApp('system/js/value_selector/spin_date_picker.js');
    requireApp('system/js/value_selector/value_selector.js', function() {
      app = new AppWindow(fakeAppConfig);
      vs = new ValueSelector(app);

      fragment = document.createElement('div');
      fragment.innerHTML = vs.view();
      document.body.appendChild(fragment);

      done();
    });
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    window.navigator.mozInputMethod = realKeyboard;
    document.body.innerHTML = '';
    fragment = null;
    vs = null;
    app = null;
  });

  test('New', function() {
    assert.isDefined(vs.instanceID);
  });

  test('Time Picker (en-US)', function() {
    var stubPublish = this.sinon.stub(vs, 'publish');
    stubMozl10nGet =
      this.sinon.stub(navigator.mozL10n, 'get').returns('%I:%M %p');
    navigator.mozHour12 = true;

    assert.isNull(vs._timePicker);

    vs.handleEvent(fakeTimeInputMethodContextChangeEvent);

    assert.isTrue(stubPublish.calledWith('shown'));
    assert.isFalse(vs.element.hidden);
    assert.isFalse(vs.elements.timePickerPopup.hidden);
    assert.isTrue(vs._timePicker.is12hFormat);
    assert.equal('time', vs._currentPickerType);
    assert.equal(':',
      vs._timePicker.elements.hoursMinutesSeparator.textContent);
    assert.ok(vs.elements.timePickerContainer.classList.contains('format12h'));
  });

  test('Time Picker (pt-BR)', function() {
    stubMozl10nGet =
      this.sinon.stub(navigator.mozL10n, 'get').returns('%Hh%M');
    navigator.mozHour12 = false;

    vs.handleEvent(fakeTimeInputMethodContextChangeEvent);

    assert.isFalse(vs._timePicker.is12hFormat);
    assert.equal('h',
      vs._timePicker.elements.hoursMinutesSeparator.textContent);
    assert.ok(vs.elements.timePickerContainer.classList.contains('format24h'));
  });

  test('Time Picker (zh-CN)', function() {
    stubMozl10nGet =
      this.sinon.stub(navigator.mozL10n, 'get').returns('%p %I:%M');
    navigator.mozHour12 = true;

    vs.handleEvent(fakeTimeInputMethodContextChangeEvent);

    assert.isTrue(vs._timePicker.is12hFormat);
    assert.equal(':',
      vs._timePicker.elements.hoursMinutesSeparator.textContent);
    assert.ok(vs.elements.timePickerContainer.classList.contains(
      'format12hrev'));
  });

  test('Time Picker reset at language change', function() {
    // start with 12h format
    var sinon = this.sinon;
    stubMozl10nGet = sinon.stub(navigator.mozL10n, 'get').returns('%I:%M %p');
    navigator.mozHour12 = true;

    vs.handleEvent(fakeTimeInputMethodContextChangeEvent);
    assert.ok(vs.elements.timePickerContainer.classList.contains('format12h'));
    assert.ok(!vs.elements.timePickerContainer.classList.contains(
      'format24h'));
    stubMozl10nGet.restore();

    // change to 24h format
    vs.handleEvent(fakeLocalizedEvent);
    assert.isNull(vs._timePicker);
    stubMozl10nGet = sinon.stub(navigator.mozL10n, 'get').returns('%H:%M');
    navigator.mozHour12 = false;
    vs.handleEvent(fakeTimeInputMethodContextChangeEvent);
    assert.ok(vs.elements.timePickerContainer.classList.contains(
      'format24h'));
    assert.ok(!vs.elements.timePickerContainer.classList.contains(
      'format12h'));
  });

  test('Time Picker reset at timeformat change', function() {
    // start with 12h format
    var sinon = this.sinon;
    stubMozl10nGet = sinon.stub(navigator.mozL10n, 'get').returns('%I:%M %p');
    navigator.mozHour12 = true;

    vs.handleEvent(fakeTimeInputMethodContextChangeEvent);
    assert.ok(vs.elements.timePickerContainer.classList.contains('format12h'));
    assert.ok(!vs.elements.timePickerContainer.classList.contains(
      'format24h'));
    stubMozl10nGet.restore();

    // change to 24h format
    vs.handleEvent(fakeTimeFormatChangeEvent);
    assert.isNull(vs._timePicker);
    stubMozl10nGet = sinon.stub(navigator.mozL10n, 'get').returns('%H:%M');
    navigator.mozHour12 = false;
    vs.handleEvent(fakeTimeInputMethodContextChangeEvent);
    assert.ok(vs.elements.timePickerContainer.classList.contains(
      'format24h'));
    assert.ok(!vs.elements.timePickerContainer.classList.contains(
      'format12h'));
  });

  test('Destroy removes timeformat listener', function() {
    this.sinon.stub(window, 'removeEventListener');
    vs.destroy();
    assert.isTrue(window.removeEventListener
      .withArgs('timeformatchange', vs).calledOnce);
  });

  test('Date Picker (en-US)', function() {
    assert.isNull(vs._datePicker);

    vs.handleEvent(fakeDateInputMethodContextChangeEvent);

    assert.isFalse(vs.element.hidden);
    assert.isFalse(vs.elements.spinDatePickerPopup.hidden);
    assert.equal('date', vs._currentPickerType);
  });

  suite('hiding', function() {
    var isActive = true;

    setup(function() {
      this.sinon.stub(vs, 'publish');
      this.sinon.stub(app, 'isActive').returns(isActive);
      this.sinon.stub(app, '_setVisibleForScreenReader');
      this.sinon.stub(app, 'focus');

      vs.handleEvent(fakeTimeInputMethodContextChangeEvent);
    });

    function assertHiddenAndFocus(focus) {
      assert.isTrue(vs.element.hidden);
      sinon.assert.calledWith(app._setVisibleForScreenReader, true);
      sinon.assert.calledWith(vs.publish, 'hidden');
      if (focus) {
        sinon.assert.calledOnce(app.focus);
      }
    }

    test('hide', function() {
      sinon.assert.calledWith(app._setVisibleForScreenReader, false);
      vs.hide();
      assertHiddenAndFocus(true);
    });

    test('hide on "_closing" event', function() {
      vs.handleEvent(fakeClosing);
      assertHiddenAndFocus(true);
    });

    test('hide on "_closed" event', function() {
      vs.handleEvent(fakeClosed);
      assertHiddenAndFocus(true);
    });

    test('hide on "_opening" event', function() {
      vs.handleEvent(fakeOpening);
      assertHiddenAndFocus(true);
    });

    test('hide on blur event', function() {
      vs.handleEvent(fakeBlurInputMethodContextChangeEvent);
      assertHiddenAndFocus(true);
    });

    test('blur should not focus if the app is not active', function() {
      isActive = false;
      vs.handleEvent(fakeBlurInputMethodContextChangeEvent);
      assertHiddenAndFocus(false);
    });
  });
});
