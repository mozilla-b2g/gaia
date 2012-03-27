GAIA_DOMAIN?=gaiamobile.org
GAIA_DIR?=$(CURDIR)
B2G_HOMESCREEN=file://$(GAIA_DIR)/index.html

PROFILE_DIR?=$(CURDIR)/profile

MOZ_TESTS = "$(MOZ_OBJDIR)/_tests/testing/mochitest"
INJECTED_GAIA = "$(MOZ_TESTS)/browser/gaia"

TEST_PATH=gaia/tests/${TEST_FILE}

B2G_PID=$(shell $(ADB) shell toolbox ps | grep "b2g" | awk '{ print $$2; }')

# what OS are we on?
SYS=$(shell uname -s)

ifeq ($(SYS),Darwin)
MD5SUM = md5 -r
SED_INPLACE_NO_SUFFIX = " ''"
else
MD5SUM = md5sum -b
SED_INPLACE_NO_SUFFIX = ""
endif



mochitest:
	echo "Checking if the mozilla build has mochitests enabled..."
	test -d $(MOZ_TESTS) || (echo "Please ensure you don't have |ac_add_options --disable-tests| in your mozconfig." && exit 1)
	echo "Checking the injected Gaia..."
	test -L $(INJECTED_GAIA) || ln -s $(GAIA) $(INJECTED_GAIA)
	TEST_PATH=$(TEST_PATH) make -C $(MOZ_OBJDIR) mochitest-browser-chrome EXTRA_TEST_ARGS=--browser-arg=""

# The targets below all require adb
# It should be in your path somewhere, or you can edit this line
# to specify its location.
ADB?=adb

# The install-xulrunner target arranges to get xulrunner downloaded and sets up
# some commands for invoking it. But it is platform dependent
.PHONY: install-xulrunner

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

# Install into profile/ all the files needed to load gaia on device.
.PHONY: gaia
gaia: stamp-commit-hash appcache-manifests copy-manifests offline
	@echo "Installed gaia into profile/."

# If your gaia/ directory is a sub-directory of the B2G directory, then
# you should use the install-gaia target of the B2G Makefile. But if you're
# working on just gaia itself, and you already have B2G firmware on your
# phone, and you have adb in your path, then you can use this target to
# update the gaia files and reboot b2g

PROFILE := $$($(ADB) shell ls -d /data/b2g/mozilla/*.default | tr -d '\r')
PROFILE_DATA := profile
.PHONY: install-gaia
install-gaia: gaia
	$(ADB) start-server
	$(ADB) shell rm -r /data/local/*
	$(ADB) shell rm -r /cache/*
# just push the profile
	$(ADB) push profile/OfflineCache /data/local/OfflineCache
	$(ADB) push profile/webapps /data/local/webapps
	@echo 'Rebooting b2g now'
	$(ADB) shell kill $(B2G_PID)

.PHONY: stamp-commit-hash
stamp-commit-hash:
	git rev-parse HEAD > apps/settings/gaia-commit.txt

# Copy the app manifest files to the profile dir where the
# mozApps API can find them. For desktop usage, you must create
# a symbolic link from your profile directory to $GAIA/profile/webapps
copy-manifests:
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

# Erase all the indexedDB databases on the phone, so apps have to rebuild them.
.PHONY: delete-databases
delete-databases:
	$(ADB) shell rm -r /data/b2g/mozilla/*.default/indexedDB/*

# Take a screenshot of the device and put it in screenshot.png
.PHONY: screenshot
screenshot:
	mkdir screenshotdata
	$(ADB) pull /dev/graphics/fb0 screenshotdata/fb0 
	dd bs=1920 count=800 if=screenshotdata/fb0 of=screenshotdata/fb0b
	ffmpeg -vframes 1 -vcodec rawvideo -f rawvideo -pix_fmt rgb32 -s 480x800 -i screenshotdata/fb0b -f image2 -vcodec png screenshot.png
	rm -rf screenshotdata

# Port forwarding to use the RIL daemon from the device
.PHONY: forward
forward:
	$(ADB) shell touch /data/local/rilproxyd
	$(ADB) shell killall rilproxy
	$(ADB) forward tcp:6200 localreserved:rilproxyd

# update the manifest.appcache files to match what's actually there
.PHONY: appcache-manifests
appcache-manifests:
	@cd apps; \
	for d in `find * -maxdepth 0 -type d` ;\
	do \
		if [ -f $$d/manifest.json ] ;\
		then \
			echo \\t$$d ;\
			cd $$d ;\
			echo "CACHE MANIFEST" > manifest.appcache ;\
			cat `find * -type f | sort` | $(MD5SUM) | cut -f 1 -d ' ' | sed s/^/\#\ Version\ / >> manifest.appcache ;\
			find * -type f | grep -v tools | sort >> manifest.appcache ;\
			sed -i$(SED_IN_PLACE_NO_SUFFIX) -e 's|manifest.appcache||g' manifest.appcache ;\
			echo "http://$(GAIA_DOMAIN)/webapi.js" >> manifest.appcache ;\
			cd .. ;\
		fi \
	done

# Build the offline cache database
.PHONY: offline
offline: install-xulrunner
	@echo "Building offline cache"
	@rm -rf profile/OfflineCache
	@mkdir -p profile/OfflineCache
	@cd ..
	$(XULRUNNER) $(XPCSHELL) -e 'const GAIA_DIR = "$(GAIA_DIR)"; const PROFILE_DIR = "$(PROFILE_DIR)"; const GAIA_DOMAIN = "$(GAIA_DOMAIN)"' offline-cache.js
