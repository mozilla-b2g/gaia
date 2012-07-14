(function(window) {

  if (typeof(Calendar) === 'undefined') {
    Calendar = {};
  }

  if (typeof(Calendar.Store) === 'undefined') {
    Calendar.Store = {};
  }

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
    __proto__: Calendar.Responder.prototype
  };

  Calendar.Store.Abstract = Abstract;

}(this));
