/* exported Datastore */
'use strict';

(function(exports) {

  let _name = '';

  function Datastore(name) {
    _name = name;
  }

  Datastore.prototype = {
    init: () => {
      return Promise.resolve();
    },
    upgradeSchema: () => {
      return Promise.resolve();
    },
    synchronise: () => {
      return Promise.resolve();
    },
    set: (data) => {
      return Promise.resolve();
    },
    remove: (id) => {
      return Promise.resolve();
    },
    clear: () => {
      return Promise.resolve();
    },
    updateRevision: () => {
      return Promise.resolve();
    },
    onChange: () => {},
    get: (id) => {
      return Promise.resolve();
    },
    getAll: () => {
      return Promise.resolve([]);
    },

    get _name() {
      return _name;
    },
    set _name(name) {
      _name = name;
    },
    mSetup: () => {
      _name = [];
    }
  };

  exports.Datastore = Datastore;

})(window);
