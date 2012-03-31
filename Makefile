###############################################################################
# Global configurations                                                       #
#                                                                             #
# GAIA_DOMAIN : change that if you plan to use a different domain to update   #
#               your applications or want to use a local domain               #
#                                                                             #
# ADB         : if you use a device and plan to send update it with your work #
#               you need to have adb in your path or you can edit this line to#
#               specify its location.                                         #
#                                                                             #
# DEBUG       : If you want to activate more debugging options                #
#                                                                             #
###############################################################################
GAIA_DOMAIN?=gaiamobile.org

ADB?=adb


DEBUG?=0

###############################################################################
# The above rules generate the profile/ folder and all it's content.          #
# The profile folder content depends on different rules:                      #
#  1. manifests                                                               #
#     A directory structure representing the applications installed using the #
#     Apps API. In Gaia all applications use this method.                     #
#     See https://developer.mozilla.org/en/Apps/Apps_JavaScript_API           #
#                                                                             #
#	 2. offline                                                                 #
#			An Application Cache database containing Gaia apps, so the phone can be #
#     used offline and application can be updated easily. For details about it#
#     see: https://developer.mozilla.org/en/Using_Application_Cache           #
#                                                                             #
#  3. preferences                                                             #
#     A preference file used by the platform to configure permissions         #
#                                                                             #
###############################################################################

# what OS are we on?
SYS=$(shell uname -s)

ifeq ($(SYS),Darwin)
MD5SUM = md5 -r
SED_INPLACE_NO_SUFFIX = sed -i ''
else
MD5SUM = md5sum -b
SED_INPLACE_NO_SUFFIX = sed -i
endif

# Generate profile/
profile: stamp-commit-hash update-offline-manifests preferences manifests offline
	@echo "\nProfile Ready: please run [b2g|firefox] -profile $(CURDIR)/profile"

LANG=POSIX # Avoiding sort order differences between OSes

# Generate profile/webapps/
manifests:
	@echo "Generated webapps"
	@mkdir -p profile/webapps
	@cp apps/webapps.json profile/webapps
	@sed -i$(SED_INPLACE_NO_SUFFIX) -e 's|gaiamobile.org|$(GAIA_DOMAIN)|g' profile/webapps/webapps.json
	@cd apps; \
	for d in `find * -maxdepth 0 -type d` ;\
	do \
	  if [ -f $$d/manifest.json ]; \
		then \
		  mkdir -p ../profile/webapps/$$d; \
		  cp $$d/manifest.json ../profile/webapps/$$d  ;\
		fi \
	done
	@echo "Done"


# Generate profile/OfflineCache/
offline: install-xulrunner
	@echo "Building offline cache"
	@rm -rf profile/OfflineCache
	@mkdir -p profile/OfflineCache
	@cd ..
	$(XULRUNNER) $(XPCSHELL) -e 'const GAIA_DIR = "$(CURDIR)"; const PROFILE_DIR = "$(CURDIR)/profile"; const GAIA_DOMAIN = "$(GAIA_DOMAIN)"' offline-cache.js
	@echo "Done"

# The install-xulrunner target arranges to get xulrunner downloaded and sets up
# some commands for invoking it. But it is platform dependent
ifeq ($(SYS),Darwin)
# We're on a mac
XULRUNNER_DOWNLOAD=http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/11.0/sdk/xulrunner-11.0.en-US.mac-x86_64.sdk.tar.bz2
XULRUNNER=./xulrunner-sdk/bin/run-mozilla.sh
XPCSHELL=./xulrunner-sdk/bin/xpcshell

install-xulrunner:
	test -d xulrunner-sdk || (wget $(XULRUNNER_DOWNLOAD) && tar xjf xulrunner*.tar.bz2 && rm xulrunner*.tar.bz2)

else
# Not a mac: assume linux
# Linux only!
# downloads and installs locally xulrunner to run the xpchsell
# script that creates the offline cache
XULRUNNER_DOWNLOAD=http://ftp.mozilla.org/pub/mozilla.org/xulrunner/releases/11.0/runtimes/xulrunner-11.0.en-US.linux-i686.tar.bz2
XULRUNNER=./xulrunner/run-mozilla.sh
XPCSHELL=./xulrunner/xpcshell

install-xulrunner:
	test -d xulrunner || (wget $(XULRUNNER_DOWNLOAD) && tar xjf xulrunner*.tar.bz2 && rm xulrunner*.tar.bz2)
endif

# Generate profile/prefs.js
preferences:
	@echo "Generating prefs.js..."
	$(XULRUNNER) $(XPCSHELL) -e 'const GAIA_DIR = "$(CURDIR)"; const PROFILE_DIR = "$(CURDIR)/profile"; const GAIA_DOMAIN = "$(GAIA_DOMAIN)"; const DEBUG = $(DEBUG)' preferences.js
	@echo "Done"



###############################################################################
# Tests                                                                       #
###############################################################################

