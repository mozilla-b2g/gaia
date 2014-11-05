/* global AttentionIndicator */
'use strict';

suite('system/AttentionIndicator', function() {
  var stubById;
  setup(function(done) {
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));

    requireApp('system/js/attention_indicator.js', done);
  });

  teardown(function() {
    stubById.restore();
  });
  test('New indicator', function() {
    var ai = new AttentionIndicator();
    ai.start();
    assert.isTrue(ai.element.classList.contains('attention-indicator'));
  });
  test('Show/Hide', function() {
    var ai = new AttentionIndicator();
    ai.start();
    ai.show();
    assert.isTrue(ai.element.classList.contains('visible'));
    ai.hide();
    assert.isFalse(ai.element.classList.contains('visible'));
  });
});
