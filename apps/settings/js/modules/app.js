define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');

  var App = Module.create(function App(app) {
    this.super(Observable).call(this);
    this._app = app;
    this._enabled = app.enabled;
  }).extend(Observable);

  Observable.defineObservableProperty(App.prototype, 'enabled', {
    readonly: true
  });

  Object.defineProperty(App.prototype, 'instance', {
    enumerable: true,
    get: function() {
      return this._app;
    }
  });

  return App;
});