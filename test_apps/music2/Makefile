METADATA_SCRIPTS = \
 ../../shared/js/blobview.js \
 js/MediaLibraryPage/metadata.js

concatenated_scripts: js/MediaLibraryPage/metadata_scripts.js

js/MediaLibraryPage/metadata_scripts.js: Makefile $(METADATA_SCRIPTS)
	cat $(METADATA_SCRIPTS) > js/MediaLibraryPage/metadata_scripts.js
