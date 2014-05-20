/* global utils, MocksHelper */

'use strict';

document.body.innerHTML = '<div id="statusMsg">' +
'<p class="statusMsg">Test</p></div>';
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/js/contacts/import/utilities/status.js');

var mocksHelperForActivities = new MocksHelper([
  'LazyLoader'
]).init();

suite('> System Banner Utilities', function() {
  var subject, clock;


  suiteSetup(function() {
    subject = utils.status;
    mocksHelperForActivities.suiteSetup();
  });

  setup(function() {
    clock = sinon.useFakeTimers();
  });

  suiteTeardown(function() {
    clock.restore();
  });

  test('Check status msg shown', function(done) {
    var testhide = sinon.spy(subject, 'hide');
    utils.status.show('system banner shown');
    clock.tick(5000);
    assert.isTrue(testhide.called);
    done();
  });

});
