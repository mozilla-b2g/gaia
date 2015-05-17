# marionette-file-manager

A marionette plugin to manage(add, remove) files in device storage.

# Usage

### Setup
```
/**
 * For Gaia usage, please setup the plugin in
 * https://github.com/mozilla-b2g/gaia/blob/master/shared/test/integration/setup.js.
 */
marionette.plugin('fileManager', require('marionette-file-manager'));
```

### Add files into the specified directory
```
/**
 * The marionette-file-manager plugin will handle the directory things,
 * we do not need to create or remove the directort manually.
 *
 * After do the below script,
 * we will have the two files in the path/to/device-storage/pictures directory.
 *
 * And we could just use { type: 'other-directory', filePath: 'path/to/file1' } to
 * add files into the "other-directory" directory.
 */
client.fileManager.add([
  { type: 'pictures', filePath: 'path/to/file1' },
  { type: 'pictures', filePath: 'path/to/file2', filename: 'filename2' }
]);
```

```
// Add all files of a directory into device storage.
client.fileManager.add([
  { type: 'pictures', dirPath: 'path/to/dir' }
]);
```

### Remove files
```
// Remove the filename2 file from pictures directory.
client.fileManager.remove({ type: 'pictures', filename: 'filename2' });

// Remove all files in device storage.
client.fileManager.removeAllFiles();
```
