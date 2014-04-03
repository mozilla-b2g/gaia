'use strict';

requireApp('homescreen/test/unit/mock_evme.js');
requireApp('homescreen/everything.me/config/config.js');
requireApp('homescreen/test/unit/mock_evme_utils.js');
requireApp('homescreen/everything.me/modules/Collection/Collection.js');

suite('Collection.js >', function() {

  test('Collection displays default icon image if has no apps', function(done) {
    var settings = {
      'id': 'some id',
      'apps': [],
      'defaultIcon': 'icon content'
    };

    window.Evme.Collection.createCollectionIcon(settings, function(icon) {
      assert.isTrue(icon === settings.defaultIcon);
      done();
    });
  });

});
