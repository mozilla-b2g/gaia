Calendar.ns('Store').IcalComponent = (function() {

  function IcalComponent() {
    Calendar.Store.Abstract.apply(this, arguments);
  }

  IcalComponent.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    _store: 'icalComponents',

    _createModel: function(object) {
      return object;
    },

    _detectPersistType: function(object) {
      // always fire update.
      return 'update';
    },

    _parseId: function(id) {
      return id;
    }

  };

  return IcalComponent;
}());

