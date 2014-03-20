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
  echo "run-js-command $1 `test -n \"$(2)\" && basename $(2)`"; \
  $(XULRUNNERSDK) $(XPCSHELLSDK) \
    -f "$(GAIA_DIR)/build/xpcshell-commonjs.js" \
    -e "run('$(strip $1)', '$(2)');"
endef

define run-node-command
  echo "run-node-command $1";
  node --harmony -e \
  "require('./build/$(strip $1).js').execute($(BUILD_CONFIG))"
endef

define clean-build-files
  rm -rf "$(1)/Makefile" "$(1)/build" "$(1)/build.txt" "$(1)/test" "$(1)/README.md"
endef
