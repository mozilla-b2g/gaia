'use strict';
/* global Applications, AppList, WidgetEditor, LayoutEditor, WidgetFactory,
          WidgetManager */

(function(exports) {
  const VIDEO_URL = 'resources/demo.webm';
  const BOOKMARK_URL = 'style/images/static-element.jpg';

  function $(id) {
    return document.getElementById(id);
  }

  function Homescreen(options) {
    options = options || {};
    this._videoURL = options.demoVideo || VIDEO_URL;
  }

  Homescreen.prototype = {
    start: function HS_Start() {
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
      this._initLayoutEditor(widgetContainer, widgetEditorUI, layoutContainer);

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
      this._loadWidgetConfig((function(configs) {
        this._updateWidgets(configs);
        this.widgetEditor.loadWidgets(configs);
      }).bind(this));
      this._inited = true;

      // Static Elements
      this._initStaticElements(widgetContainer);
    },

    stop: function HS_Stop() {
      // Video
      $('static-video').removeEventListener('loadedmetadata', this);

      // Static Elements
      var elems = document.querySelectorAll('.static-element');
      for(var i = 0; i < elems.length; i++) {
        elems[i].removeEventListener('click', this);
        elems[i].parentNode.removeChild(elems[i]);
      }

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
            case 'static-video':
              evt.target.classList.toggle('fullscreen');
              break;
            case 'static-bookmark':
              window.open('http://www.mozilla.org', '_blank',
                          'remote=true,useAsyncPanZoom=true');
              break;
          }
          break;
        case 'loadedmetadata':
          $('static-video').currentTime = this._videoPlayedTime;
          break;
        case 'contextmenu':
          evt.preventDefault();
          break;
        case 'visibilitychange':
          this._toggleVideo();
          if (document.visibilityState === 'visible') {
            this.widgetManager.showAll();
          } else {
            this.appList.hide();
            this.widgetManager.hideAll();
          }
          break;
      }
    },

    _initLayoutEditor: function(widgetContainer, widgetEditorUI,
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
      oldCfgs.sort(comparer);

      newCfgs = newCfgs || [];
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
    },

    _createStaticElement: function HS_createStaticElement(type, rect) {
      var dom = document.createElement(type);
      dom.classList.add('static-element');
      ['left', 'top', 'width', 'height'].forEach(function(d) {
        dom.style[d] = rect[d] + 'px';
      });
      return dom;
    },

    _initStaticElements: function HS_initStaticElements(container) {
      var staticPlaces = this.layoutEditor.exportConfig().filter(function(e) {
        return e.static;
      });

      var video = this._createStaticElement('video', staticPlaces[0].rect);
      video.id = 'static-video';
      video.mozAudioChannelType = 'content';
      video.loop = true;
      video.controls = false;
      video.addEventListener('click', this);
      video.addEventListener('loadedmetadata', this);
      container.appendChild(video);
      this._videoPlayedTime = 0;
      this._toggleVideo();

      var dom = this._createStaticElement('div', staticPlaces[1].rect);
      dom.id = 'static-bookmark';
      dom.style.backgroundImage = 'url(' + BOOKMARK_URL + ')';
      dom.addEventListener('click', this);
      container.appendChild(dom);
    },

    _toggleVideo: function HS_toggleVideo() {
      var video = $('static-video');
      if (!video || !this._videoURL) {
        return;
      }

      if (document.visibilityState === 'visible') {
        video.src = this._videoURL;
        video.play();
      } else {
        this._videoPlayedTime = video.readyState ? video.currentTime : 0;
        video.pause();

        // To release the video channel
        video.removeAttribute('src');
        video.load();
      }
    }
  };

  exports.Homescreen = Homescreen;
})(window);
