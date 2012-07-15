(function(window) {

  /**
   * Creates an abstract store instance.
   * Every store must contain a reference
   * to the database.
   */
  function Abstract(db) {
    this.db = db;
    Calendar.Responder.call(this);
  }

  Abstract.prototype = {
    __proto__: Calendar.Responder.prototype,

    _objectData: function(data) {
      if ('toJSON' in data) {
        return data.toJSON();
      }
      return data;
    }
  };

  Calendar.ns('Store').Abstract = Abstract;

}(this));
