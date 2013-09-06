requireApp('clock/js/banner.js');
requireApp('clock/js/utils.js');

requireApp('clock/test/unit/mocks/mock_navigator_mozl10n.js');
requireApp('clock/test/unit/mocks/mock_mozAlarm.js');

suite('Banner', function() {
  var nml;
  suiteSetup(function() {
    // store timezone offset for fake timers
    var offset = (new Date()).getTimezoneOffset() * 60 * 1000;
    nml = navigator.mozL10n;

    navigator.mozL10n = MockL10n;

    loadBodyHTML('/index.html');
    // The timestamp for "Tue Jul 16 2013 06:00:00" according to the local
    // system's time zone
    this.sixAm = 1373954400000 + offset;
    this.clock = sinon.useFakeTimers(this.sixAm);

    // The timestamp for "Tue Jul 16 2013 16:12:00" according to the local
    // system's time zone
    // add to this.sixAm to avoid failures on machines in unknown locales
    this.fourish = this.sixAm + (10 * 60 * 60 * 1000) + (12 * 60 * 1000);

  });

  test('Banner should make notification visible', function(done) {
    var note = document.getElementById('banner-countdown');
    new Banner(this.fourish);
    // banner adds the class name to the element
    var visible = note.className.split(/\s+/).some(function(elem) {
      return elem === 'visible';
    });
    assert.ok(visible);
    done();
  });
  test('Banner should call localization function', function(done) {
    var localized = this.sinon.spy(navigator.mozL10n, 'get');
    new Banner(this.fourish);
    assert.ok(localized.called);
    done();
  });
  test('Banner should pass correct parameters', function(done) {
    var note, passed;
    note = document.getElementById('banner-countdown');
    passed = this.sinon.spy(navigator.mozL10n, 'get');
    // build banner
    new Banner(this.fourish);
    // Check passed in arguments
    assert.deepEqual({n: 10}, passed.args[0][1]);
    assert.deepEqual({n: 12}, passed.args[1][1]);
    done();
  });
});
