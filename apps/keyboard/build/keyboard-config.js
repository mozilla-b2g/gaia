let utils = require('utils');
const { Cc, Ci, Cr, Cu, CC } = require('chrome');
Cu.import('resource://gre/modules/Services.jsm');

exports.copyLayoutsAndResources = copyLayoutsAndResources;
exports.addEntryPointsToManifest = addEntryPointsToManifest;

function copyLayoutsAndResources(appDir, distDir, layoutNames) {
  // Here is where the layouts and dictionaries get copied to
  let layoutDest = utils.getFile(distDir.path, 'js', 'layouts');
  let dictDest = utils.getFile(distDir.path,
                               'js', 'imes', 'latin', 'dictionaries');

  let imeDest = utils.getFile(distDir.path, 'js', 'imes');

  // First delete any layouts or dictionaries that are in the src dir
  // from the last time.
  utils.ensureFolderExists(layoutDest);
  utils.ensureFolderExists(dictDest);

  // Now get the set of layouts for this build
  let layouts = getLayouts(appDir, layoutNames);

  // Loop through the layouts and copy the layout file and dictionary file
  layouts.forEach(function(layout) {
    // Copy the layout file to where it needs to go
    layout.file.copyTo(layoutDest, layout.file.leafName);

    try {
      if (layout.imEngineDir)
        layout.imEngineDir.copyTo(imeDest, layout.imEngineDir.leafName);
    }
    catch(e) {
      throw new Error('Unknown ime directory ' + layout.imEngineDir.path +
                      ' for keyboard layout ' + layout.name);

    }

    try {
      if (layout.dictFile)
        layout.dictFile.copyTo(dictDest, layout.dictFile.leafName);
    }
    catch(e) {
      throw new Error('Unknown dictionary file ' + layout.dictFile.path +
                      ' for keyboard layout ' + layout.name);

    }
  });
}

function addEntryPointsToManifest(appDir, distDir, layoutNames, manifest) {
  // Get the set of layouts
  let layouts = getLayouts(appDir, layoutNames);

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
function getLayouts(appDir, layoutNames) {
  // Here is where the layouts and dictionaries come from
  let layoutSrc = utils.getFile(appDir.path, 'js', 'layouts');
  let dictSrc = utils.getFile(appDir.path, 'js', 'imes', 'latin', 'dictionaries');
  let imeSrc = utils.getFile(appDir.path, 'js', 'imes');

  // Read the layout files and find their names and dictionaries,
  // and copy them into the app package
  let layouts = layoutNames.map(function(layoutName) {
    let layoutFile = utils.getFile(layoutSrc.path, layoutName + '.js');

	if (!layoutFile.exists()) {
       throw new Error("Keyboard layout " + layoutName + ".js specified by GAIA_KEYBOARD_LAYOUTS not found in " + layoutSrc.path)
    }

    try {
      return getLayoutDetails(layoutName, layoutFile);
    }
    catch(e) {
      // keep the original Error with its stack, just annotate which
      // keyboard failed.
      e.message = 'Problem with keyboard layout "' + layoutName +
                  '" in GAIA_KEYBOARD_LAYOUTS\n' + e.message;
      throw e;
    }
  });

  return layouts;

  // Read the .js file for the named keyboard layout and extract
  // the language name and auto-correct dictionary name.
  function getLayoutDetails(layoutName, layoutFile) {
    // The keyboard layout files are JavaScript files that add properties
    // to the Keybords object. They are not clean JSON, so we have to use
    // use the scriptloader to load them. That also gives stacktraces for
    // errors inside the keyboard file.
    // They reference globals KeyEvent and KeyboardEvent, so we
    // have to define those on the context object.
    var win = {Keyboards: {},
               KeyEvent: {},
               KeyboardEvent: {}};
    Services.scriptloader.loadSubScript('file://' + layoutFile.path, win, 'UTF-8');
    let dictName = win.Keyboards[layoutName].autoCorrectLanguage;
    let dictFile = dictName
      ? utils.getFile(dictSrc.path, dictName + '.dict')
      : null;
    let imEngineName = win.Keyboards[layoutName].imEngine;
    let imEngineDir = (imEngineName && imEngineName !== 'latin')
      ? utils.getFile(imeSrc.path, imEngineName)
      : null;

    return {
      name: layoutName,
      label: win.Keyboards[layoutName].menuLabel,
      file: layoutFile,
      types: win.Keyboards[layoutName].types,
      dictFile: dictFile,
      imEngineDir: imEngineDir
    };
  }
}
