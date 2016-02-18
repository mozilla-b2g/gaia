/* exported PagesMetadata */
'use strict';

(function(exports) {

  let _data = [];

  function PagesMetadata() {}

  PagesMetadata.prototype = {
    db: null,

    init: () => {
      return Promise.resolve();
    },
    upgradeSchema: () => {},
    set: data => {
      _data = data;
      return Promise.resolve();
    },
    remove: () => {
      return Promise.resolve();
    },
    getAll: () => {
      return Promise.resolve(_data);
    },

    get _data() {
      return _data;
    },
    set _data(data) {
      _data = data;
    },
    mSetup: () => {
      _data = [];
    }
  };

  exports.PagesMetadata = PagesMetadata;

})(window);