MOZ_TESTS = "$(MOZ_OBJDIR)/_tests/testing/mochitest"
INJECTED_GAIA = "$(MOZ_TESTS)/browser/gaia"

TEST_PATH=gaia/tests/${TEST_FILE}

.PHONY: tests
tests: manifests offline
	echo "Checking if the mozilla build has tests enabled..."
	test -d $(MOZ_TESTS) || (echo "Please ensure you don't have |ac_add_options --disable-tests| in your mozconfig." && exit 1)
	echo "Checking the injected Gaia..."
	test -L $(INJECTED_GAIA) || ln -s $(CURDIR) $(INJECTED_GAIA)
	TEST_PATH=$(TEST_PATH) make -C $(MOZ_OBJDIR) mochitest-browser-chrome EXTRA_TEST_ARGS="--browser-arg=\"\" --extra-profile-file=$(CURDIR)/profile/webapps --extra-profile-file=$(CURDIR)/profile/OfflineCache --extra-profile-file=$(CURDIR)/profile/user.js"


###############################################################################
# Utils                                                                       #
###############################################################################


# Generate a text file containing the current changeset of Gaia
# XXX I wonder if this should be a replace-in-file hack. This would let us
#     let us remove the update-offline-manifests target dependancy of the
#     default target.
stamp-commit-hash:
	git rev-parse HEAD > apps/settings/gaia-commit.txt

# Copy the app manifest files to the profile dir where the
# mozApps API can find them. For desktop usage, you must create
# a symbolic link from your profile directory to $GAIA/profile/webapps
copy-manifests:
	@mkdir -p profile/webapps
	@cp apps/webapps.json profile/webapps
	@$(SED_INPLACE_NO_SUFFIX) -e 's|gaiamobile.org|$(GAIA_DOMAIN)|g' profile/webapps/webapps.json
	@cd apps; \
	for d in `find * -maxdepth 0 -type d` ;\
	do \
	  if [ -f $$d/manifest.json ]; \
		then \
		  mkdir -p ../profile/webapps/$$d; \
		  cp $$d/manifest.json ../profile/webapps/$$d  ;\
		fi \
	done

# Erase all the indexedDB databases on the phone, so apps have to rebuild them.
delete-databases:
	$(ADB) shell rm -r /data/b2g/mozilla/*.default/indexedDB/*


# Take a screenshot of the device and put it in screenshot.png
screenshot:
	mkdir -p screenshotdata
	$(ADB) pull /dev/graphics/fb0 screenshotdata/fb0
	dd bs=1920 count=800 if=screenshotdata/fb0 of=screenshotdata/fb0b
	ffmpeg -vframes 1 -vcodec rawvideo -f rawvideo -pix_fmt rgb32 -s 480x800 -i screenshotdata/fb0b -f image2 -vcodec png screenshot.png
	rm -rf screenshotdata


# Forward port to use the RIL daemon from the device
forward:
	$(ADB) shell touch /data/local/rilproxyd
	$(ADB) shell killall rilproxy
	$(ADB) forward tcp:6200 localreserved:rilproxyd


# update the manifest.appcache files to match what's actually there
update-offline-manifests:
	@cd apps; \
	for d in `find * -maxdepth 0 -type d` ;\
	do \
		if [ -f $$d/manifest.json ] ;\
		then \
			echo \\t$$d ;\
			cd $$d ;\
			echo "CACHE MANIFEST" > manifest.appcache ;\
			cat `find * -type f | sort -nfs` | $(MD5SUM) | cut -f 1 -d ' ' | sed 's/^/\#\ Version\ /' >> manifest.appcache ;\
			find * -type f | grep -v tools | sort >> manifest.appcache ;\
			$(SED_INPLACE_NO_SUFFIX) -e 's|manifest.appcache||g' manifest.appcache ;\
			echo "http://$(GAIA_DOMAIN)/webapi.js" >> manifest.appcache ;\
			echo "NETWORK:" >> manifest.appcache ;\
			echo "http://*" >> manifest.appcache ;\
			echo "https://*" >> manifest.appcache ;\
			cd .. ;\
		fi \
	done


# If your gaia/ directory is a sub-directory of the B2G directory, then
# you should use the install-gaia target of the B2G Makefile. But if you're
# working on just gaia itself, and you already have B2G firmware on your
# phone, and you have adb in your path, then you can use the install-gaia
# target to update the gaia files and reboot b2g
install-gaia: profile
	$(ADB) start-server
	$(ADB) shell rm -r /data/local/*
	$(ADB) shell rm -r /cache/*
	# just push the profile
	$(ADB) push profile/OfflineCache /data/local/OfflineCache
	$(ADB) push profile/webapps /data/local/webapps
	@echo "Installed gaia into profile/."
	$(ADB) shell kill $(shell $(ADB) shell toolbox ps | grep "b2g" | awk '{ print $$2; }')
	@echo 'Rebooting b2g now'

httpd:
	python tools/httpd.py
