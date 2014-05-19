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
      this.widgetFactory = new WidgetFactory();
      this.widgetManager = new WidgetManager().start();

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

      // init widget map and load widget
      this.currentWidgetList = [];
      this._loadWidgetConfig(function(configs) {
        this._updateWidgets(configs);
        this.widgetEditor.loadWidgets(configs);
      });
      this._inited = true;
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
                          top: 0,
                          left: 0,
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
      var savedConfigs;
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
              if (this._inited) {
                savedConfigs = this._saveWidgetConfig(
                                              this.layoutEditor.exportConfig());
                this._updateWidgets(savedConfigs);
              }
              break;
          }
          break;
        case 'contextmenu':
          evt.preventDefault();
          break;
        case 'visibilitychange':
          if (document.visibilityState === 'visible') {
            this.appList.hide();
            this.widgetManager.showAll();
          } else {
            this.widgetManager.hideAll();
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
      return forSave;
    },

    _loadWidgetConfig: function HS_loadWidgetConfig(callback) {
      window.asyncStorage.getItem('widget-configs', callback);
    },

    _updateWidgets: function HS_updateWidgets(newCfgs) {

      function comparer(a, b) {
        return a.positionId - b.positionId;
      }

      var oldCfgs = this.currentWidgetList;
      var newCfgs = newCfgs || [];
      oldCfgs.sort(comparer);
      newCfgs.sort(comparer);

      var oldIdx = 0;
      var newIdx = 0;

      // to iterate all oldCfg + newCfg.
      while (oldIdx < oldCfgs.length || newIdx < newCfgs.length) {
        if (oldIdx < oldCfgs.length && newIdx === newCfgs.length) {
          // no more newCfgs, all oldCfgs should be removed
          this.widgetManager.remove(oldCfgs[oldIdx].widget.instanceID);
          oldIdx++;
        } else if (oldIdx === oldCfgs.length && newIdx < newCfgs.length) {
          // no more oldCfgs, all newCfgs should be added
          newCfgs[newIdx].widget = this.widgetFactory.createWidget(
                                                               newCfgs[newIdx]);
          newIdx++;
        } else if (oldCfgs[oldIdx].positionId < newCfgs[newIdx].positionId) {
          // oldCfgs[oldIdx] should be removed
          this.widgetManager.remove(oldCfgs[oldIdx].widget.instanceID);
          oldIdx++;
        } else if (oldCfgs[oldIdx].positionId === newCfgs[newIdx].positionId) {
          var oldApp = oldCfgs[oldIdx].app;
          var newApp = newCfgs[newIdx].app;
          // index the same compare manifestURL and entryPoint
          if (oldApp.manifestURL !== newApp.manifestURL ||
              oldApp.entryPoint !== newApp.entryPoint) {
            this.widgetManager.remove(oldCfgs[oldIdx].widget.instanceID);
            newCfgs[newIdx].widget = this.widgetFactory.createWidget(
                                                               newCfgs[newIdx]);
          } else {
            newCfgs[newIdx] = oldCfgs[oldIdx];
          }
          oldIdx++;
          newIdx++;
        } else if (oldCfgs[oldIdx].positionId > newCfgs[newIdx].positionId) {
          // newCfgs[newIdx] should be added.
          newCfgs[newIdx].widget = this.widgetFactory.createWidget(
                                                               newCfgs[newIdx]);
          newIdx++;
        }
      }
      // save newCfgs as our widget list.
      this.currentWidgetList = newCfgs;
    }
  };

  exports.Homescreen = Homescreen;
})(window);
