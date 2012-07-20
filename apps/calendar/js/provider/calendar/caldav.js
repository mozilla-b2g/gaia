(function(window) {

  var Abstract = Calendar.Provider.Calendar.Abstract;
  var Backend = window.Caldav;

  /**
   * Local provider - only provides
   * on device storage with no sync / remote persist options.
   */
  function Caldav(provider, options) {
    Abstract.apply(this, arguments);
  }

  /**
   * Local is the same thing as abstract
   * right now.
   */
  Caldav.prototype = {
    __proto__: Abstract.prototype,

    /**
     * Maps properties from the backend
     * to the abstraction layer.
     *
     * @param {Caldav.Resource.Calendar} cal remote cal.
     */
    mapRemoteCalendar: function(cal) {
      this._remoteCalendar = cal;

      this.id = cal.url;
      this.url = cal.url;
      this.name = cal.name;
      this.color = cal.color;
      this.description = cal.description;
      this.syncToken = cal.ctag;
    }
  };

  Calendar.ns('Provider.Calendar').Caldav = Caldav;

}(this));

