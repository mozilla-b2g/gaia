const DEBUG = true;

//
// These status codes are defined in section 5.2 of
// http://technical.openmobilealliance.org/Technical/release_program/docs/
//        Download/V1_0-20040625-A/OMA-Download-OTA-V1_0-20040625-A.pdf
//
const OMADownloadStatus = Object.freeze({
  SUCCESS: '900 Success',
  INSUFFICIENT_MEMORY: '901 Insufficient memory',
  USER_CANCELLED: '902 User Cancelled',
  LOSS_OF_SERVICE: '903 Loss of Service',
  ATTRIBUTE_MISMATCH: '905 Attribute mismatch',
  INVALID_DESCRIPTOR: '906 Invalid descriptor',
  INVALID_DDVERSION: '951 Invalid DDVersion',
  DEVICE_ABORTED: '952 Device Aborted',
  NON_ACCEPTABLE_CONTENT: '953 Non-Acceptable Content',
  LOADER_ERROR: '954 Loader Error'
});

// These constants are used in calls to reportError.
// Each one defines a localization key.
const DOWNLOAD_ERROR = 'download_error';
const INSTALL_ERROR = 'install_error';
const ERR_DESCRIPTOR_DOWNLOAD_FAILED =  // httpStatus parameter
 'err_descriptor_download_failed';
const ERR_BAD_DESCRIPTOR = 'err_bad_descriptor';
const ERR_TOO_BIG = 'err_too_big';
const ERR_UNSUPPORTED_TYPE = 'err_unsupported_type'; // type parameter
const ERR_BAD_TYPE = 'err_bad_type';
const ERR_CONTENT_DOWNLOAD_FAILED =  // httpStatus parameter
 'err_content_download_failed';
const ERR_BAD_DRM_MESSAGE = 'err_bad_drm_message';
const ERR_BAD_IMAGE = 'err_bad_image';
const ERR_BAD_AUDIO = 'err_bad_audio';
const ERR_NO_SPACE = 'err_no_space';
const ERR_NO_SDCARD = 'err_no_sdcard';
const ERR_SDCARD_IN_USE = 'err_sdcard_in_use';
const ERR_DB_STORE_FAILURE = 'err_db_store_failure';
const ERR_DS_SAVE_FAILURE = 'err_ds_save_failure';

// Success codes that define localization keys
const SUCCESS_SONG = 'success_song';
const SUCCESS_RINGTONE = 'success_ringtone';
const SUCCESS_WALLPAPER = 'success_wallpaper';

// We pass this object to the XMLHttpRequest() constructor so we can
// load things cross-origin. This only works because we have the systemXHR
// permission.
const systemXHR = Object.freeze({ mozSystem: true });

const SupportedImageTypes = Object.freeze({
  'image/jpeg': true,
  'image/png': true,
  'image/gif': true,
  'image/bmp': true
});

const SupportedAudioTypes = Object.freeze({
  'audio/mpeg': true,
  'audio/mp4': true,
  'audio/opus': true,
  'audio/ogg': true
});

// SettingsDB keys for ringtones and wallpaper
RINGTONE_KEY = 'dialer.ringtone';
RINGTONE_NAME_KEY = 'dialer.ringtone.name';
WALLPAPER_KEY = 'wallpaper.image';

// These three constants define the possible uses of the media we download.
// Different values require different handling after download. See the
const SONG = 'song';
const RINGTONE = 'ringtone';
const WALLPAPER = 'wallpaper';

// In our current implementation we download the .dm file as a typed array and
// hold the entire value in memory so that we can easily extract the content
// from the multipart message headers. This means that we have to guard
// against out-of-memory errors. We do that by limiting locked content to
// 16mb, which should be big enough for just about any song that a carrier
// might want to sell.
const MAX_DOWNLOAD_SIZE = 16 * 1024 * 1024;
