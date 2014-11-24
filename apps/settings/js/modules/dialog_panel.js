define(function(require) {
  'use strict';

  var Panel = require('modules/panel');

  var DialogPanel = function ctor_dialogPanel(options) {
    var _emptyFunc = function() {};
    var panel = Panel(options);

    // We have to extend two more functions for it
    panel.onSubmit = options.onSubmit || _emptyFunc;
    panel.onCancel = options.onCancel || _emptyFunc;
    return panel;
  };

  return DialogPanel;
});
