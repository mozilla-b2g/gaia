ifdef XPCSHELLSDK
	JS_RUN_ENVIRONMENT := $(XULRUNNERSDK) $(XPCSHELLSDK)
endif

ifndef JS_RUN_ENVIRONMENT
  $(info XPCShell not available. Fall back to Node JS)
  NODEJS := $(shell which node)
  JS_RUN_ENVIRONMENT := $(NODEJS)
endif

rwildcard=$(wildcard $1$2) $(foreach d,$(wildcard $1*),$(call rwildcard,$d/,$2))

SHARED_SOURCES := $(call rwildcard,../../shared/,*)
JS_SOURCES := $(call rwildcard,js/,*)
LOCALES_SOURCES := $(call rwildcard,locales/,*)
RESOURCES_SOURCES := $(call rwildcard,resources/,*)
STYLE_SOURCES := $(call rwildcard,style/,*)
BUILD_SOURCES := $(call rwildcard,build/,*)

BUILD_DIR=../../build_stage/camera

.PHONY: all clean

all: js_environment_available camera_configuration $(BUILD_DIR)/js/main.js

clean:
	rm -rf $(BUILD_DIR)

$(BUILD_DIR)/js/main.js: manifest.webapp index.html $(SHARED_SOURCES) $(JS_SOURCES) $(LOCALES_SOURCES) $(RESOURCES_SOURCES) $(STYLE_SOURCES) $(BUILD_SOURCES)
	@rm -rf $(BUILD_DIR)
	@mkdir -p $(BUILD_DIR)
	cp -rp ../../shared $(BUILD_DIR)/shared
	$(JS_RUN_ENVIRONMENT) ../../build/r.js -o build/require_config.jslike

js_environment_available:
ifndef JS_RUN_ENVIRONMENT
  $(error Environment to run r.js is not available. Please Install NodeJS -- (use aptitude on linux or homebrew on osx))
endif

camera_configuration:
	@test -x "$(NODEJS)" && $(NODEJS) build/configure.js || true
