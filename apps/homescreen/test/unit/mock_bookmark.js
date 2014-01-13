/* global MockGridItemsFactory */
/* exported MockBookmark */
'use strict';

require('/test/unit/mock_grid_components.js');

/* This needs the real grid_components.js too
 * This is not worth making a mock of GridItem right now */

require('/js/grid_components.js');

function MockBookmark(params) {
  GridItem.call(this, params);

  this.type = MockGridItemsFactory.TYPE.BOOKMARK;
}

MockBookmark.prototype = {
  __proto__: GridItem.prototype,

  launch: function mb_launch() {}
};
