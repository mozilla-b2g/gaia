/**
 * The module initializes a ListView displaying the installed keyboards.
 * Implementation details please refer to {@link KeyboardCore}.
 *
 * @module keyboard/installed_keyboards
 */
define(function(require) {
  'use strict';

  var ListView = require('modules/mvvm/list_view');

  /**
   * @alias module:keyboard/installed_keyboards
   * @class KeyboardCore
   * @requires module:modules/mvvm/list_view
   * @param {KeyboardContext} context
                              The kyboard context providing installed keyboards.
   * @param {Function} template
                       The template function used to render an installed
                       keyboard.
   * @returns {KeyboardCore}
   */
  function KeyboardCore(context, template) {
    this._enabled = false;
    this._listView = null;
    this._keyboardContext = context;
    this._keyboardTemplate = template;
  }

  KeyboardCore.prototype = {
    /**
     * The value indicates whether the module is responding. If it is false, the
     * UI stops reflecting the updates from the keyboard context.
     *
     * @access public
     * @memberOf KeyboardCore.prototype
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
     * @memberOf KeyboardCore.prototype
     * @param {HTMLElement} listViewRoot
     * @param {ObservableArray} keyboards
     * @param {Function} keyboardTemplate
     */
    _initAllKeyboardListView:
      function k_initListView(listViewRoot, keyboards, keyboardTemplate) {
        listViewRoot.hidden = (keyboards.length === 0);
        this._listView = ListView(listViewRoot, keyboards, keyboardTemplate);
    },

    /**
     * @access public
     * @memberOf KeyboardCore.prototype
     * @param {Array} elements
     *                Elements needed by this module.
     * @param {HTMLElement} elements.listViewRoot
     *                      The root element for the list view displaying the
     *                      installed keyboards.
     */
    init: function k_init(elements) {
      var that = this;
      this._keyboardContext.init(function() {
        that._keyboardContext.keyboards(function(keyboards) {
          that._initAllKeyboardListView(
            elements.listViewRoot, keyboards, that._keyboardTemplate);
          that.enabled = true;
        });
      });
    }
  };

  return function ctor_keyboardCore(context, template) {
    return new KeyboardCore(context, template);
  };
});
