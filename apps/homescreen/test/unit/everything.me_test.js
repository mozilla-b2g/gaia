'use strict';

requireApp('homescreen/test/unit/mock_everything.me.html.js');
requireApp('homescreen/everything.me/js/everything.me.js');

suite('everything.me.js >', function() {

  var wrapperNode;

  suiteSetup(function() {
    wrapperNode = document.createElement('section');
    wrapperNode.innerHTML = MockEverythingMeHtml;
    document.body.appendChild(wrapperNode);
    EverythingME.init();
  });

  suiteTeardown(function() {
    document.body.removeChild(wrapperNode);
  });

  suite('Everything.me is initialized correctly >', function() {

    test('Ev.me page is not loaded >', function() {
      assert.isFalse(EverythingME.displayed);
    });
  });

  suite('Everything.me is displayed >', function() {

    EverythingME.activate();

    test('Ev.me page is loaded >', function() {
      assert.isTrue(EverythingME.displayed);
    });
  });

  suite('Everything.me is hidden >', function() {

    test('Ev.me page is not loaded >', function() {
      assert.isFalse(EverythingME.displayed);
    });
  });

  suite('Everything.me will be destroyed >', function() {

    test('All e.me css/script should be deleted from the DOM >', function() {
      EverythingME.destroy();
      assert.equal(document.querySelectorAll('head > [href*="everything.me"]').
                   length, 0);
    });

  });

});
