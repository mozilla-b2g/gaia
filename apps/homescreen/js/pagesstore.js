/* global Datastore */
'use strict';

(function(exports) {
  function PagesStore(name) {
    this.name = name;
  }

  PagesStore.prototype = Object.create(Datastore.prototype);

  PagesStore.prototype.DB_VERSION = 1;

  PagesStore.prototype.set = function(data) {
    data.id = data.url;
    return Datastore.prototype.set.call(this, data);
  };

  PagesStore.prototype.getAll = function() {
    var filter = (value) => value.data && value.data.pinned;
    return Datastore.prototype.getAll.call(this, filter);
  };

  exports.PagesStore = PagesStore;

}(window));
