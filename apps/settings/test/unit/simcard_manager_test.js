'use strict';

requireApp('settings/test/unit/mock_l10n.js');
requireApp('settings/test/unit/mock_template.js');
requireApp('settings/test/unit/mock_sm_simcard_helper.js');

mocha.globals(['Template', 'SimCard', 'SimCardManager']);

suite('SimCardManager > ', function() {
  var realL10n;
  var realTemplate;
  var realSimCard;
  var stubById;

  suiteSetup(function(done) {
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    realTemplate = window.Template;
    window.Template = MockTemplate;

    realSimCard = window.SimCard;
    window.SimCard = MockSimCard;

    // stub getElementById
    stubById = sinon.stub(document, 'getElementById', function(key) {

      // becase select dom can use .add method,
      // we have to create a select element for it
      if (key.match(/-select/)) {
        return document.createElement('select');
      }
      else if (key.match(/card-container/)) {

        // because we will use querySelector in a dom element,
        // we have to stub it and create a fake one
        var divDom = document.createElement('div');
        sinon.stub(divDom, 'querySelector', function() {
          return document.createElement('div');
        });

        return divDom;
      }
      else {
        return document.createElement('div');
      }
    });

    requireApp('settings/js/simcard_manager.js', done);
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    window.Template = realTemplate;
    window.SimCard = realSimCard;
    stubById.restore();
  });

  // add test below
  suite('init > ', function() {
    test('x', function() {

    });
  });
});
