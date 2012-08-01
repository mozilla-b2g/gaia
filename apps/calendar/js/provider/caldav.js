Calendar.ns('Provider').Caldav = (function() {

  function CaldavProvider() {
    Calendar.Provider.Abstract.apply(this, arguments);

    this.service = this.app.serviceController;
  }

  CaldavProvider.prototype = {
    __proto__: Calendar.Provider.Abstract.prototype,
    role: 'caldav',
    useUrl: true,
    useCredentials: true,

    getAccount: function(account, callback) {
      this.service.request('caldav', 'getAccount', account, callback);
    },

    findCalendars: function(account, callback) {
      this.service.request('caldav', 'findCalendars', account, callback);
    }

  };

  return CaldavProvider;

}());
