/* global utils, MocksHelper, MockL10n */

'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

var mocksHelperForActivities = new MocksHelper([
  'LazyLoader'
]).init();

function loadHTML() {
  document.body.innerHTML = '<div id="statusMsg" class="hidden">' +
                            '  <p class="statusMsg">Test</p>' +
                            '</div>';
}

suite('> System Banner Utilities', function() {
  var statusDOM,
      subject;

  var realL10n;

  mocksHelperForActivities.attachTestHelpers();
  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  setup(function(done) {
    this.sinon.useFakeTimers();
    loadHTML();
    // calling it here to be able to reload the HTML on setup, as status.js
    // assigns the #statusMsg on load
    require('/shared/js/contacts/import/utilities/status.js', function () {
      subject = utils.status;
      statusDOM = document.querySelector('#statusMsg');
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    subject = null;
    document.body.innerHTML = '';
  });

  test('Status msg shown when passing proper parameter', function() {
    var parameter = {
      id: 'some_id',
      args: {'optional_args': 'args value'}
    };

    utils.status.show(parameter);
    assert.isFalse(statusDOM.classList.contains('hidden'));
  });

  test('Status not shown when passing wrong parameter', function() {
    var parameter = 'some string';
    var errorSpy = this.sinon.spy(console, 'error');

    utils.status.show(parameter);
    assert.isTrue(statusDOM.classList.contains('hidden'));
    assert.isTrue(errorSpy.calledWith('Status arguments must be objects'));
  });

  test('Status msg hidden on time after shown', function(done) {
    var testhide = sinon.spy(subject, 'hide');
    utils.status.show({id: 'system_banner_shown'});
    this.sinon.clock.tick(5000);
    assert.isTrue(testhide.called);
    done();
  });

});
