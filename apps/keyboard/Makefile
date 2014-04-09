-include $(PWD)/build/common.mk


.PHONY: all clean
all: clean
	@echo Building keyboard app to build_stage...
	@$(call run-js-command,app/build)
clean:
	@rm -rf $(STAGE_APP_DIR)
