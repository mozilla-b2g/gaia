'use strict';

requireApp('homescreen/test/unit/mock_everything.me.html.js');
requireApp('homescreen/everything.me/js/everything.me.js');

suite('everything.me.js >', function() {

  var wrapperNode, page, footer, loadingOverlay;

  suiteSetup(function() {
    wrapperNode = document.createElement('section');
    wrapperNode.innerHTML = MockEverythingMeHtml;
    document.body.appendChild(wrapperNode);
    page = document.getElementById('evmePage');
    footer = document.querySelector('#footer');
    loadingOverlay = document.querySelector('#loading-overlay > section');
    EverythingME.init();
  });

  suiteTeardown(function() {
    document.body.removeChild(wrapperNode);
    page = footer = null;
  });

  suite('Everything.me is initialized correctly >', function() {

    test('Loading overlay is hidden >', function() {
      assert.notEqual(loadingOverlay.style.visibility, 'visible');
    });

    test('Ev.me page is not loaded >', function() {
      assert.isFalse(EverythingME.displayed);
    });

    test('PageHideBySwipe is initialized to false >', function() {
      assert.isFalse(EverythingME.pageHideBySwipe);
    });

  });

  suite('Everything.me is displayed >', function() {

    suiteSetup(function() {
      page.dispatchEvent(new CustomEvent('gridpageshowend'));
    });

    test('Loading overlay is being displayed >', function() {
      assert.equal(loadingOverlay.style.visibility, 'visible');
    });

    test('Ev.me page is loaded >', function() {
      assert.isTrue(EverythingME.displayed);
    });

    test('Footer is translated to bottom >', function() {
      assert.equal(footer.style.MozTransform, 'translateY(100%)');
    });

  });

  suite('Everything.me is hidden >', function() {

    suiteSetup(function() {
      page.dispatchEvent(new CustomEvent('gridpagehideend'));
    });

    test('Ev.me page is not loaded >', function() {
      assert.isFalse(EverythingME.displayed);
    });

    test('Footer is visible again >', function() {
      assert.equal(footer.style.MozTransform, 'translateY(0px)');
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
