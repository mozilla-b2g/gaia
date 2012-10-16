IntegrationHelper.App = function(options) {
  for (var key in options) {
    this[key] = options[key];
  }
};
