/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Use this factory to create all available widgets.
 * To create a new widget, please don't forget to add it in this class.
 * The widget constructor should be listed in factory#configs#classes.
 */
(function(exports) {

  /**
   * This factory should contain all widgets that would be instantiated.
   * If any new widget got added, this function should be renewed with it.
   * Note that the widget name is the unique name of the widget, which should
   * be a member of the widget itself. On the other hand, the class is the
   * constructor function, which may be global functions.
   *
   * @param {LockScreenMediator} mediator
   * @constructor LockScreenWidgetFactory
   */
  var LockScreenWidgetFactory = function(mediator) {
    this.setup();

    this.configs.classes = {
      'AlternativeCamera': window.LockScreenAlternativeCamera,
      'Slide': window.LockScreenSlideWidget,
      'UnlockingSound': window.LockScreenUnlockingSoundWidget
    };
    this.mediator = mediator;
  };

  /**
   * Set up the prototype of this instance.
   *
   * @this {LockScreenWidgetFactory}
   * @member LockScreenWidgetFactory
   */
  LockScreenWidgetFactory.prototype.setup = function() {
    this.configs = {
      // Should be a static and growing list.
      classes: {}
    };
    this.mediator = null;
  };

  /**
   * To create a new widget instance according to the widget name.
   *
   * @param {string} name - the widget name
   * @this {LockScreenWidgetFactory}
   * @memberof LockScreenWidgetFactory
   */
  LockScreenWidgetFactory.prototype.launch =
  function lswf_launch(name) {
    if (this.configs.classes[name]) {
      return new this.configs.classes[name](this.mediator);
    } else {
      throw new Error('Can\'t launch an unknown widget: ' + name);
    }
  };

  /** @exports LockScreenWidgetFactory */
  exports.LockScreenWidgetFactory = LockScreenWidgetFactory;
})(window);
