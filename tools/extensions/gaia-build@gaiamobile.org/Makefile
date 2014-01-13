xpi:
	zip gaia-build@gaiamobile.org.xpi -r bootstrap.js install.rdf chrome.manifest content/

run:
	mkdir -p profile/extensions/
	echo "../../" > profile/extensions/gaia-build@gaiamobile.org
	echo "user_pref(\"extensions.autoDisableScopes\", 14);" > profile/user.js
	echo "user_pref(\"browser.shell.checkDefaultBrowser\", false);" >> profile/user.js
	$(FIREFOX) -profile $(shell pwd)/profile -no-remote about:gaia
