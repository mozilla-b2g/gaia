###############################################################################
# Global configurations.  Protip: set your own overrides in a local.mk file.  #
#                                                                             #
# GAIA_DOMAIN : change that if you plan to use a different domain to update   #
#               your applications or want to use a local domain               #
#                                                                             #
# SYSTEM      : url of the SYSTEM to start on                                 #
#                                                                             #
# ADB         : if you use a device and plan to send update it with your work #
#               you need to have adb in your path or you can edit this line to#
#               specify its location.                                         #
#                                                                             #
# DEBUG       : debug mode enables mode output on the console and disable the #
#               the offline cache. This is mostly for desktop debugging.      #
#                                                                             #
# REPORTER    : Mocha reporter to use for test output.                        #
#                                                                             #
# MOZPERFOUT  : File path to output mozperf data. Empty mean stdout.          #
#                                                                             #
# MARIONETTE_RUNNER_HOST : The Marionnette runner host.                       #
#                          Current values can be 'marionette-b2gdesktop-host' #
#                          and 'marionette-device-host'                       #
#                                                                             #
# COVERAGE    : Add blanket testing coverage report to use for test output.   #
#                                                                             #
# GAIA_APP_CONFIG : The app.list file representing applications to include in #
#                   Gaia                                                      #
#                                                                             #
###############################################################################
#                                                                             #
# Lint your code                                                              #
#                                                                             #
# use "make hint" and "make gjslint" to lint using respectively jshint and    #
# gjslint.                                                                    #
#                                                                             #
# Use "make lint" to lint using gjslint for blacklisted files, and jshint for #
# other files.                                                                #
#                                                                             #
# APP=<app name> will hint/lint only this app.                                #
# LINTED_FILES=<list of files> will (h/l)int only these space-separated files #
# JSHINTRC=<path> will use this config file when running jshint               #
#                                                                             #
###############################################################################
#                                                                             #
# b2g desktop download and location configuration (formerly xulrunner)        #
#                                                                             #
# USE_LOCAL_XULRUNNER_SDK  : if you have a local b2g desktop installation     #
#                            and want to use it                               #
#                                                                             #
# XULRUNNER_DIRECTORY      : if you use USE_LOCAL_XULRUNNER_SDK, this is      #
#                            where your local b2g desktop installation is     #
#                            Note: a full firefox build is good enough        #
#                                                                             #
# Submakes will get XULRUNNER_DIRECTORY and XPCSHELLSDK as absolute paths.    #
#                                                                             #
###############################################################################


# Eliminate use of the built-in implicit rules to get faster.
MAKEFLAGS=-r

-include local.mk

# Headless bot does not need the full output of wget
# and it can cause crashes in bot.io option is here so
# -nv can be passed and turn off verbose output.
WGET_OPTS?=-c -nv
GAIA_DOMAIN?=gaiamobile.org

DEBUG?=0
DEVICE_DEBUG?=0
NO_LOCK_SCREEN?=0
SCREEN_TIMEOUT?=-1
PRODUCTION?=0
DESKTOP_SHIMS?=0
GAIA_OPTIMIZE?=0
GAIA_DEV_PIXELS_PER_PX?=1

# Alias
ifdef GAIA_DPPX
GAIA_DEV_PIXELS_PER_PX=$(GAIA_DPPX)
endif

DOGFOOD?=0
NODE_MODULES_SRC?=modules.tar

# GAIA_DEVICE_TYPE customization
# phone - default
# tablet
# tv
GAIA_DEVICE_TYPE?=phone

TEST_AGENT_PORT?=8789
GAIA_APP_TARGET?=engineering

# Flag to ease build a simulator-compatible profile
SIMULATOR?=0
ifeq ($(SIMULATOR),1)
DESKTOP=1
NOFTU=1
NOFTUPING=1
DEVICE_DEBUG=1
SCREEN_TIMEOUT=0
endif

# Enable compatibility to run in Firefox Desktop
DESKTOP?=$(DEBUG)
# Disable first time experience screen
NOFTU?=0
# Disable first time ping
NOFTUPING?=0
# Automatically enable remote debugger
REMOTE_DEBUGGER?=0
# Debug mode for build process
BUILD_DEBUG?=0

# We also disable FTU when running in Firefox or in debug mode
ifeq ($(DEBUG),1)
NOFTU=1
NOFTUPING=1
PROFILE_FOLDER?=profile-debug
else ifeq ($(DESKTOP),1)
NOFTU=1
NOFTUPING=1
PROFILE_FOLDER?=profile-debug
else ifeq ($(MAKECMDGOALS),test-integration)
PROFILE_FOLDER?=profile-test
endif

ifeq ($(NOFTUPING), 0)
FTU_PING_URL?=https://fxos.telemetry.mozilla.org/submit/telemetry
else
$(warning NO_FTU_PING=1)
endif

PROFILE_FOLDER?=profile

STAGE_DIR?=$(GAIA_DIR)$(SEP)build_stage
export STAGE_DIR

LOCAL_DOMAINS?=1

ADB?=adb

SCHEME=app://

SYSTEM?=$(SCHEME)system.$(GAIA_DOMAIN)

BUILD_APP_NAME?=*
ifneq ($(APP),)
ifneq ($(MAKECMDGOALS), test-integration)
BUILD_APP_NAME=$(APP)
endif
endif

# BUILDAPP variable defines the target b2g platform (eg desktop, device)
# and exports it for the gaia-marionette script
BUILDAPP?=desktop
export BUILDAPP
# Ensure that NPM only logs warnings and errors
export npm_config_loglevel=warn
ifneq ($(BUILDAPP),desktop)
REPORTER?=mocha-socket-reporter
MARIONETTE_RUNNER_HOST?=marionette-socket-host
endif
REPORTER?=spec
MARIONETTE_RUNNER_HOST?=marionette-b2gdesktop-host
TEST_MANIFEST?=./shared/test/integration/local-manifest.json
MOZPERFOUT?=""

ifeq ($(MAKECMDGOALS), demo)
GAIA_DOMAIN=thisdomaindoesnotexist.org
GAIA_APP_TARGET=demo
else ifeq ($(MAKECMDGOALS), dogfood)
DOGFOOD=1
else ifeq ($(MAKECMDGOALS), production)
PRODUCTION=1
endif

ifeq ($(DOGFOOD), 1)
PRODUCTION=1
endif

