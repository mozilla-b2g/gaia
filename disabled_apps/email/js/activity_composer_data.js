'use strict';

define(function(require, exports, module) {
  var attachmentName = require('attachment_name'),
      queryUri = require('query_uri');

  return function activityComposeR(rawActivity) {
    // Parse the activity request.
    var source = rawActivity.source;
    var data = source.data;
    var activityName = source.name;
    var dataType = data.type;
    var url = data.url || data.URI;

    var attachData;
    if (dataType === 'url' && activityName === 'share') {
      attachData = {
        body: url
      };
    } else {
      attachData = queryUri(url);
      attachData.attachmentBlobs = data.blobs || [];
      attachData.attachmentNames = data.filenames || [];

      attachmentName.ensureNameList(attachData.attachmentBlobs,
                                    attachData.attachmentNames);
    }

    return {
      onComposer: function(composer, composeCard) {
        var attachmentBlobs = attachData.attachmentBlobs;
        /* to/cc/bcc/subject/body all have default values that shouldn't
        be clobbered if they are not specified in the URI*/
        if (attachData.to) {
          composer.to = attachData.to;
        }
        if (attachData.subject) {
          composer.subject = attachData.subject;
        }
        if (attachData.body) {
          composer.body = { text: attachData.body + composer.body.text };
        }
        if (attachData.cc) {
          composer.cc = attachData.cc;
        }
        if (attachData.bcc) {
          composer.bcc = attachData.bcc;
        }
        if (attachmentBlobs) {
          var attachmentsToAdd = [];
          for (var iBlob = 0; iBlob < attachmentBlobs.length; iBlob++) {
            attachmentsToAdd.push({
              name: attachData.attachmentNames[iBlob],
              blob: attachmentBlobs[iBlob]
            });
          }
          composeCard.addAttachmentsSubjectToSizeLimits(attachmentsToAdd);
        }
      }
    };
  };
});
