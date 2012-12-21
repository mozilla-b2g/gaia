'use strict';

if (navigator.mozSetMessageHandler) {
  navigator.mozSetMessageHandler('activity', function onActivity(activity) {
    switch (activity.source.name) {
      case 'save-bookmark':
        var bookmarkSaved = function sb_bookmarkSaved() {
          activity.postResult('saved');
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
        }
        break;
    }
  });
}