# PRODUCTION is also set for user and userdebug B2G builds
ifeq ($(PRODUCTION), 1)
GAIA_OPTIMIZE=1
GAIA_APP_TARGET=production
else ifneq ($(DEBUG),1)
# Enable DEVICE_DEBUG for non-production, non-debug builds.
DEVICE_DEBUG=1
endif

ifeq ($(DEVICE_DEBUG),1)
REMOTE_DEBUGGER=1
SCREEN_TIMEOUT=300
endif

ifeq ($(SIMULATOR),1)
SCREEN_TIMEOUT=0
NO_LOCK_SCREEN=1
endif

ifeq ($(DOGFOOD), 1)
GAIA_APP_TARGET=dogfood
endif

ifdef NODE_MODULES_GIT_URL
NODE_MODULES_SRC := git-gaia-node-modules
endif

###############################################################################
# The above rules generate the profile/ folder and all its content.           #
# The profile folder content depends on different rules:                      #
#  1. webapp manifest                                                         #
#     A directory structure representing the applications installed using the #
#     Apps API. In Gaia all applications use this method.                     #
#     See https://developer.mozilla.org/en/Apps/Apps_JavaScript_API           #
#                                                                             #
#  2. offline                                                                 #
#     An Application Cache database containing Gaia apps, so the phone can be #
#     used offline and application can be updated easily. For details about it#
#     see: https://developer.mozilla.org/en/Using_Application_Cache           #
#                                                                             #
#  3. preferences                                                             #
#     A preference file used by the platform to configure permissions         #
#                                                                             #
###############################################################################

# In debug mode the offline cache is not used (even if it is generated) and
# Gaia is loaded by a built-in web server via port GAIA_PORT.
#
# XXX For now the name of the domain should be mapped to localhost manually
# by editing /etc/hosts on linux/mac. This steps would not be required
# anymore once https://bugzilla.mozilla.org/show_bug.cgi?id=722197 will land.
ifeq ($(DEBUG),1)
GAIA_PORT?=:8080
else
GAIA_PORT?=
endif

# Force bash for all shell commands since we depend on bash-specific syntax
SHELL := /bin/bash

GAIA_DIR := $(CURDIR)

# what OS are we on?
SYS=$(shell uname -s)
ARCH?=$(shell uname -m)
MSYS_FIX=
ifeq (${SYS}/${ARCH},Darwin/i386)
ARCH=x86_64
endif
SEP=/
SEP_FOR_SED=/
ifneq (,$(findstring MINGW32_,$(SYS)))
GAIA_DIR:=$(shell pwd -W | sed -e 's|/|\\\\|g')
SEP=\\
SEP_FOR_SED=\\\\
# Mingw mangle path and append c:\mozilla-build\msys\data in front of paths
MSYS_FIX=/
endif

# The b2g_sdk target arranges to get b2g desktop downloaded and set up.
# This is platform dependent code, so a mite complicated.
# Note: this used to be just xulrunner, hence the use of that name throughout,
# but xulrunner doesn't include everything we need

# Configuration for pre-built or already downloaded b2g (or alternative)
ifdef USE_LOCAL_XULRUNNER_SDK

ifndef XULRUNNER_DIRECTORY
$(error XULRUNNER_DIRECTORY must be set if USE_LOCAL_XULRUNNER_SDK is set)
endif

# Some guesswork to figure out where the xpcshell binary really is
# Most of this is to accommodate the variety of setups used
# by different platforms, build systems and TBPL configurations
# including Firefox, xulrunner and other builds
XPCSHELL_GUESS = $(firstword $(wildcard \
    $(XULRUNNER_DIRECTORY)/B2G.app/Contents/MacOS/xpcshell \
    $(XULRUNNER_DIRECTORY)/bin/XUL.framework/Versions/Current/xpcshell \
    $(XULRUNNER_DIRECTORY)/bin/xpcshell* \
  ))
ifneq (,$(XPCSHELL_GUESS))
XPCSHELLSDK := $(abspath $(XPCSHELL_GUESS))
XULRUNNERSDK := $(wildcard $(XPCSHELLSDK)/run-mozilla.sh)
endif

# Configuration for a downloaded b2g desktop
else

# Determine the host-dependent bundle to download
B2G_SDK_VERSION := 34.0a1
B2G_SDK_DATE := 2014/08/2014-08-12-04-02-01

XULRUNNER_BASE_DIR ?= b2g_sdk
XULRUNNER_DIRECTORY ?= $(XULRUNNER_BASE_DIR)/$(B2G_SDK_VERSION)-$(notdir $(B2G_SDK_DATE))
XULRUNNER_DIRECTORY := $(abspath $(XULRUNNER_DIRECTORY))

ifeq ($(SYS),Darwin)
B2G_SDK_EXT := dmg
B2G_SDK_OS := mac64
XPCSHELLSDK := $(abspath $(XULRUNNER_DIRECTORY)/B2G.app/Contents/MacOS/xpcshell)

else ifeq ($(findstring MINGW32,$(SYS)), MINGW32)
B2G_SDK_EXT := zip
B2G_SDK_OS := win32
XPCSHELLSDK := $(abspath $(XULRUNNER_DIRECTORY)/b2g/xpcshell.exe)

# Otherwise, assume linux
else
B2G_SDK_EXT := tar.bz2
ifeq ($(ARCH),x86_64)
B2G_SDK_OS := linux-x86_64
else
B2G_SDK_OS := linux-i686
endif
XPCSHELLSDK := $(abspath $(XULRUNNER_DIRECTORY)/b2g/xpcshell)
endif

B2G_SDK_URL_BASE := http://ftp.mozilla.org/pub/mozilla.org/b2g/nightly/$(B2G_SDK_DATE)-mozilla-central
B2G_SDK_FILE_NAME := b2g-$(B2G_SDK_VERSION).multi.$(B2G_SDK_OS).$(B2G_SDK_EXT)
B2G_SDK_URL := $(B2G_SDK_URL_BASE)/$(B2G_SDK_FILE_NAME)
B2G_SDK_URL_FILE := $(XULRUNNER_DIRECTORY)/.b2g.url

endif # Firefox build workaround

# XULRUNNERSDK used to be run-mozilla.sh, but some builds don't include it
# Without that, Linux needs to reference the directory containing libxul.so
ifeq (,$(XULRUNNERSDK)$(findstring Darwin,$(SYS))$(findstring MINGW32_,$(SYS)))
XULRUNNERSDK := LD_LIBRARY_PATH="$(dir $(XPCSHELLSDK))"
endif

