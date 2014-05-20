'use strict';
/* global Applications, AppList, WidgetEditor, LayoutEditor */

(function(exports) {
  function $(id) {
    return document.getElementById(id);
  }

  function Homescreen() {
  }

  Homescreen.prototype = {
    init: function HS_Init() {
      var widgetContainer = $('widget-container');
      var widgetEditorUI = $('widget-editor');
      var layoutContainer = $('layout-container');
      // Global
      document.addEventListener('contextmenu', this);
      document.addEventListener('visibilitychange', this);

      // Applications
      Applications.init();

      // Widget lifecycle management
      window.widgetFactory = new WidgetFactory();
      window.widgetManager = new WidgetManager().start();

      // App List
      this.appList = new AppList({
        appList: $('app-list'),
        container: $('app-list-container'),
        pageIndicator: $('app-list-page-indicator')
      });
      this.appList.init();

      // Layout Editor
      this.initLayoutEditor(widgetContainer, widgetEditorUI, layoutContainer);

      // Widget Editor
      this.widgetEditor = new WidgetEditor();
      this.widgetEditor.start(widgetEditorUI,
                              layoutContainer,
                              this.appList,
                              this.layoutEditor);

      // Event listeners for buttons
      $('app-list-open-button').addEventListener('click', this);
      $('app-list-close-button').addEventListener('click', this);
      $('widget-editor-open-button').addEventListener('click', this);
      $('widget-editor-close-button').addEventListener('click', this);

      this._loadWidgetConfig((function(configs) {
        this.widgetEditor.loadWidgets(configs);
      }).bind(this));
    },

    initLayoutEditor: function(widgetContainer, widgetEditorUI,
                               layoutContainer) {

      this.layoutEditor = new LayoutEditor();
      // make widget-editor visible temporarily to let layoutEditor calculate
      // its size.
      widgetEditorUI.hidden = false;
      this.layoutEditor.init(layoutContainer,
                        {
                          // tell layout editor the offset info
                          top: widgetContainer.offsetTop,
                          left: widgetContainer.offsetLeft,
                          // tell layout editor the target width/height
                          width: widgetContainer.clientWidth,
                          height: widgetContainer.clientHeight,
                        });

      widgetEditorUI.hidden = true;
    },

    uninit: function HS_Uninit() {
      // Event listeners for buttons
      $('app-list-close-button').removeEventListener('click', this);
      $('app-list-open-button').removeEventListener('click', this);
      $('widget-editor-open-button').removeEventListener('click', this);
      $('widget-editor-close-button').removeEventListener('click', this);
      // App List
      this.appList.uninit();
      this.appList = null;

      // Widget Editor
      this.widgetEditor.stop();
      this.widgetEditor = null;

      // Applications
      Applications.uninit();

      // Global
      document.removeEventListener('contextmenu', this);
      document.removeEventListener('visibilitychange', this);
    },

    handleEvent: function HS_HandleEvent(evt) {
      switch(evt.type) {
        case 'click':
          switch (evt.target.id) {
            case 'app-list-open-button':
              this.appList.show();
              break;
            case 'app-list-close-button':
              this.appList.hide();
              break;
            case 'widget-editor-open-button':
              this.widgetEditor.show();
              break;
            case 'widget-editor-close-button':
              this.widgetEditor.hide();
              this._saveWidgetConfig(this.layoutEditor.exportConfig());
              break;
          }
          break;
        case 'contextmenu':
          evt.preventDefault();
          break;
        case 'visibilitychange':
          if (document.visibilityState === 'visible') {
            this.appList.hide();
          }
          break;
      }
    },

    _saveWidgetConfig: function HS_saveWidgetConfig(configs) {
      var forSave = [];
      configs.forEach(function(config) {
        config.static || forSave.push(config);
      });
      window.asyncStorage.setItem('widget-configs', forSave);
    },

    _loadWidgetConfig: function HS_loadWidgetConfig(callback) {
      window.asyncStorage.getItem('widget-configs', callback);
    }
  };

  exports.Homescreen = Homescreen;
})(window);
