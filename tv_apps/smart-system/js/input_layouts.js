/* global KeyboardHelper */

'use strict';

(function(exports) {

  /**
   * InputLayouts is responsible for processing and bookkeeping layouts returned
   * from KeyboardHelper for use by KeyboardManager.
   */
  var InputLayouts = function(keyboardManager, TYPE_GROUP_MAPPING) {
    this._keyboardManager = keyboardManager;

    // a mapping table from a group to an array of types mapped to the group.
    // i.e. the reverse mapping of TYPE_GROUP_MAPPING
    this._groupToTypeTable = {};

    /**
     *
     * The set of installed keyboard layouts grouped by type_group
     *                                                  (as in KeyboardManager)
     * This is a map from type_group to an object arrays.
     *
     * i.e:
     * {
     *   text: [ {...}, {...} ],
     *   number: [ {...}, {...} ]
     * }
     *
     * Each element in the arrays represents a keyboard layout:
     * {
     *    id: the unique id of the keyboard, the key of inputs
     *    name: the keyboard layout's name
     *    appName: the keyboard app name
     *    manifestURL: the keyboard's manifestURL
     *    path: the keyboard's launch path
     * }
     * Additionally, each array has an |activeLayout|, which is the index, in
     * that array, of the the currently-activated layout of the group.
     */
    this.layouts = {};

    /*
     * This is the reverse mapping from layout (manifestURL+id) to
     * an array of {group: , index: }, indicating the groups that are supported
     * by the layout.
     * |index| is the index of the layout in the |group| in |this.layouts|.
     */
    this._layoutToGroupMapping = {};

    // A Set() of enabled KB apps
    this._enabledApps = null;

    Object.keys(TYPE_GROUP_MAPPING).forEach(function(type) {
      var group = TYPE_GROUP_MAPPING[type];
      this._groupToTypeTable[group] = this._groupToTypeTable[group] || [];
      this._groupToTypeTable[group].push(type);
    }, this);
  };

  InputLayouts.prototype.start = function il_start() {

  };

  InputLayouts.prototype.stop = function il_stop() {

  };

  InputLayouts.prototype._transformLayout =
    function il_transformLayout(layout) {
    var transformedLayout = {
      id: layout.layoutId,
      origin: layout.app.origin,
      manifestURL: layout.app.manifestURL,
      path: layout.inputManifest.launch_path
    };

    // tiny helper - bound to the manifests
    var getName = function () {
      return this.name;
    };

    // define properties for name that resolve at display time
    // to the correct language via the ManifestHelper
    Object.defineProperties(transformedLayout, {
      name: {
        get: getName.bind(layout.inputManifest),
        enumerable: true
      },
      appName: {
        get: getName.bind(layout.manifest),
        enumerable: true
      }
    });

    return transformedLayout;
  };

  InputLayouts.prototype._insertLayouts =
    function il_insertLayouts(appLayouts) {

    appLayouts.forEach(function (layout) {
      this._enabledApps.add(layout.app.manifestURL);

      layout.inputManifest.types.filter(KeyboardHelper.isKeyboardType)
        .forEach(function(group) {
          this.layouts[group] = this.layouts[group] || [];
          this.layouts[group].push(this._transformLayout(layout));
        }, this);
    }, this);
  };

  InputLayouts.prototype._insertFallbackLayouts =
    function il_insertFallbackLayouts() {
    // bug 1035117:
    // at this moment, if the 'fallback' groups (managed by KeyboardHelper)
    // doesn't have any layouts, inject the fallback layout into it.
    // (for example, user enables only CJKV IMEs, and for 'password'
    //  we need to enable 'en')
    Object.keys(KeyboardHelper.fallbackLayouts).filter(
      // linter fails if I use "group" instead of "grp" here
      grp => !(grp in this.layouts)
    ).forEach(function (group) {
      var layout = KeyboardHelper.fallbackLayouts[group];

      this._enabledApps.add(layout.app.manifestURL);

      this.layouts[group] = [this._transformLayout(layout)];
    }, this);
  };

  InputLayouts.prototype._emitLayoutsCount = function il_emitLayoutsCount() {
    // Let chrome know about how many keyboards we have
    // need to expose all input type from groupToTypeTable
    var countLayouts = {};
    Object.keys(this.layouts).forEach(function(group) {
      var types = this._groupToTypeTable[group];

      types.forEach(function(type) {
        countLayouts[type] = this.layouts[group].length;
      }, this);
    }, this);

    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, {
      type: 'inputmethod-update-layouts',
      layouts: countLayouts
    });
    window.dispatchEvent(event);
  };

  InputLayouts.prototype._generateToGroupMapping =
    function il_generateToGroupMapping() {
    Object.keys(this.layouts).forEach( group => {
      this.layouts[group].forEach((layout, index) => {
        var key = layout.manifestURL + '/' + layout.id;
        this._layoutToGroupMapping[key] = this._layoutToGroupMapping[key] || [];
        this._layoutToGroupMapping[key].push({
          group: group,
          index: index
        });
      });
    });
  };

  InputLayouts.prototype.setGroupsActiveLayout =
    function il_setGroupsActiveLayout(layout) {
    this._layoutToGroupMapping[layout.manifestURL + '/' + layout.id].forEach(
      groupInfo => {
        this.layouts[groupInfo.group].activeLayout = groupInfo.index;
      });
  };

  InputLayouts.prototype.processLayouts =
    function il_processLayouts(appLayouts) {
    this.layouts = {};
    this._enabledApps = Set();

    this._insertLayouts(appLayouts);
    this._insertFallbackLayouts();

    this._generateToGroupMapping();

    // some initialization
    for (var group in this.layouts) {
      this.layouts[group].activeLayout = 0;
    }

    this._emitLayoutsCount();

    return this._enabledApps;
  };

  exports.InputLayouts = InputLayouts;

})(window);
