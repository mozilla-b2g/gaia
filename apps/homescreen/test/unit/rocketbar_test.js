'use strict';

requireApp('homescreen/shared/js/async_storage.js');
requireApp('homescreen/shared/js/opensearch.js');
requireApp('homescreen/js/grid.js');
requireApp('homescreen/test/unit/mock_apps_mgmt.js');
requireApp('homescreen/js/rocketbar.js');

suite('rocketbar.js >', function() {

  var mockPlugin = {
    shortname: 'gaia'
  };

  var realMozApps;

  teardown(function() {
    var el = document.getElementById('test');
    el.parentNode.removeChild(el);
    window.navigator.mozApps = realMozApps;
  });

  setup(function() {
    var div = document.createElement('div');
    div.id = 'test';
    div.innerHTML = [
      '<div id="rocketbar-activation-icon"></div>',
      '<section id="rocketbar-overlay">',
        '<input id="rocketbar-input" type="text">',
        '<ul id="rocketbar-search-results"></ul>',
      '</section>'
    ].join('');

    document.body.appendChild(div);

    realMozApps = window.navigator.mozApps;
    window.navigator.mozApps = {
      mgmt: MockAppsMgmt
    };

    Rocketbar.init();
  });

  test('visualSearchResults > default icon >', function() {
    Rocketbar.visualSearchResults([
      {
        title: 'Omg Result',
        uri: 'http://mozilla.org'
      }
    ], mockPlugin);

    assert.equal(
      Rocketbar.DOM.searchResults.getElementsByTagName('img')[0].src,
      'http://homescreen.gaiamobile.org:8080/style/images/default.png'
    );
  });

  test('visualSearchResults > specified icon >', function() {
    var mockResult = {
      title: 'Omg Result',
      uri: 'http://mozilla.org',
      icon: 'http://mozilla.org/icon.png'
    };

    Rocketbar.visualSearchResults([mockResult], mockPlugin);

    assert.equal(
      Rocketbar.DOM.searchResults.getElementsByTagName('img')[1].src,
      mockResult.icon
    );
  });

  test('inputKeyUp > app search results >', function() {
    // Stubbed manifests
    Rocketbar.installedApps = {
      'http://something.org': {
        manifest: {
          name: 'I Like Cats'
        }
      },
      'http://mozilla.org': {
        manifest: {
          name: 'I Like Cats and dogs'
        }
      }
    };

    var apps = Rocketbar.searchApps('cat');
    assert.equal(apps.length, 2);

    apps = Rocketbar.searchApps('dog');
    assert.equal(apps.length, 1);
  });

this.DOM.searchResults.innerHTML = '';

});
