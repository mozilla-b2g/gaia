/*jshint maxlen:false*/
'use strict';

suite('views/overlay', function() {
  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'views/overlay'
    ], function(OverlayView) {
      self.OverlayView = OverlayView;
      done();
    });
  });

  setup(function() {
    this.view = new this.OverlayView({
      type: 'unavailable',
      closable: false
    });
  });

  suite('OverlayView#getOverlayData()', function() {
    test('Should return correct data for \'unavailable\'', function() {
      var output = this.view.getData('unavailable');
      assert.equal(output.title, 'nocard2-title');
      assert.equal(output.body, 'nocard3-text');
    });

    test('Should return correct data for \'nospace\'', function() {
      var output = this.view.getData('nospace');
      assert.equal(output.title, 'nospace2-title');
      assert.equal(output.body, 'nospace2-text');
    });

    test('Should return correct data for \'shared\'', function() {
      var output = this.view.getData('shared');
      assert.equal(output.title, 'pluggedin2-title');
      assert.equal(output.body, 'pluggedin2-text');
    });

    test('Should return correct data for \'request-fail\'', function() {
      var output = this.view.getData('request-fail');
      assert.equal(output.title, 'camera-unavailable-title');
      assert.equal(output.body, 'camera-unavailable-text');
    });

    test('Should return false for unknown key', function() {
      var output = this.view.getData('something-not-known');
      assert.equal(output, false);
    });
  });
});
