'use strict';

var ActivityHandler = (function Handler() {
  var _currentActivity = null;
  var _image = null;

  var handleActivity = function handleActivity(activity) {
    this._currentActivity = activity;

    if (!activity.source.data.blobs ||
      activity.source.data.blobs.length == 0) {
      this.postCancel();
      return;
    }

    this._image = activity.source.data.blobs[0];
    var event = new CustomEvent('onImageReceived', {
      detail: {
        data: this._image
      }
    });

    document.dispatchEvent(event);
  };

  var postCancel = function postCancel() {
    this._currentActivity.postError('canceled');
    this._currentActivity = null;
  };

  var postSuccess = function postSuccess() {
    this._currentActivity.postResult({result: 'ok'});
    this._currentActivity = null;
  };

  var getImage = function getImage() {
    return this._image;
  };

  return {
    'handleActivity': handleActivity,
    'getImage': getImage,
    'postCancel': postCancel,
    'postSuccess': postSuccess
  };
})();

window.navigator.mozSetMessageHandler('activity',
  ActivityHandler.handleActivity.bind(ActivityHandler));
