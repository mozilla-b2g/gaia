'use strict';

define(function(require, exports) {
  return [
    // Hack to get separate modules for search vs non-search, but eventually the
    // search branches in message_list should be moved here.
    require('./message_list'),
    {
      mode: 'search'
    }
  ];
});
