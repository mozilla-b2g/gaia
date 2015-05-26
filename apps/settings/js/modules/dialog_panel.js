define(function(require) {
  'use strict';

  var Panel = require('modules/panel');

  var DialogPanel = function ctor_dialogPanel(panelOptions) {
    var panel = Panel(panelOptions);

    var _emptyFunc = function() {};
    var submitFunction = _emptyFunc;
    var cancelFunction = _emptyFunc;

    // Because we need to bridge onWrapSubmit & onWrapCancel with panelOptions
    // together, we have to override panel.init() to make sure we can access
    // these API here.
    //
    // When init() is called, we will automatically make submitFunction &
    // cancelFunction's reference work and link to onWrapSubmit & onWrapCancel,
    // in this way, we can call `this.submit()` & `this.cancel()` in
    // panelOptions.
    var originalInit = panel.init;
    panel.init = function(panel, userOptions) {
      submitFunction = userOptions.onWrapSubmit.bind(userOptions);
      cancelFunction = userOptions.onWrapCancel.bind(userOptions);
      return originalInit.apply(panel, arguments);
    };

    // We have to extend two more functions for it
    panel.onSubmit = panelOptions.onSubmit || _emptyFunc;
    panel.onCancel = panelOptions.onCancel || _emptyFunc;

    // Let's rebind the scope on options
    panel.onSubmit = panel.onSubmit.bind(panelOptions);
    panel.onCancel = panel.onCancel.bind(panelOptions);

    // Callee can use `this.submit()` to programmatically submit()
    // this dialog.
    panelOptions.submit = function() {
      submitFunction();
    };

    // Callee can use `this.cancel()` to programmatically cancel()
    // this dialog.
    panelOptions.cancel = function() {
      cancelFunction();
    };

    return panel;
  };

  return DialogPanel;
});
