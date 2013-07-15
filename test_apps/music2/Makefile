METADATA_SCRIPTS = \
 ../../shared/js/blobview.js \
 js/selectPages/MediaLibraryPage/metadata.js

concatenated_scripts: js/selectPages/MediaLibraryPage/metadata_scripts.js

js/selectPages/MediaLibraryPage/metadata_scripts.js: Makefile $(METADATA_SCRIPTS)
	cat $(METADATA_SCRIPTS) > js/selectPages/MediaLibraryPage/metadata_scripts.js
