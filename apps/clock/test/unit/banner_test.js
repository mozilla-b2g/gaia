suite('Banner', function() {
  var Banner, mozL10n;

  suiteSetup(function(done) {
    // store timezone offset for fake timers
    var offset = (new Date()).getTimezoneOffset() * 60 * 1000;

    // The timestamp for "Tue Jul 16 2013 06:00:00" according to the local
    // system's time zone
    this.sixAm = 1373954400000 + offset;

    // The timestamp for "Tue Jul 16 2013 16:12:00" according to the local
    // system's time zone
    // add to this.sixAm to avoid failures on machines in unknown locales
    this.fourish = this.sixAm + (10 * 60 * 60 * 1000) + (12 * 60 * 1000);

    // Instantiate the Banner once with an element
    this.noteElem = document.createElement('div');

    testRequire(['banner', 'mocks/mock_shared/js/l10n'],
      function(banner, mockL10n) {
      Banner = banner;
      mozL10n = MockL10n;

      this.banner = new Banner(this.noteElem);

      done();
    }.bind(this));
  });

  setup(function() {
    this.clock = this.sinon.useFakeTimers(this.sixAm);
  });

  suiteTeardown(function() {
    this.clock.restore();
  });

  suite('#show', function() {
    test('should make notification visible ', function(done) {
      var visible;

      this.banner.show(this.fourish);
      visible = this.noteElem.className.split(/\s+/).some(function(elem) {
        return elem === 'visible';
      });
      assert.ok(visible);
      done();
    });
  });

  suite('#render', function() {
    test('should pass correct parameters to mozL10n.get ', function(done) {
      var passed;
      passed = this.sinon.spy(mozL10n, 'get');
      // build banner
      this.banner.render(this.fourish);
      // Check passed in arguments
      assert.deepEqual({n: 10}, passed.args[0][1]);
      assert.deepEqual({n: 12}, passed.args[1][1]);
      done();
    });
  });

});
