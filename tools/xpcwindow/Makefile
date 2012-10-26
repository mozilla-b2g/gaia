REPORTER?=Dot

# what OS are we on?
SYS=$(shell uname -s)
ARCH?=$(shell uname -m)
ifeq (${SYS}/${ARCH},Darwin/i386)
ARCH=x86_64
endif
SEP=/
ifneq (,$(findstring MINGW32_,$(SYS)))
CURDIR:=$(shell pwd -W | sed -e 's|/|\\\\|g')
SEP=\\
endif

ifeq ($(SYS),Darwin)
MD5SUM = md5 -r
SED_INPLACE_NO_SUFFIX = /usr/bin/sed -i ''
DOWNLOAD_CMD = /usr/bin/curl -O
else
MD5SUM = md5sum -b
SED_INPLACE_NO_SUFFIX = sed -i
DOWNLOAD_CMD = wget
endif

package:
	rm -f vendor/mocha.js
	rm -f vendor/expect.js
	cp node_modules/mocha/mocha.js vendor/mocha.js
	cp node_modules/expect.js/expect.js vendor/expect.js

.PHONY: test
TESTS=`find test -name "*-test.js"`
test:
	@./bin/xpcwindow-mocha --reporter $(REPORTER) test/helper.js $(TESTS)
# The install-xulrunner target arranges to get xulrunner downloaded and sets up
# some commands for invoking it. But it is platform dependent
XULRUNNER_SDK_URL=http://ftp.mozilla.org/pub/mozilla.org/xulrunner/nightly/2012/07/2012-07-17-03-05-55-mozilla-central/xulrunner-17.0a1.en-US.

ifeq ($(SYS),Darwin)
# For mac we have the xulrunner-sdk so check for this directory
# We're on a mac
XULRUNNER_MAC_SDK_URL=$(XULRUNNER_SDK_URL)mac-
ifeq ($(ARCH),i386)
# 32-bit
XULRUNNER_SDK_DOWNLOAD=$(XULRUNNER_MAC_SDK_URL)i386.sdk.tar.bz2
else
# 64-bit
XULRUNNER_SDK_DOWNLOAD=$(XULRUNNER_MAC_SDK_URL)x86_64.sdk.tar.bz2
endif
XULRUNNERSDK=./xulrunner-sdk/bin/run-mozilla.sh
XPCSHELLSDK=./xulrunner-sdk/bin/xpcshell

else ifeq ($(findstring MINGW32,$(SYS)), MINGW32)
# For windows we only have one binary
XULRUNNER_SDK_DOWNLOAD=$(XULRUNNER_SDK_URL)win32.sdk.zip
XULRUNNERSDK=
XPCSHELLSDK=./xulrunner-sdk/bin/xpcshell

else
# Otherwise, assume linux
# downloads and installs locally xulrunner to run the xpchsell
# script that creates the offline cache
XULRUNNER_LINUX_SDK_URL=$(XULRUNNER_SDK_URL)linux-
ifeq ($(ARCH),x86_64)
XULRUNNER_SDK_DOWNLOAD=$(XULRUNNER_LINUX_SDK_URL)x86_64.sdk.tar.bz2
else
XULRUNNER_SDK_DOWNLOAD=$(XULRUNNER_LINUX_SDK_URL)i686.sdk.tar.bz2
endif
XULRUNNERSDK=./xulrunner-sdk/bin/run-mozilla.sh
XPCSHELLSDK=./xulrunner-sdk/bin/xpcshell
endif

install-xulrunner-sdk:
ifeq ($(findstring MINGW32,$(SYS)), MINGW32)
	@test -d xulrunner-sdk || ($(DOWNLOAD_CMD) $(XULRUNNER_SDK_DOWNLOAD) && unzip xulrunner*.zip && rm xulrunner*.zip)
else
	@test -d xulrunner-sdk || ($(DOWNLOAD_CMD) $(XULRUNNER_SDK_DOWNLOAD) && tar xjf xulrunner*.tar.bz2 && rm xulrunner*.tar.bz2)
endif

