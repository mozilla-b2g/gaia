'use strict';
/* exported showFileInformation */
/* global
  $,
  getCurrentFile,
  JPEGParser,
  LazyLoader,
  MediaUtils,
  NFC,
  photodb,
  videostorage
*/

// Hide the information view again, when clicking on cancel
$('info-close-button').onclick = function hideFileInformation() {
  // Enable NFC sharing when user closes info and returns to fullscreen view
  NFC.share(getCurrentFile);
  $('info-view').classList.add('hidden');
  document.body.classList.remove('showing-dialog');
};

function showFileInformation(fileinfo) {
  if (fileinfo.metadata.video) {
    var req = videostorage.get(fileinfo.metadata.video);
    req.onsuccess = function() {
      fileinfo.size = req.result.size;
      fileinfo.type = req.result.type || 'video/3gp';
      populateMediaInfo(fileinfo);
    };
  } else {
    populateMediaInfo(fileinfo);
  }
  // We need to disable NFC sharing when showing file info view
  NFC.unshare();
  $('info-view').classList.remove('hidden');
  document.body.classList.add('showing-dialog');

  function populateMediaInfo(fileinfo) {
    MediaUtils.getLocalizedSizeTokens(fileinfo.size).then((args) => {
      var formattedDate = MediaUtils.formatDate(fileinfo.date);
      var exifFields = [
        'info-aperture', 'info-shutterspeed', 'info-iso',
        'info-flash', 'info-focallength'
      ];
      var data = {
        //set the video filename using metadata
        'info-name': {
          raw: getFileName(fileinfo.metadata.video || fileinfo.name)
        },
        'info-size': {
          id: 'fileSize',
          args: args
        },
        'info-type': {raw: fileinfo.type},
        'info-date': {raw: formattedDate},
        'info-resolution': {
          raw: fileinfo.metadata.width + 'x' + fileinfo.metadata.height
        }
      };
      // placeholders for Exif. Also hide the exif fields.
      exifFields.forEach((elem) => {
        data[elem] = {raw: ''};
        setFieldVisibility(elem, false);
      });

      // Populate info overlay view
      MediaUtils.populateMediaInfo(data);

      if (!fileinfo.metadata.video) {
        LazyLoader.load(['shared/js/media/jpeg-exif.js'], () => {
          photodb.getFile(fileinfo.name, (imagefile) => {
            JPEGParser.readExifMetaData(imagefile, (error, metadata) => {
              if (!metadata) {
                return;
              }

              var data = {};
              // We don't seem to supply FNumber
              var fnumber;
              if (metadata.FNumber && metadata.FNumber.denominator) {
                fnumber = metadata.FNumber.numerator /
                  metadata.FNumber.denominator;
              } else if (metadata.ApertureValue &&
                         metadata.ApertureValue.denominator) {
                fnumber = Math.pow(2, (metadata.ApertureValue.numerator /
                                       metadata.ApertureValue.denominator) / 2);
              }
              var exposureTime = metadata.ExposureTime ?
                  MediaUtils.formatExifExposure(metadata.ExposureTime) : null;
              var focalLength = metadata.FocalLength &&
                  metadata.FocalLength.denominator ?
                  (metadata.FocalLength.numerator /
                   metadata.FocalLength.denominator) + 'mm' : null;
              // use Exif date if available
              if (metadata.DateTimeOriginal) {
                formattedDate = MediaUtils.formatExifDate(
                  metadata.DateTimeOriginal);
                if (formattedDate) {
                  data['info-date'] = { raw: formattedDate };
                }
              }

              if (fnumber) {
                data['info-aperture'] =  { raw: 'f/' + fnumber.toFixed(1) };
                setFieldVisibility('info-aperture', true);
              }
              if (exposureTime) {
                data['info-shutterspeed'] =  { raw: exposureTime };
                setFieldVisibility('info-shutterspeed', true);
              }
              if (metadata.ISOSpeedRatings) {
                data['info-iso'] = { raw: metadata.ISOSpeedRatings };
                setFieldVisibility('info-iso', true);
              }
              if (focalLength) {
                data['info-focallength'] = { raw: focalLength };
                setFieldVisibility('info-focallength', true);
              }
              MediaUtils.populateMediaInfo(data);

              // this is async
              var flashValues = MediaUtils.formatExifFlash(metadata.Flash);
              if (flashValues) {
                document.l10n.formatValues(...flashValues).then((values) => {
                  var flashData = {};
                  flashData['info-flash'] = {
                    raw: values.join(', ')
                  };
                  MediaUtils.populateMediaInfo(flashData);
                  setFieldVisibility('info-flash', true);
                });
              }
            });
          });
        });
      }
      // Hide Resolution for video files. See Bug 1217989
      fileinfo.metadata.video ? setFieldVisibility('info-resolution', false) :
                                setFieldVisibility('info-resolution', true);
    });
  }

  function getFileName(path) {
    return path.split('/').pop();
  }

  function setFieldVisibility(id, visible) {
    // Field label in info view
    var label = $(id).previousElementSibling;
    var next = $(id).nextElementSibling;

    // If not visible, hide respective field label and
    // its value and remove bottom border from the previous field.
    if (visible) {
      $(id).style.display = 'block';
      label.style.display = 'block';
      label.previousElementSibling.classList.remove('no-border');

      if (next && next.style.display === 'none') {
        $(id).classList.add('no-border');
      }
    } else {
      $(id).style.display = 'none';
      label.style.display = 'none';
      if (next === null || (next && next.style.display === 'none')) {
        label.previousElementSibling.classList.add('no-border');
      }
    }
  }

}
