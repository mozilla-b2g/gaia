'use strict';

/* global utils, BookmarkEditor, BookmarkRemover */
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
          navigator.mozL10n.get(saved ? 'added-to-home-screen-message' :
                                        'updated-bookmark'));
      },
      oncancelled: function oncancelled() {
        activity.postError('cancelled');
      }
    });
  },

  'remove-bookmark': function ah_remove(activity) {
    BookmarkRemover.init({
      id: activity.source.data.url,
      onremoved: function onremoved() {
        activity.postResult('removed');
      },
      oncancelled: function oncancelled(e) {
        activity.postError(e);
      }
    });
  }
};

navigator.mozSetMessageHandler('activity', function onActivity(activity) {
  var name = activity.source.name;
  switch (name) {
    case 'save-bookmark':
    case 'remove-bookmark':
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
