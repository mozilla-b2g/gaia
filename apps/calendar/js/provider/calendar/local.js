(function(window) {

  var Abstract = Calendar.Provider.Calendar.Abstract;

  /**
   * Local provider - only provides
   * on device storage with no sync / remote persist options.
   */
  function Local(provider, options) {
    Abstract.apply(this, arguments);
  }

  /**
   * Local is the same thing as abstract
   * right now.
   */
  Local.prototype = {
    __proto__: Abstract.prototype,
    _calendarType: 'Local'
  };

  Calendar.ns('Provider.Calendar').Local = Local;

}(this));
