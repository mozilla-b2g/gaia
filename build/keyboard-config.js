let utils = require('./utils');

exports.copyLayoutsAndDictionaries = copyLayoutsAndDictionaries;
exports.addEntryPointsToManifest = addEntryPointsToManifest;

function copyLayoutsAndDictionaries(config) {
  // This is the source dir for the keyboard app
  let appDir = utils.getFile(config.GAIA_DIR, 'apps', 'keyboard');

  // Here is where the layouts and dictionaries get copied to
  let layoutDest = utils.getFile(appDir.path, 'js', 'layouts');
  let dictDest = utils.getFile(appDir.path,
                               'js', 'imes', 'latin', 'dictionaries');

  // First delete any layouts or dictionaries that are in the src dir
  // from the last time.
  utils.ensureFolderExists(layoutDest);
  utils.ensureFolderExists(dictDest);
  utils.ls(layoutDest, false).forEach(function(f) { f.remove(false); });
  utils.ls(dictDest).forEach(function(f) { f.remove(false); });

  // Now get the set of layouts for this build
  let layouts = getLayouts(config);

  // Loop through the layouts and copy the layout file and dictionary file
  layouts.forEach(function(layout) {
    // Copy the layout file to where it needs to go
    layout.file.copyTo(layoutDest, layout.file.leafName);

    try {
      if (layout.dictfile)
        layout.dictfile.copyTo(dictDest, layout.dictfile.leafName);
    }
    catch(e) {
      throw new Error('Unknown dictionary file ' + layout.dictfile.path +
                      ' for keyboard layout ' + layout.name);

    }
  });
}

function addEntryPointsToManifest(config, manifest) {
  // Get the set of layouts
  let layouts = getLayouts(config);

  // The inputs property of the manifest object has one property
  // for each keyboard layout we support. The manifest file has a hard-coded
  // entry for the numeric layout, but we have to add each additional layout.
  layouts.forEach(function(layout) {
    manifest.inputs[layout.name] = {
      launch_path: '/index.html#' + layout.name,
      name: layout.label,
      description: layout.label,
      types: layout.types
    };
  });

  // Finally, save the modified manifest into the target directory
  return manifest;
}

// Read the keyboard layout file for each of the named keyboard layouts in
// GAIA_KEYBOARD_LAYOUTS, and return an array of layout objects
function getLayouts(config) {
  // These are the keyboard layouts requested at build time
  let layoutNames = config.GAIA_KEYBOARD_LAYOUTS.split(',');

  // Here is where the layouts and dictionaries come from
  let layoutSrc = utils.getFile(config.GAIA_DIR, 'keyboard', 'layouts');
  let dictSrc = utils.getFile(config.GAIA_DIR, 'keyboard', 'dictionaries');

  // Read the layout files and find their names and dictionaries,
  // and copy them into the app package
  let layouts = layoutNames.map(function(layoutName) {
    let layoutFile = utils.getFile(layoutSrc.path, layoutName + '.js');

    try {
      return getLayoutDetails(layoutName, layoutFile);
    }
    catch(e) {
      throw new Error('Unknown keyboard layout "' + layoutName +
                      '" in GAIA_KEYBOARD_LAYOUTS');
    }
  });

  return layouts;

  // Read the .js file for the named keyboard layout and extract
  // the language name and auto-correct dictionary name.
  function getLayoutDetails(layoutName, layoutFile) {
    let content = utils.getFileContent(layoutFile);

    // The keyboard layout files are JavaScript files that add properties
    // to the Keybords object. They are not clean JSON, so we have to eval()
    // them.  They reference globals KeyEvent and KeyboardEvent, so we
    // have to define those here.
    let Keyboards = {};
    let KeyEvent = {};
    let KeyboardEvent = {};
    eval(content);  // Layouts are js, not JSON, so we can't JSON.parse()

    let dictName = Keyboards[layoutName].autoCorrectLanguage;
    let dictFile = dictName
      ? utils.getFile(dictSrc.path, dictName + '.dict')
      : null;

    return {
      name: layoutName,
      label: Keyboards[layoutName].menuLabel,
      file: layoutFile,
      types: Keyboards[layoutName].types,
      dictfile: dictFile
    };
  }
}
