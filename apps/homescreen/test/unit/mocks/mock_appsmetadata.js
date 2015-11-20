/* exported AppsMetadata */
'use strict';

(function(exports) {

  let _data = [];

  function AppsMetadata() {
  }

  AppsMetadata.prototype = {
    db: null,

    init: () => {
      return Promise.resolve();
    },
    upgradeSchema: () => {},
    set: data=> {
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

  exports.AppsMetadata = AppsMetadata;

})(window);
