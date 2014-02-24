/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Use the factory to create all available widgets.
 */
(function(exports) {

  var LockScreenWidgetFactory = function() {
    this.configs.events.forEach((ename)=>{
      window.addEventListener(ename, this);
      this.configs.classes = {
        'AlternativeCamera': window.LockScreenAlternativeCamera,
        'Slide': window.LockScreenSlideWidget,
        'Bootstrap': window.LockScreenBootstrapWidget,
        'UnlockingSound': window.LockScreenUnlockingSoundWidget
      };
    });
  };
  LockScreenWidgetFactory.prototype = {
    configs: {
      events: [
        'lockscreen-launch-widget'
      ],

      // Should be a static and growing list.
      classes: {}
    }
  };

  LockScreenWidgetFactory.prototype.handleEvent =
  function lswf_handleEvent(evt) {
    if ('lockscreen-launch-widget' === evt.type) {
      var request = evt.detail.request,
        widget = this.launch(evt.detail.request);
      this.publish('lockscreen-register-widget',
        { 'name': request.name,
          'widget': widget
        });
    }
  };

  LockScreenWidgetFactory.prototype.launch =
  function lswf_launch(request) {
    if (this.configs.classes[request.name]) {
      return new this.configs.classes[request.name]();
    } else {
      throw new Error('Can\'t launch an unknown widget: ' + request.name);
    }
  };

  LockScreenWidgetFactory.prototype.publish =
  function lswf_publish(type, detail) {
    window.dispatchEvent(new CustomEvent(type, {'detail': detail}));
  };

  /** @exports LockScreenWidgetFactory */
  exports.LockScreenWidgetFactory = LockScreenWidgetFactory;
})(window);
