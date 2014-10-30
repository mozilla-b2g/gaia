this.EXPORTED_SYMBOLS = ["convertRfc2822RepToMessageRep"];

Components.utils.import("resource://fakeserver/modules/mimeParser.jsm");

/**
 * Convert an RFC2822 message into a representation the fake-server understands.
 *
 * XXX FIXME XXX
 * Our body part translation is very limited (just like the logic in
 * th_fake_activesync_server, although not quite as simple), so this can't
 * handle complex representations all that well.
 */
this.convertRfc2822RepToMessageRep =
function convertRfc2822RepToMessageRep(mimestr) {
  if (typeof(mimestr) !== 'string')
    mimestr = String.fromCharCode.apply(undefined, mimestr);

  var message;
  var curPartNum = null, curHeaders = null, saveContentTo = null;
  var emitter = {
    startPart: function imap_buildMap_startPart(partNum, headers) {
      if (partNum === '' || partNum === '1$') {
        message = {
          id: headers.get('message-id')[0],
          from: headers.get('from')[0],
          to: headers.has('to') ? headers.get('to')[0] : null,
          cc: headers.has('cc') ? headers.get('cc')[0] : null,
          // ActiveSync is dumb and does not support BCC's
          replyTo: headers.has('reply-to') ? headers.get('reply-to')[0] : null,
          date: (new Date(headers.get('date')[0])).valueOf(),
          subject: headers.get('subject')[0],
          flags: [],
          body: null,
          attachments: [],
        };
      }
      var ct = headers.has('content-type') ? headers.get('content-type')[0]
                                           : 'text/plain';
      let [type, params] = MimeParser.parseHeaderField(
        ct,
        MimeParser.HEADER_PARAMETER |
        // we want any filename fully decoded
          MimeParser.HEADER_OPTION_ALL_I18N);
      type = type.toLowerCase();
      let [media, sub] = type.split('/', 2);

      if (media === 'multipart') {
        // do nothing with these parts! they are boring!
      }
      else if (media === 'text') {
        // Only use this part if it's the first body we've seen or if it's html
        // and we're not already html.
        if (!message.body ||
            (sub === 'html' && message.body.contentType === 'text/plain')) {
          message.body = {
            contentType: type,
            content: ''
          };
          saveContentTo = message.body;
        }
      }
      else { // attachment!
        let filename = null;
        let name = null;
        // the filename might have been on the content-type
        if ('name' in params) {
          filename = params.name;
          name = params.name;
        }
        // no? maybe it was on the content-disposition
        else if (headers.has('content-disposition')) {
          let [cdType, cdParams] = MimeParser.parseHeaderField(
            headers.get('content-disposition')[0],
            MimeParser.HEADER_PARAMETER |
              MimeParser.HEADER_OPTION_ALL_I18N);
          if ('filename' in cdParams) {
            filename = cdParams.filename;
          }
        }

        saveContentTo = {
          name: name || filename,
          filename: filename,
          contentId: headers.has('content-id') ? headers.get('content-id')[0]
                                               : null,
          contentType: type,
          content: ''
        };
        message.attachments.push(saveContentTo);
      }
    },
    endPart: function(partNum) {
      saveContentTo = null;
    },
    deliverPartData: function (partNum, data) {
      if (saveContentTo)
        saveContentTo.content += data;
    },
  };
  MimeParser.parseSync(
    mimestr, emitter,
    // Attachments get decoded, it's just that if we fetch them inline, then
    // they get base64 encoded for transit purposes only.  So fully decode.
    { bodyformat: 'decode', stripcontinuations: false });
  if (!message)
    throw new Error('Failed to parse a message out of the MIME!');
  return message;
}


