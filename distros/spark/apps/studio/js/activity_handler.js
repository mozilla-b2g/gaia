/*global
  AutoTheme,
  Main
 */
'use strict';

(function(exports) {
  if (!window.navigator.mozSetMessageHandler) {
    return;
  }

  const ActivityDataType = {
    IMAGE: 'image/*'
  };

  var ActivityHandler = {
    onShareActivity(activity) {
      var activityData = activity.source.data;

      if (activityData.type !== ActivityDataType.IMAGE) {
        return;
      }

      if (!activityData.blobs.length) {
        return;
      }

      var image = activityData.blobs[0];
      Navigation.popToRoot().then(() => {
        Main.createTheme();
        AutoTheme.load(image);
      });
    }
  };

  window.navigator.mozSetMessageHandler(
    'activity', ActivityHandler.onShareActivity.bind(ActivityHandler)
  );

})(window);
