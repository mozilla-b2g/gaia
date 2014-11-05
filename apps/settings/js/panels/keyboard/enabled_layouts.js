/**
 * The module initializes a ListView displaying all enabled layouts.
 * Implementation details please refer to {@link KeyboardEnabledLayoutsCore}.
 *
 * @module keyboard/enabled_layouts
 */
define(function(require) {
  'use strict';

  var ListView = require('modules/mvvm/list_view');

  /**
   * @alias module:keyboard/enabled_layouts
   * @class KeyboardEnabledLayoutsCore
   * @requires module:modules/mvvm/list_view
   * @param {KeyboardContext} context
                              The kyboard context providing enabled layouts.
   * @param {Function} template
                       The template function used to render a layout.
   * @returns {KeyboardEnabledLayoutsCore}
   */
  function KeyboardEnabledLayoutsCore(context, template) {
    this._enabled = false;
    this._listView = null;
    this._keyboardContext = context;
    this._layoutTemplate = template;
  }

  KeyboardEnabledLayoutsCore.prototype = {
    /**
     * The value indicates whether the module is responding. If it is false, the
     * UI stops reflecting the updates from the keyboard context.
     *
     * @access public
     * @memberOf KeyboardEnabledLayoutsCore.prototype
     * @type {Boolean}
     */
    get enabled() {
      return this._enabled;
    },

    set enabled(value) {
      this._enabled = value;
      if (this._listView) {
        this._listView.enabled = this._enabled;
      }
    },

    /**
     * @access private
     * @memberOf KeyboardAddLayoutsCore.prototype
     * @param {HTMLElement} listViewRoot
     * @param {ObservableArray} layouts
     * @param {Function} layoutTemplate
     */
    _initEnabledLayoutListView:
      function kepl_initListView(listViewRoot, layouts, layoutTemplate) {
      this._listView = ListView(listViewRoot, layouts, layoutTemplate);
    },

    /**
     * @access public
     * @memberOf KeyboardEnabledLayoutsCore.prototype
     * @param {Array} elements
     *                Elements needed by this module.
     * @param {HTMLElement} elements.listViewRoot
     *                      The root element for the list view displaying the
     *                      installed keyboards.
     */
    init: function kepl_onInit(elements) {
      var that = this;
      this._keyboardContext.init(function() {
        that._keyboardContext.enabledLayouts(function(layouts) {
          that._initEnabledLayoutListView(
            elements.listViewRoot, layouts, that._layoutTemplate);
          that.enabled = true;
        });
      });
    }
  };

  return function ctor_keplCore(context, template) {
    return new KeyboardEnabledLayoutsCore(context, template);
  };
});
