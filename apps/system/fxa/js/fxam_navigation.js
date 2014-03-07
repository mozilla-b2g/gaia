/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*
 * This code controls the navigation between modules. When tapping on
 * next/back, we load the next/previous module, loading resources and
 * updating the UI. Transitions are based on hash change.
 */

var FxaModuleNavigation = {
  stepCount: 0,
  currentModule: null,
  init: function fxam_nav_init(flow) {
    // Listen on hash changes for panel changes
    window.addEventListener(
      'hashchange',
      this.hashchangeHandler.bind(this),
      false
    );

    // Load view
    LazyLoader.load('view/view_' + flow + '.js', function loaded() {
      FxaModuleUI.setMaxSteps(View.length);
      window.location.hash = View.start.id;
    }.bind(this));
  },
  hashchangeHandler: function fxam_nav_hashchangeHandler() {
    if (!location.hash) {
      return;
    }

    var panel = document.querySelector(location.hash);
    if (!panel || !panel.classList.contains('screen')) {
      return;
    }

    if (this.backAnim) {
      this.stepCount--;
      this.loadStep(panel, true);
    } else {
      this.stepCount++;
      this.loadStep(panel);
    }
  },
  loadStep: function fxam_nav_loadStep(panel, back) {
    if (!panel) {
      return;
    }

    FxaModuleUI.loadScreen({
      panel: panel,
      count: this.stepCount,
      back: this.backAnim,
      onload: function() {
        this.currentModule = window[this.moduleById(panel.id)];
        this.currentModule.init &&
          this.currentModule.init(FxaModuleManager.paramsRetrieved);
      }.bind(this),
      onanimate: function() {
        this.backAnim = false;
        this.updatingStep = false;
      }.bind(this)
    });
  },
  back: function fxam_nav_back() {
    // Avoid multiple taps on 'back' if screen transition is not over.
    if (this.updatingStep) {
      return;
    }
    this.updatingStep = true;
    // Execute module back (if is defined)
    this.currentModule.onBack && this.currentModule.onBack();
    // Go to previous step
    this.backAnim = true;

    window.history.back();
  },
  loadNextStep: function fxam_loadNextStep(nextStep) {
    if (!nextStep || !nextStep.id) {
      return;
    }

    location.hash = nextStep.id;
  },
  next: function fxam_nav_next() {
    this.currentModule.onNext(this.loadNextStep.bind(this));
  },
  moduleById: function fxam_nav_moduleById(id) {
    var moduleKey = Object.keys(FxaModuleStates).filter(function(module) {
      return FxaModuleStates[module] &&
        FxaModuleStates[module].id &&
        FxaModuleStates[module].id === id;
    }).pop();
    if (moduleKey) {
      return FxaModuleStates[moduleKey].module;
    }
  },
  done: function fxam_nav_done() {
    this.currentModule.onDone(FxaModuleManager.done);
  }
};
