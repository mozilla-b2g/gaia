'use strict';

if (navigator.mozSetMessageHandler) {
  navigator.mozSetMessageHandler('activity', function onActivity(activity) {
    switch (activity.source.name) {
      case 'save-bookmark':
        var bookmarkSaved = function sb_bookmarkSaved() {
          window.addEventListener('status-hidden', function hidden() {
            window.removeEventListener('status-hidden', hidden);
            activity.postResult('saved');
          });
          utils.status.show(navigator.mozL10n.get('added-to-home-screen'));
        };
        var addBookmarkCancelled = function sb_addBookmarkCancelled() {
          activity.postError('cancelled');
        };

        var data = activity.source.data;
        if (data.type === 'url') {
          var options = {
            data: data,
            onsaved: bookmarkSaved,
            oncancelled: addBookmarkCancelled
          };
          BookmarkEditor.init(options);
          document.addEventListener('visibilitychange', function changed() {
            if (document.hidden) {
              BookmarkEditor.close();
            }
          });
        } else {
          activity.postError('type not supported');
        }
        break;

      default:
        activity.postError('name not supported');
    }
  });
}
