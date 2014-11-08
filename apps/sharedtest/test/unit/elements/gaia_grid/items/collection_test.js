'use strict';
/* global GaiaGrid */

require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/script.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/collection.js');

suite('GridItem', function() {

  test('collection with nonTranslatable set', function() {
    var subject = new GaiaGrid.Collection({
      name: 'my name',
      categoryId: 1,
      nonTranslatable: true
    });
    assert.ok(subject.detail.nonTranslatable);
    assert.equal(subject.name, 'my name');
  });

});
