(function() {

  var eventHelper = {
    setProviderCaps: function(provider, override) {
      var values = {};
      var primaryValues =
        Calendar.Provider.Abstract.prototype
          .calendarCapabilities.call(provider);

      [primaryValues, override].forEach(function(caps) {
        for (var key in caps) {
          values[key] = caps[key];
        }
      });

      provider.caps = values;
    }
  };

  window.eventHelper = eventHelper;
}());
