# We can't figure out XULRUNNERSDK on our own; it's complex and some builders
# # may want to override our find logic (ex: TBPL), so let's just leave it up to
# # the root Makefile.  If you know what you're doing, you can manually define
# # XULRUNNERSDK and XPCSHELLSDK on the command line.
ifndef XPCSHELLSDK
$(error This Makefile needs to be run by the root gaia makefile. Use `make APP=email` from the root gaia directory.)
endif

rwildcard=$(wildcard $1$2) $(foreach d,$(wildcard $1*),$(call rwildcard,$d/,$2))

SHARED_SOURCES := $(call rwildcard,../../shared/,*)
AUTOCONFIG_SOURCES := $(call rwildcard,autoconfig/,*)
JS_SOURCES := $(call rwildcard,js/,*)
LOCALES_SOURCES := $(call rwildcard,locales/,*)
SOUNDS_SOURCES := $(call rwildcard,sounds/,*)
STYLE_SOURCES := $(call rwildcard,style/,*)
BUILD_SOURCES := $(call rwildcard,build/,*)

BUILD_DIR=../../build_stage/clock

.PHONY: all clean

all: $(BUILD_DIR)/js/startup.js
clean:
	rm -rf $(BUILD_DIR)

$(BUILD_DIR)/js/startup.js: manifest.webapp index.html onring.html $(AUTOCONFIG_SOURCES) $(JS_SOURCES) $(LOCALES_SOURCES) $(SOUNDS_SOURCES) $(STYLE_SOURCES) $(SHARED_SOURCES) $(BUILD_SOURCES)
	@rm -rf $(BUILD_DIR)
	@mkdir -p $(BUILD_DIR)
	cp -rp ../../shared $(BUILD_DIR)/shared
	$(XULRUNNERSDK) $(XPCSHELLSDK) ../../build/r.js -o build/require_config.jslike
	@rm -rf $(BUILD_DIR)/build
	@rm $(BUILD_DIR)/gaia_build.json
	@rm $(BUILD_DIR)/build.txt
	@rm -rf $(BUILD_DIR)/Makefile
	@rm $(BUILD_DIR)/README.md
	@rm -rf $(BUILD_DIR)/test
	$(XULRUNNERSDK) $(XPCSHELLSDK) build/make_gaia_shared.js
