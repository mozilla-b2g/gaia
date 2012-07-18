(function(window) {

  function Settings(options) {
    Calendar.View.apply(this, arguments);
  }

  Settings.prototype = {
    __proto__: Object.create(Calendar.View.prototype),

    selectors: {
      element: '#settings'
    }

  };

  Calendar.ns('Views').Settings = Settings;

}(this));
