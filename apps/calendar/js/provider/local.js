  Calendar.ns('Provider').Local = (function() {

  const LOCAL_CALENDAR_ID = 'local-first';

  function Local() {
    Calendar.Provider.Abstract.apply(this, arguments);
  }

  Local.prototype = {
    __proto__: Calendar.Provider.Abstract.prototype,

    getAccount: function(account, callback) {
      callback(null, {});
    },

    findCalendars: function(account, callback) {
      //XXX: Make async
      var l10nId = 'calendar-local';
      var list = {};
      var name;

      if ('mozL10n' in window.navigator) {
        name = window.navigator.mozL10n.get(l10nId);
        if (name === l10nId) {
          name = null;
        }
      }

      if (!name) {
        name = 'Offline Calendar';
      }

      var cal = {
        // XXX localize this name somewhere
        name: name,
        id: LOCAL_CALENDAR_ID
      };

      list[LOCAL_CALENDAR_ID] = cal;
      callback(null, list);
    }

  };

  return Local;

}());
