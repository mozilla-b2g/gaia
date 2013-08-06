'use strict';

requireApp('homescreen/test/unit/mock_xmlhttprequest.js');
requireApp('homescreen/test/unit/mock_homescreen.js');

// Unit tests for configurator library
requireApp('homescreen/js/configurator.js');

var mocksHelperForConfigurator = new MocksHelper([
  'XMLHttpRequest',
  'Homescreen'
]);

mocksHelperForConfigurator.init();

suite('configurator.js >', function() {

  var mocksHelper = mocksHelperForConfigurator;
  var containerNode;

  suiteSetup(function() {
    mocksHelper.suiteSetup();
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
  });

  setup(function() {
    mocksHelper.setup();

    containerNode = document.createElement('div');
    containerNode.innerHTML = '<div role="search-page"></div>';
    document.body.appendChild(containerNode);

    Configurator.load();

    // We set up a wrong landing page index in order to check what its value
    // will be 0 or 1 depending on different situations dealt by this suite
    Homescreen.landingPage = -1;
  });

  teardown(function() {
    mocksHelper.teardown();
    document.body.removeChild(containerNode);
  });

  function sendResponseText(text) {
    MockXMLHttpRequest.mSendOnLoad({
      responseText: text
    });
  }

  function assertHomescreen(number) {
    assert.equal(Homescreen.landingPage, number);
    assert.equal(document.querySelectorAll('div[role="search-page"]').length,
                 number);
  }

  /*
   * It tests the public method "getSection" getting properties/values
   */
  test('Sections >', function() {
    sendResponseText('{ "search_page":{ "provider": "em","enabled": false },' +
                      '"tap_threshold": 10,' +
                      '"swipe": { "threshold": 0.4, "friction": 0.1,' +
                                 '"transition_duration": 300 } }');

    // These sections should be available
    var searchPage = Configurator.getSection('search_page');
    assert.equal(searchPage.provider, 'em');
    assert.isFalse(searchPage.enabled);
    assert.equal(Object.keys(searchPage).length, 2);

    var tapThreshold = Configurator.getSection('tap_threshold');
    assert.equal(tapThreshold, 10);

    var swipe = Configurator.getSection('swipe');
    assert.equal(swipe.threshold, 0.4);
    assert.equal(swipe.friction, 0.1);
    assert.equal(swipe.transition_duration, 300);

    // This section should be undefined
    assert.isUndefined(Configurator.getSection('petecan'));
  });

  /*
   * It checks the conditions when there is NOT a search provider
   */
  test('Search provider disabled >', function() {
    sendResponseText('{ "search_page":{ "provider": "xx","enabled": false } }');
    assertHomescreen(0);
  });

  /*
   * It checks what happens when there is an error parsing the configuration
   */
  test('Error parsing configuration >', function() {
    sendResponseText('{ merengue {');
    assertHomescreen(0);
  });

  /*
   * It checks what happens when there is an error loading the configuration
   */
  test('Error loading configuration >', function() {
    MockXMLHttpRequest.mSendError();
    assertHomescreen(0);
  });

});