# It's difficult to figure out XULRUNNERSDK in subprocesses; it's complex and
# some builders may want to override our find logic (ex: TBPL).
# So let's export these variables to external processes.
export XULRUNNER_DIRECTORY XULRUNNERSDK XPCSHELLSDK
export SYS
export GAIA_DIR
export SEP
export SEP_FOR_SED

ifndef GAIA_APP_CONFIG
GAIA_APP_CONFIG=$(GAIA_DIR)$(SEP)build$(SEP)config$(SEP)$(GAIA_DEVICE_TYPE)$(SEP)apps-$(GAIA_APP_TARGET).list
endif

ifndef GAIA_DISTRIBUTION_DIR
  GAIA_DISTRIBUTION_DIR := $(GAIA_DIR)$(SEP)distribution
else
  ifneq (,$(findstring MINGW32_,$(SYS)))
    GAIA_DISTRIBUTION_DIR := $(shell pushd $(GAIA_DISTRIBUTION_DIR) > /dev/null; \
      pwd -W | sed 's|/|\\\\|g'; popd > /dev/null;)
  else
    GAIA_DISTRIBUTION_DIR := $(realpath $(GAIA_DISTRIBUTION_DIR))
  endif
endif
export GAIA_DISTRIBUTION_DIR

SETTINGS_PATH ?= build/config/custom-settings.json
KEYBOARD_LAYOUTS_PATH ?= build/config/keyboard-layouts.json
CONTACTS_IMPORT_SERVICES_PATH ?= build/config/communications_services.json
EMAIL_SERVICES_PATH ?=

ifdef GAIA_DISTRIBUTION_DIR
  DISTRIBUTION_SETTINGS := $(GAIA_DISTRIBUTION_DIR)$(SEP)settings.json
  DISTRIBUTION_CONTACTS := $(GAIA_DISTRIBUTION_DIR)$(SEP)contacts.json
  DISTRIBUTION_APP_CONFIG := $(GAIA_DISTRIBUTION_DIR)$(SEP)apps.list
  DISTRIBUTION_VARIANT := $(GAIA_DISTRIBUTION_DIR)$(SEP)variant.json
  DISTRIBUTION_KEYBOARD_LAYOUTS := $(GAIA_DISTRIBUTION_DIR)$(SEP)keyboard-layouts.json
  DISTRIBUTION_CONTACTS_IMPORT_SERVICES := $(GAIA_DISTRIBUTION_DIR)$(SEP)communications_services.json
  ifneq ($(wildcard $(DISTRIBUTION_SETTINGS)),)
    SETTINGS_PATH := $(DISTRIBUTION_SETTINGS)
  endif
  ifneq ($(wildcard $(DISTRIBUTION_CONTACTS)),)
    CONTACTS_PATH := $(DISTRIBUTION_CONTACTS)
  endif
  ifneq ($(wildcard $(DISTRIBUTION_APP_CONFIG)),)
    GAIA_APP_CONFIG := $(DISTRIBUTION_APP_CONFIG)
  endif
  ifneq ($(wildcard $(DISTRIBUTION_VARIANT)),)
    VARIANT_PATH := $(DISTRIBUTION_VARIANT)
  endif
  ifneq ($(wildcard $(DISTRIBUTION_KEYBOARD_LAYOUTS)),)
    KEYBOARD_LAYOUTS_PATH := $(DISTRIBUTION_KEYBOARD_LAYOUTS)
  endif
  ifneq ($(wildcard $(DISTRIBUTION_CONTACTS_IMPORT_SERVICES)),)
    CONTACTS_IMPORT_SERVICES_PATH := $(DISTRIBUTION_CONTACTS_IMPORT_SERVICES)
  endif
  ifneq ($(wildcard $(DISTRIBUTION_EMAIL_SERVICES)),)
    EMAIL_SERVICES_PATH := $(DISTRIBUTION_EMAIL_SERVICES)
  endif
endif

# Read the file specified in $GAIA_APP_CONFIG and turn them into $GAIA_APPDIRS,
# i.e., absolute path of each app.
# Path ending in wildcard (*) will be expanded, non-absolute path in the list will be matched against
# $GAIA_DISTRIBUTION_DIR and $GAIA_DIR.
# See MDN for more information.
#
# explain shell magic here:
# "$${LINE\#$${LINE%?}}": get last character
# sed 's/.\{2\}$$//': remove last two character

ifdef GAIA_APP_SRCDIRS
$(shell printf "`echo $(GAIA_APP_SRCDIRS) | sed 's| |/*\\\n|g'`/*\n" > /tmp/gaia-apps-temp.list)
GAIA_APP_CONFIG := /tmp/gaia-apps-temp.list
$(warning GAIA_APP_SRCDIRS is deprecated, please use GAIA_APP_CONFIG)
endif

GAIA_ALLAPPDIRS=$(shell find $(GAIA_DIR)$(SEP)apps $(GAIA_DIR)$(SEP)dev_apps -maxdepth 1 -mindepth 1 -type d  | sed 's@[/\\]@$(SEP_FOR_SED)@g')

GAIA_APPDIRS=$(shell while read LINE; do \
  if [ "$${LINE\#$${LINE%?}}" = "*" ]; then \
    srcdir="`echo "$$LINE" | sed 's/.\{2\}$$//'`"; \
    [ -d $(GAIA_DIR)$(SEP)$$srcdir ] && find -L $(GAIA_DIR)$(SEP)$$srcdir -mindepth 1 -maxdepth 1 -type d | sed 's@[/\\]@$(SEP_FOR_SED)@g'; \
    [ -d $(GAIA_DISTRIBUTION_DIR)$(SEP)$$srcdir ] && find -L $(GAIA_DISTRIBUTION_DIR)$(SEP)$$srcdir -mindepth 1 -maxdepth 1 -type d | sed 's@[/\\]@$(SEP_FOR_SED)@g'; \
  else \
    if [ -d "$(GAIA_DISTRIBUTION_DIR)$(SEP)$$LINE" ]; then \
      echo "$(GAIA_DISTRIBUTION_DIR)$(SEP)$$LINE" | sed 's@[/\\]@$(SEP_FOR_SED)@g'; \
    elif [ -d "$(GAIA_DIR)$(SEP)$$LINE" ]; then \
      echo "$(GAIA_DIR)$(SEP)$$LINE" | sed 's@[/\\]@$(SEP_FOR_SED)@g'; \
    elif [ -d "$$LINE" ]; then \
      echo "$$LINE" | sed 's@[/\\]@$(SEP_FOR_SED)@g'; \
    fi \
  fi \
done < $(GAIA_APP_CONFIG))

