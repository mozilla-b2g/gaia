#include "dtrace_provider.h"
#include <v8.h>

#include <node.h>
#include <stdio.h>

namespace node {

  using namespace v8;

  DTraceProvider::DTraceProvider() : ObjectWrap() {
    provider = NULL;
  }
  
  DTraceProvider::~DTraceProvider() {
    usdt_provider_disable(provider);
    usdt_provider_free(provider);
  }

  Persistent<FunctionTemplate> DTraceProvider::constructor_template;
  
  void DTraceProvider::Initialize(Handle<Object> target) {
    HandleScope scope;

    Local<FunctionTemplate> t = FunctionTemplate::New(DTraceProvider::New);
    constructor_template = Persistent<FunctionTemplate>::New(t);
    constructor_template->InstanceTemplate()->SetInternalFieldCount(1);
    constructor_template->SetClassName(String::NewSymbol("DTraceProvider"));

    NODE_SET_PROTOTYPE_METHOD(constructor_template, "addProbe", DTraceProvider::AddProbe);
    NODE_SET_PROTOTYPE_METHOD(constructor_template, "removeProbe", DTraceProvider::RemoveProbe);
    NODE_SET_PROTOTYPE_METHOD(constructor_template, "enable", DTraceProvider::Enable);
    NODE_SET_PROTOTYPE_METHOD(constructor_template, "disable", DTraceProvider::Disable);
    NODE_SET_PROTOTYPE_METHOD(constructor_template, "fire", DTraceProvider::Fire);

    target->Set(String::NewSymbol("DTraceProvider"), constructor_template->GetFunction());

    DTraceProbe::Initialize(target);
  }

  Handle<Value> DTraceProvider::New(const Arguments& args) {
    HandleScope scope;
    DTraceProvider *p = new DTraceProvider();
    char module[128];

    p->Wrap(args.This());

    if (args.Length() < 1 || !args[0]->IsString()) {
      return ThrowException(Exception::Error(String::New(
        "Must give provider name as argument")));
    }

    String::AsciiValue name(args[0]->ToString());

    if (args.Length() == 2) {
      if (!args[1]->IsString()) {
        return ThrowException(Exception::Error(String::New(
          "Must give module name as argument")));
      }

      String::AsciiValue mod(args[1]->ToString());
      (void) snprintf(module, sizeof (module), "%s", *mod);
    } else if (args.Length() == 1) {
      // If no module name is provided, develop a synthetic module name based
      // on our address
      (void) snprintf(module, sizeof (module), "mod-%p", p);
    } else {
      return ThrowException(Exception::Error(String::New(
        "Expected only provider name and module as arguments")));
    }

    if ((p->provider = usdt_create_provider(*name, module)) == NULL) {
      return ThrowException(Exception::Error(String::New(
        "usdt_create_provider failed")));
    }

    return args.This();
  }

  Handle<Value> DTraceProvider::AddProbe(const Arguments& args) {
    HandleScope scope;
    const char *types[USDT_ARG_MAX];

    Handle<Object> obj = args.Holder();
    DTraceProvider *provider = ObjectWrap::Unwrap<DTraceProvider>(obj);

    // create a DTraceProbe object
    Handle<Function> klass = DTraceProbe::constructor_template->GetFunction();
    Handle<Object> pd = Local<Object>::New(klass->NewInstance());

    // store in provider object
    DTraceProbe *probe = ObjectWrap::Unwrap<DTraceProbe>(pd->ToObject());
    obj->Set(args[0]->ToString(), pd);

    // add probe to provider
    for (int i = 0; i < USDT_ARG_MAX; i++) {
      if (i < args.Length() - 1) {
        String::AsciiValue type(args[i + 1]->ToString());

        if (strncmp("json", *type, 4) == 0)
          probe->arguments[i] = new DTraceJsonArgument();
        else if (strncmp("char *", *type, 6) == 0)
          probe->arguments[i] = new DTraceStringArgument();
        else if (strncmp("int", *type, 3) == 0)
          probe->arguments[i] = new DTraceIntegerArgument();
        else
          probe->arguments[i] = new DTraceStringArgument();

        types[i] = strdup(probe->arguments[i]->Type());
        probe->argc++;
      }
    }

    String::AsciiValue name(args[0]->ToString());
    probe->probedef = usdt_create_probe(*name, *name, probe->argc, types);
    usdt_provider_add_probe(provider->provider, probe->probedef);

    for (size_t i = 0; i < probe->argc; i++) {
      free((char *)types[i]);
    }

    return pd;
  }

  Handle<Value> DTraceProvider::RemoveProbe(const Arguments& args) {
    HandleScope scope;

    Handle<Object> provider_obj = args.Holder();
    DTraceProvider *provider = ObjectWrap::Unwrap<DTraceProvider>(provider_obj);

    Handle<Object> probe_obj = Local<Object>::Cast(args[0]);
    DTraceProbe *probe = ObjectWrap::Unwrap<DTraceProbe>(probe_obj);

    Handle<String> name = String::New(probe->probedef->name);
    provider_obj->Delete(name);

    if (usdt_provider_remove_probe(provider->provider, probe->probedef) != 0)
      return ThrowException(Exception::Error(String::New(usdt_errstr(provider->provider))));

    return True();
  }

  Handle<Value> DTraceProvider::Enable(const Arguments& args) {
    HandleScope scope;
    DTraceProvider *provider = ObjectWrap::Unwrap<DTraceProvider>(args.Holder());

    if (usdt_provider_enable(provider->provider) != 0)
      return ThrowException(Exception::Error(String::New(usdt_errstr(provider->provider))));

    return Undefined();
  }

  Handle<Value> DTraceProvider::Disable(const Arguments& args) {
    HandleScope scope;
    DTraceProvider *provider = ObjectWrap::Unwrap<DTraceProvider>(args.Holder());

    if (usdt_provider_disable(provider->provider) != 0)
      return ThrowException(Exception::Error(String::New(usdt_errstr(provider->provider))));

    return Undefined();
  }

  Handle<Value> DTraceProvider::Fire(const Arguments& args) {
    HandleScope scope;

    if (!args[0]->IsString()) {
      return ThrowException(Exception::Error(String::New(
        "Must give probe name as first argument")));
    }

    if (!args[1]->IsFunction()) {
      return ThrowException(Exception::Error(String::New(
        "Must give probe value callback as second argument")));
    }

    Handle<Object> provider = args.Holder();
    Handle<Object> probe = Local<Object>::Cast(provider->Get(args[0]));

    DTraceProbe *p = ObjectWrap::Unwrap<DTraceProbe>(probe);
    if (p == NULL)
      return Undefined();

    p->_fire(args[1]);

    return True();
  }

  extern "C" void
  init(Handle<Object> target) {
    DTraceProvider::Initialize(target);
  }

  NODE_MODULE(DTraceProviderBindings, init)
} // namespace node
