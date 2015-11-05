suite('Addons List >', function() {
  'use strict';

  var addonsList;

  suiteSetup(function(done) {
    var map = {
      '*': {
        'modules/settings_service': 'unit/mock_settings_service',
        'modules/mvvm/list_view': 'unit/mock_list_view'
      }
    };

    var modules = [
      'panels/addons/addons_list',
      'MockAddonManager'
    ];

    define('MockAddonManager', function() {
      return {
        addons: {
          addEventListener: function() {},
          array: []
        }
      };
    });

    testRequire(modules, map, function(AddonsList, MockAddonManager) {
      addonsList = AddonsList(document.body, MockAddonManager);
      done();
    });
  });

  suite('_sortByName >', function() {
    test('addons should be in alphabetical order (case insensitive)',
      function() {
        var addons = [
          { _app: { manifest: { name: 'second' } } },
          { _app: { manifest: { name: 'X Last' } } },
          { _app: { manifest: { name: 'Third' } } },
          { _app: { manifest: { name: '1st' } } },
        ];
        var sortedAddons = [
          { _app: { manifest: { name: '1st' } } },
          { _app: { manifest: { name: 'second' } } },
          { _app: { manifest: { name: 'Third' } } },
          { _app: { manifest: { name: 'X Last' } } }
        ];

        assert.deepEqual(
          addonsList._sortByName(addons),
          sortedAddons,
          'addons should be in the right order'
        );
      }
    );
  });
});
