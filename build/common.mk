APP_DIR := $(CURDIR)

ifneq (,$(findstring MINGW32_,$(SYS)))
APP_DIR:=$(shell pwd -W | sed -e 's|/|\\\\|g')
endif

export APP_DIR

define run-build-test
  ./node_modules/.bin/mocha \
    --harmony \
    --reporter spec \
    --ui tdd \
    --timeout 0 \
    $(strip $1)
endef

# rwildcard is used to recursive wildcard, it will travel all files in
# directory by argument 1 and filter by argument 2
#
# Usage: $(rwildcard, DIR, FILTER)
rwildcard=$(wildcard $1$2) $(foreach d,$(wildcard $1*),$(call rwildcard,$d/,$2))

define run-js-command
  echo "run-js-command $1 `test -n \"$APP_DIR\" && basename $APP_DIR`"; \
  $(XULRUNNERSDK) $(XPCSHELLSDK) \
    -f "$(GAIA_DIR)/build/xpcshell-commonjs.js" \
    -e "run('$(strip $1)');"
endef

define run-node-command
  echo "run-node-command $1";
  node --harmony -e \
  "require('./build/$(strip $1).js').execute($(BUILD_CONFIG))"
endef

define clean-build-files
  rm -rf "$(1)$(SEP)Makefile" "$(1)$(SEP)build" "$(1)$(SEP)build.txt" "$(1)$(SEP)test" "$(1)$(SEP)README.md"
endef
