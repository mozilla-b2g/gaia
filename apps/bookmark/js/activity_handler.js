'use strict';

/* global utils, BookmarkEditor */
var ActivityHandler = {
  'save-bookmark': function ah_save(activity) {
    BookmarkEditor.init({
      data: activity.source.data,
      onsaved: function onsaved(saved) {
        window.addEventListener('status-hidden', function hidden() {
          window.removeEventListener('status-hidden', hidden);
          activity.postResult(saved ? 'saved' : 'updated');
        });

        utils.status.show(
          navigator.mozL10n.get('pinned-to-home-screen-message'));
      },
      oncancelled: function oncancelled() {
        activity.postError('cancelled');
      }
    });
  }
};

navigator.mozSetMessageHandler('activity', function onActivity(activity) {
  var name = activity.source.name;
  switch (name) {
    case 'save-bookmark':
      if (activity.source.data.type === 'url') {
        ActivityHandler[name](activity);
      } else {
        activity.postError('type not supported');
      }

      break;

    default:
      activity.postError('name not supported');
  }
});