ifneq ($(GAIA_OUTOFTREE_APP_SRCDIRS),)
  $(shell mkdir -p outoftree_apps \
    $(foreach dir,$(GAIA_OUTOFTREE_APP_SRCDIRS),\
      $(foreach appdir,$(wildcard $(dir)/*),\
	&& ln -sf $(appdir) outoftree_apps/)))
endif

GAIA_LOCALES_PATH?=locales
LOCALES_FILE?=shared/resources/languages.json
GAIA_LOCALE_SRCDIRS=$(GAIA_DIR)$(SEP)shared $(GAIA_APPDIRS)
GAIA_DEFAULT_LOCALE?=en-US
GAIA_PRETRANSLATE?=1
GAIA_CONCAT_LOCALES?=1

# This variable is for customizing the keyboard layouts in a build.
GAIA_KEYBOARD_LAYOUTS?=en,pt-BR,es,de,fr,fr-CA,pl,ko,zh-Hans-Pinyin,en-Dvorak

ifeq ($(SYS),Darwin)
MD5SUM = md5 -r
SED_INPLACE_NO_SUFFIX = /usr/bin/sed -i ''
DOWNLOAD_CMD = /usr/bin/curl -OLsS
TAR_WILDCARDS = tar
else
MD5SUM = md5sum -b
SED_INPLACE_NO_SUFFIX = sed -i
DOWNLOAD_CMD = wget $(WGET_OPTS)
TAR_WILDCARDS = tar --wildcards
endif

# Test agent setup
TEST_COMMON=dev_apps/test-agent/common
ifeq ($(strip $(NODEJS)),)
  NODEJS := `which node`
endif

ifeq ($(strip $(NPM)),)
  NPM := `which npm`
endif

TEST_AGENT_CONFIG="./dev_apps/test-agent/config.json"

#Marionette testing variables
#make sure we're python 2.7.x
ifeq ($(strip $(PYTHON_27)),)
PYTHON_27 := `which python`
endif
PYTHON_FULL := $(wordlist 2,4,$(subst ., ,$(shell $(PYTHON_27) --version 2>&1)))
PYTHON_MAJOR := $(word 1,$(PYTHON_FULL))
PYTHON_MINOR := $(word 2,$(PYTHON_FULL))
MARIONETTE_HOST ?= localhost
MARIONETTE_PORT ?= 2828
TEST_DIRS ?= $(GAIA_DIR)/tests

define BUILD_CONFIG
{ \
  "ADB" : "$(patsubst "%",%,$(ADB))", \
  "GAIA_DIR" : "$(GAIA_DIR)", \
  "PROFILE_DIR" : "$(GAIA_DIR)$(SEP)$(PROFILE_FOLDER)", \
  "PROFILE_FOLDER" : "$(PROFILE_FOLDER)", \
  "GAIA_SCHEME" : "$(SCHEME)", \
  "GAIA_DOMAIN" : "$(GAIA_DOMAIN)", \
  "DEBUG" : $(DEBUG), \
  "LOCAL_DOMAINS" : $(LOCAL_DOMAINS), \
  "DESKTOP" : $(DESKTOP), \
  "DEVICE_DEBUG" : $(DEVICE_DEBUG), \
  "NO_LOCK_SCREEN" : $(NO_LOCK_SCREEN), \
  "SCREEN_TIMEOUT" : $(SCREEN_TIMEOUT), \
  "SYSTEM" : "$(SYSTEM)", \
  "GAIA_PORT" : "$(GAIA_PORT)", \
  "GAIA_LOCALES_PATH" : "$(GAIA_LOCALES_PATH)", \
  "GAIA_INSTALL_PARENT" : "$(GAIA_INSTALL_PARENT)", \
  "LOCALES_FILE" : "$(subst \,\\,$(LOCALES_FILE))", \
  "GAIA_KEYBOARD_LAYOUTS" : "$(GAIA_KEYBOARD_LAYOUTS)", \
  "LOCALE_BASEDIR" : "$(subst \,\\,$(LOCALE_BASEDIR))", \
  "BUILD_APP_NAME" : "$(BUILD_APP_NAME)", \
  "PRODUCTION" : "$(PRODUCTION)", \
  "GAIA_OPTIMIZE" : "$(GAIA_OPTIMIZE)", \
  "GAIA_DEVICE_TYPE" : "$(GAIA_DEVICE_TYPE)", \
  "GAIA_DEV_PIXELS_PER_PX" : "$(GAIA_DEV_PIXELS_PER_PX)", \
  "DOGFOOD" : "$(DOGFOOD)", \
  "OFFICIAL" : "$(MOZILLA_OFFICIAL)", \
  "GAIA_DEFAULT_LOCALE" : "$(GAIA_DEFAULT_LOCALE)", \
  "GAIA_PRETRANSLATE" : "$(GAIA_PRETRANSLATE)", \
  "GAIA_CONCAT_LOCALES" : "$(GAIA_CONCAT_LOCALES)", \
  "GAIA_ENGINE" : "xpcshell", \
  "GAIA_DISTRIBUTION_DIR" : "$(GAIA_DISTRIBUTION_DIR)", \
  "GAIA_APPDIRS" : "$(GAIA_APPDIRS)", \
  "GAIA_ALLAPPDIRS" : "$(GAIA_ALLAPPDIRS)", \
  "GAIA_MEMORY_PROFILE" : "$(GAIA_MEMORY_PROFILE)", \
  "NOFTU" : "$(NOFTU)", \
  "REMOTE_DEBUGGER" : "$(REMOTE_DEBUGGER)", \
  "TARGET_BUILD_VARIANT" : "$(TARGET_BUILD_VARIANT)", \
  "SETTINGS_PATH" : "$(subst \,\\,$(SETTINGS_PATH))", \
  "FTU_PING_URL": "$(FTU_PING_URL)", \
  "KEYBOARD_LAYOUTS_PATH" : "$(KEYBOARD_LAYOUTS_PATH)", \
  "CONTACTS_IMPORT_SERVICES_PATH" : "$(CONTACTS_IMPORT_SERVICES_PATH)", \
  "EMAIL_SERVICES_PATH" : "$(EMAIL_SERVICES_PATH)", \
  "STAGE_DIR" : "$(STAGE_DIR)", \
  "GAIA_APP_TARGET" : "$(GAIA_APP_TARGET)", \
  "BUILD_DEBUG" : "$(BUILD_DEBUG)", \
  "VARIANT_PATH" : "$(VARIANT_PATH)" \
}
endef

export BUILD_CONFIG

include build/common.mk

# Generate profile/
$(PROFILE_FOLDER): profile-dir pre-app post-app test-agent-config offline contacts extensions b2g_sdk .git/hooks/pre-commit
ifeq ($(BUILD_APP_NAME),*)
	@echo "Profile Ready: please run [b2g|firefox] -profile $(CURDIR)$(SEP)$(PROFILE_FOLDER)"
endif

$(STAGE_DIR):
	mkdir -p $@

LANG=POSIX # Avoiding sort order differences between OSes

.PHONY: pre-app
pre-app: b2g_sdk $(STAGE_DIR)
	@$(call run-js-command,pre-app)

.PHONY: app
app: $(XULRUNNER_BASE_DIRECTORY) pre-app | $(STAGE_DIR)
	@$(call run-js-command,app)

.PHONY: post-app
post-app: app pre-app b2g_sdk
	@$(call run-js-command,post-app)

# Keep old targets just for people/scripts still using it
.PHONY: post-manifest
post-manifest: post-app

.PHONY: copy-build-stage-data
copy-build-stage-data: post-app

.PHONY: webapp-optimize
webapp-optimize: post-app

.PHONY: webapp-zip
webapp-zip: post-app

# Get additional extensions
$(STAGE_DIR)/additional-extensions/downloaded.json: build/config/additional-extensions.json $(wildcard .build/config/custom-extensions.json)
ifeq ($(SIMULATOR),1)
	# Prevent installing external firefox helper addon for the simulator
else ifeq ($(DESKTOP),1)
	@$(call run-js-command,additional-extensions)
endif

profile-dir:
	@test -d $(PROFILE_FOLDER) || mkdir -p $(PROFILE_FOLDER)

# Copy preload contacts to profile
contacts: profile-dir
ifeq ($(BUILD_APP_NAME),*)
ifdef CONTACTS_PATH
	@echo "Copying preload contacts to profile"
	@cp $(CONTACTS_PATH) $(PROFILE_FOLDER)
	@cp $(CONTACTS_PATH) $(PROFILE_FOLDER)/defaults/contacts.json
else
	@rm -f $(PROFILE_FOLDER)/contacts.json
endif
endif

# Create webapps
offline: app post-app

# Create an empty reference workload
.PHONY: reference-workload-empty
reference-workload-empty:
	test_media/reference-workload/makeReferenceWorkload.sh empty

# Create a light reference workload
.PHONY: reference-workload-light
reference-workload-light:
	test_media/reference-workload/makeReferenceWorkload.sh light

# Create a medium reference workload
.PHONY: reference-workload-medium
reference-workload-medium:
	test_media/reference-workload/makeReferenceWorkload.sh medium

# Create a heavy reference workload
.PHONY: reference-workload-heavy
reference-workload-heavy:
	test_media/reference-workload/makeReferenceWorkload.sh heavy

# Create an extra heavy reference workload
.PHONY: reference-workload-x-heavy
reference-workload-x-heavy:
	test_media/reference-workload/makeReferenceWorkload.sh x-heavy

.PHONY: xpcshell_sdk xulrunner_sdk print-xulrunner-sdk
xpcshell_sdk:
	@echo $(XPCSHELLSDK)

xulrunner_sdk:
	@echo $(XULRUNNERSDK)

print-xulrunner-sdk:
	@echo "$(XULRUNNER_DIRECTORY)"

B2G_SDK_TMP := .b2g.tmp
.INTERMEDIATES: $(B2G_SDK_TMP)
.PHONY: b2g_sdk
b2g_sdk:
	@echo "Test SDK directory: $(XULRUNNER_DIRECTORY)"
ifndef USE_LOCAL_XULRUNNER_SDK
ifneq ($(B2G_SDK_URL),$(shell test -d $(XULRUNNER_DIRECTORY) && cat $(B2G_SDK_URL_FILE) 2> /dev/null))
	rm -rf $(XULRUNNER_DIRECTORY)
	mkdir -p "$(XULRUNNER_DIRECTORY)"
	@echo "Downloading B2G SDK..."
	$(DOWNLOAD_CMD) "$(B2G_SDK_URL)"
ifeq ($(B2G_SDK_EXT),dmg)
# it's a nasty mac disk image
	@mkdir -p $(B2G_SDK_TMP)
	hdiutil attach $(B2G_SDK_FILE_NAME) -readonly -nobrowse -mount required -mountpoint $(B2G_SDK_TMP)
	cp -Rf $(B2G_SDK_TMP)/* "$(XULRUNNER_DIRECTORY)"
	ln -sf "$(XULRUNNER_DIRECTORY)/B2G.app/Contents/MacOS" "$(XULRUNNER_DIRECTORY)/b2g"
	umount $(B2G_SDK_TMP)
else ifeq ($(B2G_SDK_EXT),tar.bz2)
	tar xjf "$(B2G_SDK_FILE_NAME)" -C "$(XULRUNNER_DIRECTORY)"
else
	unzip -q "$(B2G_SDK_FILE_NAME)" -d "$(XULRUNNER_DIRECTORY)"
endif
	@rm -rf $(B2G_SDK_TMP) $(B2G_SDK_FILE_NAME)
	@echo $(B2G_SDK_URL) > $(B2G_SDK_URL_FILE)
endif # B2G SDK is up to date
endif # USE_LOCAL_XULRUNNER_SDK
	test -f $(XPCSHELLSDK)

# Generate profile/prefs.js
preferences: profile-dir b2g_sdk
	@$(call run-js-command,preferences)

# Generate $(PROFILE_FOLDER)/extensions
EXT_DIR=$(PROFILE_FOLDER)/extensions
extensions: $(STAGE_DIR)/additional-extensions/downloaded.json
ifeq ($(BUILD_APP_NAME),*)
	@rm -rf $(EXT_DIR)
	@mkdir -p $(EXT_DIR)
ifeq ($(SIMULATOR),1)
	cp -r tools/extensions/{activities@gaiamobile.org,activities,alarms@gaiamobile.org,alarms,desktop-helper,desktop-helper@gaiamobile.org} $(EXT_DIR)/
else ifeq ($(DESKTOP),1)
	cp -r tools/extensions/* $(EXT_DIR)/
	cp -r $(STAGE_DIR)/additional-extensions/* $(EXT_DIR)/
else ifeq ($(DEBUG),1)
	cp tools/extensions/httpd@gaiamobile.org $(EXT_DIR)/
	cp -r tools/extensions/httpd $(EXT_DIR)/
else ifeq ($(DESKTOP_SHIMS),1)
	cp -r tools/extensions/{desktop-helper,desktop-helper@gaiamobile.org} $(EXT_DIR)/
endif
	@echo "Finished: Generating extensions"
endif


# this lists the programs we need in the Makefile and that are installed by npm

NPM_INSTALLED_PROGRAMS = node_modules/.bin/mozilla-download node_modules/.bin/jshint node_modules/.bin/mocha
$(NPM_INSTALLED_PROGRAMS): package.json node_modules


NODE_MODULES_REV=$(shell cat gaia_node_modules.revision)
# modules.tar and git-gaia-node-modules are the possible values for
# $(NODE_MODULES_SRC). See the node_modules target.
modules.tar: gaia_node_modules.revision
	-$(DOWNLOAD_CMD) https://github.com/mozilla-b2g/gaia-node-modules/tarball/$(NODE_MODULES_REV) &&\
	mv $(NODE_MODULES_REV) "$(NODE_MODULES_SRC)"

git-gaia-node-modules: gaia_node_modules.revision
	if [ ! -d "$(NODE_MODULES_SRC)" ] ; then \
		git clone "$(NODE_MODULES_GIT_URL)" "$(NODE_MODULES_SRC)" ; \
	fi
	(cd "$(NODE_MODULES_SRC)" && git fetch && git reset --hard "$(NODE_MODULES_REV)" )

node_modules: gaia_node_modules.revision
	# Running make without using a dependency ensures that we can run
	# "make node_modules" with a custom NODE_MODULES_GIT_URL variable, and then
	# run another target without specifying the variable
	$(MAKE) $(NODE_MODULES_SRC)
ifeq "$(NODE_MODULES_SRC)" "modules.tar"
	$(TAR_WILDCARDS) --strip-components 1 -x -m -f $(NODE_MODULES_SRC) "mozilla-b2g-gaia-node-modules-*/node_modules"
else
	rm -fr node_modules
	cp -R $(NODE_MODULES_SRC)/node_modules node_modules
endif
	npm install && npm rebuild
	@echo "node_modules installed."
	touch -c $@

###############################################################################
# Tests                                                                       #
###############################################################################

MOZ_TESTS = "$(MOZ_OBJDIR)/_tests/testing/mochitest"
INJECTED_GAIA = "$(MOZ_TESTS)/browser/gaia"

TEST_PATH=gaia/tests/${TEST_FILE}

ifndef APPS
  ifdef APP
    APPS=$(APP)
  else
    APPS=template $(shell find apps -type d -name 'test' | sed -e 's|^apps/||' -e 's|/test$$||' | sort )
  endif
endif

b2g: node_modules/.bin/mozilla-download
	DEBUG=* ./node_modules/.bin/mozilla-download  \
		--verbose \
		--product b2g \
		--channel tinderbox \
		--branch mozilla-central $@

.PHONY: test-integration
# $(PROFILE_FOLDER) should be `profile-test` when we do `make test-integration`.
test-integration: clean $(PROFILE_FOLDER) test-integration-test

# XXX Because bug-969215 is not finished, if we are going to run too many
# marionette tests for 30 times at the same time, we may easily get timeout.
#
# In this way, we decide to separate building process with running marionette
# tests so that we won't get into this problem.
#
# Remember to remove this target after bug-969215 is finished !
.PHONY: test-integration-test
test-integration-test:
	./bin/gaia-marionette \
		--host $(MARIONETTE_RUNNER_HOST) \
		--manifest $(TEST_MANIFEST) \
		--reporter $(REPORTER) \
		--buildapp $(BUILDAPP)

.PHONY: caldav-server-install
caldav-server-install:
	source tests/travis_ci/venv.sh; \
				export LC_ALL=en_US.UTF-8; \
				export LANG=en_US.UTF-8; \
				pip install radicale;

.PHONY: test-perf
test-perf:
	MOZPERFOUT="$(MOZPERFOUT)" APPS="$(APPS)" \
	MARIONETTE_RUNNER_HOST=$(MARIONETTE_RUNNER_HOST) GAIA_DIR="`pwd`" \
	REPORTER=$(REPORTER) \
	./bin/gaia-perf-marionette

.PHONY: tests
tests: app offline
	echo "Checking if the mozilla build has tests enabled..."
	test -d $(MOZ_TESTS) || (echo "Please ensure you don't have |ac_add_options --disable-tests| in your mozconfig." && exit 1)
	echo "Checking the injected Gaia..."
	test -L $(INJECTED_GAIA) || ln -s $(CURDIR) $(INJECTED_GAIA)
	TEST_PATH=$(TEST_PATH) make -C $(MOZ_OBJDIR) mochitest-browser-chrome EXTRA_TEST_ARGS="--browser-arg=\"\" --extra-profile-file=$(CURDIR)/$(PROFILE_FOLDER)/webapps --extra-profile-file=$(CURDIR)/$(PROFILE_FOLDER)/user.js"

.PHONY: common-install
common-install:
	@test -x "$(NODEJS)" || (echo "Please Install NodeJS -- (use aptitude on linux or homebrew on osx)" && exit 1 )
	@test -x "$(NPM)" || (echo "Please install NPM (node package manager) -- http://npmjs.org/" && exit 1 )

.PHONY: update-common
update-common: common-install
	# common testing tools
	mkdir -p $(TEST_COMMON)/vendor/test-agent/
	rm -f $(TEST_COMMON)/vendor/test-agent/test-agent.js
	rm -f $(TEST_COMMON)/vendor/test-agent/test-agent.css
	cp node_modules/test-agent/test-agent.js $(TEST_COMMON)/vendor/test-agent/
	cp node_modules/test-agent/test-agent.css $(TEST_COMMON)/vendor/test-agent/

# Create the json config file
# for use with the test agent GUI
test-agent-config:
ifeq ($(BUILD_APP_NAME),*)
	@rm -f $(TEST_AGENT_CONFIG)
	@touch $(TEST_AGENT_CONFIG)
	@rm -f /tmp/test-agent-config;
	@# Build json array of all test files
	@for d in ${GAIA_ALLAPPDIRS}; \
	do \
		parent="`dirname $$d`"; \
		pathlen=`expr $${#parent} + 2`; \
		find "$$d" -name '*_test.js' -path '*/test/unit/*' | awk '{print substr($$0,'$${pathlen}')}' >> /tmp/test-agent-config; \
	done;
	@echo '{"tests": [' >> $(TEST_AGENT_CONFIG)
	@cat /tmp/test-agent-config |  \
		sed 's:\(.*\):"\1":' | \
		sed -e ':a' -e 'N' -e '$$!ba' -e 's/\n/,\
	/g' >> $(TEST_AGENT_CONFIG);
	@echo '  ]}' >> $(TEST_AGENT_CONFIG);
	@echo "Finished: test ui config file: $(TEST_AGENT_CONFIG)"
	@rm -f /tmp/test-agent-config
endif

# For test coverage report
COVERAGE?=0
ifeq ($(COVERAGE), 1)
TEST_ARGS=--coverage
endif
# Temp make file method until we can switch
# over everything in test
ifneq ($(strip $(APP)),)
APP_TEST_LIST=$(shell find apps/$(APP) dev_apps/$(APP) -name '*_test.js' 2> /dev/null | grep '/test/unit/')
endif
.PHONY: test-agent-test
test-agent-test: node_modules
ifneq ($(strip $(APP)),)
	@echo 'Running tests for $(APP)';
	./node_modules/test-agent/bin/js-test-agent test $(TEST_ARGS) --server ws://localhost:$(TEST_AGENT_PORT) --reporter $(REPORTER) $(APP_TEST_LIST)
else
	@echo 'Running all tests';
	./node_modules/test-agent/bin/js-test-agent test $(TEST_ARGS) --server ws://localhost:$(TEST_AGENT_PORT) --reporter $(REPORTER)
endif

.PHONY: test-agent-server
test-agent-server: common-install node_modules
	./node_modules/test-agent/bin/js-test-agent server --port $(TEST_AGENT_PORT) -c ./shared/test/unit/test-agent-server.js --http-path . --growl

.PHONY: marionette
marionette:
#need the profile
	test -d $(GAIA)/$(PROFILE_FOLDER) || $(MAKE) $(PROFILE_FOLDER)
ifneq ($(PYTHON_MAJOR), 2)
	@echo "Python 2.7.x is needed for the marionette client. You can set the PYTHON_27 variable to your python2.7 path." && exit 1
endif
ifneq ($(PYTHON_MINOR), 7)
	@echo "Python 2.7.x is needed for the marionette client. You can set the PYTHON_27 variable to your python2.7 path." && exit 1
endif
ifeq ($(strip $(MC_DIR)),)
	@echo "Please have the MC_DIR environment variable point to the top of your mozilla-central tree." && exit 1
endif
#if B2G_BIN is defined, we will run the b2g binary, otherwise, we assume an instance is running
ifneq ($(strip $(B2G_BIN)),)
	cd $(MC_DIR)/testing/marionette/client/marionette && \
	sh venv_test.sh $(PYTHON_27) --address=$(MARIONETTE_HOST):$(MARIONETTE_PORT) --b2gbin=$(B2G_BIN) $(TEST_DIRS)
else
	cd $(MC_DIR)/testing/marionette/client/marionette && \
	sh venv_test.sh $(PYTHON_27) --address=$(MARIONETTE_HOST):$(MARIONETTE_PORT) $(TEST_DIRS)
endif

###############################################################################
# Utils                                                                       #
###############################################################################

.PHONY: lint gjslint hint csslint

# Lint apps
## only gjslint files from build/jshint-xfail.list - files not yet safe to jshint
## "ls" is used to filter the existing files only, in case the xfail.list is not maintained well enough.
ifndef LINTED_FILES
ifdef APP
  JSHINTED_PATH = apps/$(APP)
  GJSLINTED_PATH = $(shell grep "^apps/$(APP)" build/jshint/xfail.list | ( while read file ; do test -f "$$file" && echo $$file ; done ) )
else
  JSHINTED_PATH = apps shared build tests
  GJSLINTED_PATH = $(shell ( while read file ; do test -f "$$file" && echo $$file ; done ) < build/jshint/xfail.list )
endif
endif

lint:
	NO_XFAIL=1 $(MAKE) -k gjslint hint jsonlint csslint

gjslint: GJSLINT_EXCLUDED_DIRS = $(shell grep '\/\*\*$$' .jshintignore | sed 's/\/\*\*$$//' | paste -s -d, -)
gjslint: GJSLINT_EXCLUDED_FILES = $(shell egrep -v '(\/\*\*|^\s*)$$' .jshintignore | paste -s -d, -)
gjslint:
	# gjslint --disable 210,217,220,225 replaces --nojsdoc because it's broken in closure-linter 2.3.10
	# http://code.google.com/p/closure-linter/issues/detail?id=64
	@echo Running gjslint...
	@gjslint --disable 210,217,220,225 --custom_jsdoc_tags="prop,borrows,memberof,augments,exports,global,event,example,mixes,mixin,fires,inner,todo,access,namespace,listens,module,memberOf,property,requires,alias,returns" -e '$(GJSLINT_EXCLUDED_DIRS)' -x '$(GJSLINT_EXCLUDED_FILES)' $(GJSLINTED_PATH) $(LINTED_FILES)
	@echo Note: gjslint only checked the files that are xfailed for jshint.

JSHINT_ARGS := --reporter=build/jshint/xfail $(JSHINT_ARGS)

ifdef JSHINTRC
	JSHINT_ARGS := $(JSHINT_ARGS) --config $(JSHINTRC)
endif

ifdef VERBOSE
	JSHINT_ARGS := $(JSHINT_ARGS) --verbose
endif

hint: node_modules/.bin/jshint
	@echo Running jshint...
	@./node_modules/.bin/jshint $(JSHINT_ARGS) $(JSHINTED_PATH) $(LINTED_FILES) || (echo Please consult https://github.com/mozilla-b2g/gaia/tree/master/build/jshint/README.md to get some information about how to fix jshint issues. && exit 1)

csslint: b2g_sdk
	@$(call run-js-command,csslint)

jsonlint: b2g_sdk
	@$(call run-js-command,jsonlint)

# Erase all the indexedDB databases on the phone, so apps have to rebuild them.
delete-databases:
	@echo 'Stopping b2g'
	@$(ADB) shell stop b2g
	@$(ADB) shell rm -r $(MSYS_FIX)/data/local/indexedDB/*
	@echo 'Starting b2g'
	@$(ADB) shell start b2g

# Take a screenshot of the device and put it in screenshot.png
screenshot:
	mkdir -p screenshotdata
	$(ADB) pull $(MSYS_FIX)/dev/graphics/fb0 screenshotdata/fb0
	dd bs=1920 count=800 if=screenshotdata/fb0 of=screenshotdata/fb0b
	ffmpeg -vframes 1 -vcodec rawvideo -f rawvideo -pix_fmt rgb32 -s 480x800 -i screenshotdata/fb0b -f image2 -vcodec png screenshot.png
	rm -rf screenshotdata

# Forward port to use the RIL daemon from the device
forward:
	$(ADB) shell touch $(MSYS_FIX)/data/local/rilproxyd
	$(ADB) shell killall rilproxy
	$(ADB) forward tcp:6200 localreserved:rilproxyd

# install-gaia is alias to build & push to device.
.PHONY: install-gaia
install-gaia: $(PROFILE_FOLDER) push

# If your gaia/ directory is a sub-directory of the B2G directory, then
# you should use:
#
#  BUILD_APP_NAME=app-name ./flash.sh gaia
#
# But if you're working on just gaia itself, and you already have B2G firmware
# on your phone, and you have adb in your path, then you can use the
# push target to update the gaia files and reboot b2g
.PHONY: push
push: b2g_sdk
	@$(call run-js-command,push-to-device)

# Copy demo media to the sdcard.
# If we've got old style directories on the phone, rename them first.
install-media-samples:
	$(ADB) shell 'if test -d /sdcard/Pictures; then mv /sdcard/Pictures /sdcard/DCIM; fi'
	$(ADB) shell 'if test -d /sdcard/music; then mv /sdcard/music /sdcard/music.temp; mv /sdcard/music.temp /sdcard/Music; fi'
	$(ADB) shell 'if test -d /sdcard/videos; then mv /sdcard/videos /sdcard/Movies;	fi'

	$(ADB) push test_media/samples/DCIM $(MSYS_FIX)/sdcard/DCIM
	$(ADB) push test_media/samples/Movies $(MSYS_FIX)/sdcard/Movies
	$(ADB) push test_media/samples/Music $(MSYS_FIX)/sdcard/Music

install-test-media:
	$(ADB) push test_media/Pictures $(MSYS_FIX)/sdcard/DCIM
	$(ADB) push test_media/Movies $(MSYS_FIX)/sdcard/Movies
	$(ADB) push test_media/Music $(MSYS_FIX)/sdcard/Music

dialer-demo:
	@cp -R apps/contacts apps/dialer
	@rm apps/dialer/contacts/manifest*
	@mv apps/dialer/contacts/index.html apps/dialer/contacts/contacts.html
	@sed -i.bak 's/manifest.appcache/..\/manifest.appcache/g' apps/dialer/contacts/contacts.html
	@find apps/dialer/ -name '*.bak' -exec rm {} \;

demo: install-media-samples install-gaia

production: reset-gaia
dogfood: reset-gaia

# Remove everything and install a clean profile
reset-gaia: purge install-gaia install-default-data

# remove the memories and apps on the phone
purge:
	$(ADB) shell stop b2g
	@(for FILE in `$(ADB) shell ls $(MSYS_FIX)/data/local | tr -d '\r'`; \
	do \
		[ $$FILE = 'tmp' ] || $(ADB) shell rm -r $(MSYS_FIX)/data/local/$$FILE; \
	done);
	$(ADB) shell rm -r $(MSYS_FIX)/cache/*
	$(ADB) shell rm -r $(MSYS_FIX)/data/b2g/*
	$(ADB) shell rm -r $(MSYS_FIX)/data/local/webapps
	$(ADB) remount
	$(ADB) shell rm -r $(MSYS_FIX)/system/b2g/webapps
	$(ADB) shell 'if test -d $(MSYS_FIX)/persist/svoperapps; then rm -r $(MSYS_FIX)/persist/svoperapps; fi'

$(PROFILE_FOLDER)/settings.json: b2g_sdk profile-dir pre-app post-app

# push $(PROFILE_FOLDER)/settings.json and $(PROFILE_FOLDER)/contacts.json (if CONTACTS_PATH defined) to the phone
install-default-data: $(PROFILE_FOLDER)/settings.json contacts
	$(ADB) shell stop b2g
	$(ADB) remount
	$(ADB) push $(PROFILE_FOLDER)/settings.json $(MSYS_FIX)/system/b2g/defaults/settings.json
ifdef CONTACTS_PATH
	$(ADB) push $(PROFILE_FOLDER)/contacts.json $(MSYS_FIX)/system/b2g/defaults/contacts.json
else
	$(ADB) shell rm /system/b2g/defaults/contacts.json
endif
	$(ADB) shell start b2g

# clean out build products
clean:
	rm -rf profile profile-debug profile-test profile-gaia-test-b2g profile-gaia-test-firefox $(PROFILE_FOLDER) $(STAGE_DIR) docs

# clean out build products and tools
really-clean: clean
	rm -rf b2g-* .b2g-* b2g_sdk node_modules b2g modules.tar js-marionette-env

.git/hooks/pre-commit: tools/pre-commit
	test -d .git && cp tools/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit || true

build-test-unit: $(NPM_INSTALLED_PROGRAMS)
	@$(call run-build-test, $(shell find build/test/unit/*.test.js))

build-test-integration: $(NPM_INSTALLED_PROGRAMS)
	@$(call run-build-test, $(shell find build/test/integration/*.test.js))

build-test-unit-coverage: $(NPM_INSTALLED_PROGRAMS)
	@$(call run-build-coverage,build/test/unit)

.PHONY: docs
docs: $(NPM_INSTALLED_PROGRAMS)
	grunt docs

.PHONY: watch
watch: $(NPM_INSTALLED_PROGRAMS)
	node build/watcher.js
