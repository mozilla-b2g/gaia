/**
 * The module initializes a ListView displaying all installed layouts.
 * Implementation details please refer to {@link KeyboardAddLayoutsCore}.
 *
 * @module keyboard_add_layouts/core
 */
define(function(require) {
  'use strict';

  var ListView = require('modules/mvvm/list_view');

  /**
   * @alias module:keyboard_add_layouts/core
   * @class KeyboardAddLayoutsCore
   * @requires module:modules/settings_service
   * @requires module:modules/mvvm/list_view
   * @param {KeyboardContext} context
                              The kyboard context providing installed keyboards.
   * @param {Function} template
                       The template function used to render an installed
                       keyboard.
   * @returns {KeyboardAddLayoutsCore}
   */
  function KeyboardAddLayoutsCore(context, template) {
    this._enabled = false;
    this._listView = null;
    this._keyboardContext = context;
    this._keyboardTemplate = template;
  }

  KeyboardAddLayoutsCore.prototype = {
    /**
     * The value indicates whether the module is responding. If it is false, the
     * UI stops reflecting the updates from the keyboard context.
     *
     * @access public
     * @memberOf KeyboardAddLayoutsCore.prototype
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
      // Disable all inner list views
      this._keyboardTemplate.listViews.forEach(function(listView) {
        listView.enabled = this._enabled;
      }.bind(this));
    },

    /**
     * @access private
     * @memberOf KeyboardAddLayoutsCore.prototype
     * @param {HTMLElement} listViewRoot
     * @param {ObservableArray} keyboards
     * @param {Function} keyboardTemplate
     */
    _initInstalledLayoutListView:
      function kal_initListView(listViewRoot, keyboards, keyboardTemplate) {
        this._listView = ListView(listViewRoot, keyboards, keyboardTemplate);
    },

    /**
     * The handler is invoked when users disable the must-have input type. In
     * the handler we navigate to the dialog.
     *
     * @access private
     * @memberOf KeyboardAddLayoutsCore.prototype
     * @param {Object} layout
     * @param {String} missingType
     */
    _showEnabledDefaultDialog: function kal_showDialog(layout, missingType) {
      require(['modules/dialog_service'], function(DialogService) {
        navigator.mozL10n.formatValue('keyboardType-' + missingType).then(
          type => {
            DialogService.alert({
              id: 'defaultKeyboardEnabled',
              args: {
                layoutName: layout.inputManifest.name,
                appName: layout.manifest.name
              }
            }, {
              title: {
                id: 'mustHaveOneKeyboard',
                args: {
                  type: type
                }
              }
            });
        });
      });
    },

    /**
     * @access public
     * @memberOf KeyboardAddLayoutsCore.prototype
     * @param {Array} elements
     *                Elements needed by this module.
     * @param {HTMLElement} elements.listViewRoot
     *                      The root element for the list view displaying the
     *                      installed keyboards.
     */
    init: function kal_onInit(elements) {
      var that = this;
      this._keyboardContext.init(function() {
        that._keyboardContext.keyboards(function(keyboards) {
          that._initInstalledLayoutListView(
            elements.listViewRoot, keyboards, that._keyboardTemplate);
          that.enabled = true;
        });
      });

      this._keyboardContext.defaultKeyboardEnabled(
        this._showEnabledDefaultDialog);
    }
  };

  return function ctor_kalCore(context, template) {
    return new KeyboardAddLayoutsCore(context, template);
  };
});
