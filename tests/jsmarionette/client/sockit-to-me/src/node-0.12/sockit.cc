// Global includes
#include <node.h>
#include <node_buffer.h>

// Platform dependent includes.
#include <errno.h>
#include <unistd.h>
#include <string.h>
#include <fcntl.h>
#include <poll.h>

#include <sys/ioctl.h>
#include <sys/socket.h>
#include <sys/types.h>

#include <arpa/inet.h>
#include <netdb.h>

// Local includes
#include "sockit.h"

// So we don't spend half the time typing 'v8::'
using namespace v8;

// Error Messages
#define E_ALREADY_CONNECTING \
  "ALREADY CONNECTING! You must call close before calling connect again."
#define E_ALREADY_CONNECTED \
  "ALREADY CONNECTED! You must call close before calling connect again."

// Clever constants
static const int    MAX_LOOKUP_RETRIES = 3;
static const int    POLL_TIMEOUT_MS = 60000;

// Global for debug log enable/disable at runtime.
static bool gDebugLog = false;

Persistent<Function> Sockit::constructor;

static void _debug_log(const char *aMsg) {
  if(gDebugLog) {
    fprintf(stderr, "[sockit-to-me] ");
    fprintf(stderr, aMsg);
    fprintf(stderr, "\n");
  }
}

Sockit::Sockit() : mSocket(0),
                   mPollTimeout(POLL_TIMEOUT_MS),
                   mIsConnecting(false),
                   mIsConnected(false) {

}

Sockit::~Sockit() {
  // Close our socket if it's still open.
  if(mSocket != 0) {
    // XXXAus: We should probably report error on close.
    close(mSocket);
  }
}

/*static*/ void
Sockit::Init(Handle<Object> aExports) {
  Isolate* isolate = Isolate::GetCurrent();

  Local<FunctionTemplate> object = FunctionTemplate::New(isolate, New);
  // Set the classname our object will have in JavaScript land.
  object->SetClassName(String::NewFromUtf8(isolate, "Sockit"));

  // Reserve space for our object instance.
  object->InstanceTemplate()->SetInternalFieldCount(1);

  // Add the 'Connect' function.
  NODE_SET_PROTOTYPE_METHOD(object, "connect", Connect);
  // Add the 'Read' function.
  NODE_SET_PROTOTYPE_METHOD(object, "read", Read);
  // Add the 'Write' function.
  NODE_SET_PROTOTYPE_METHOD(object, "write", Write);
  // Add the 'Close' function.
  NODE_SET_PROTOTYPE_METHOD(object, "close", Close);
  // Add the 'SetPollTimeout' function.
  NODE_SET_PROTOTYPE_METHOD(object, "setPollTimeout", SetPollTimeout);
  // Add the 'SetDebugLog' function.
  NODE_SET_PROTOTYPE_METHOD(object, "setDebugLog", SetDebugLog);

  // Add the constructor.
  constructor.Reset(isolate, object->GetFunction());
  aExports->Set(String::NewFromUtf8(isolate, "Sockit"),
                object->GetFunction());
}

/*static*/ void
Sockit::New(const FunctionCallbackInfo<Value>& aArgs) {
  Isolate* isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);

  if (aArgs.IsConstructCall()) {
    Sockit* sockit = new Sockit();
    sockit->Wrap(aArgs.This());
    aArgs.GetReturnValue().Set(aArgs.This());
  }
  else {
    const int argc = 0;
    Local<Value> argv[argc] = { };
    Local<Function> cons = Local<Function>::New(isolate, constructor);
    aArgs.GetReturnValue().Set(cons->NewInstance(argc, argv));
  }
}

/*static*/ void
Sockit::Connect(const FunctionCallbackInfo<Value>& aArgs) {
  Isolate* isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);

  // Always return self.
  aArgs.GetReturnValue().Set(aArgs.This());

  if(aArgs.Length() < 1) {
    isolate->ThrowException(
        Exception::TypeError(String::NewFromUtf8(isolate,
                                                 "Not enough arguments.")));
    return;
  }

  if(aArgs.Length() > 1) {
    isolate->ThrowException(
        Exception::TypeError(String::NewFromUtf8(isolate,
                                                 "Too many arguments.")));
    return;
  }

  if(!aArgs[0]->IsObject()) {
    isolate->ThrowException(
        Exception::TypeError(
            String::NewFromUtf8(isolate,
                                "Invalid argument. Must be an Object.")));
    return;
  }

  Local<Object> options = aArgs[0]->ToObject();

  Local<String> hostKey = String::NewFromUtf8(isolate, "host");
  Local<String> portKey = String::NewFromUtf8(isolate, "port");

  if(!options->Has(hostKey) ||
     !options->Get(hostKey)->IsString()) {
    isolate->ThrowException(
        Exception::TypeError(
            String::NewFromUtf8(
              isolate,
              "Object must have 'host' field and it must be a string.")));
    return;
  }

  if(!options->Has(portKey) ||
     !options->Get(portKey)->IsNumber()) {
    isolate->ThrowException(
        Exception::TypeError(
            String::NewFromUtf8(
              isolate,
              "Object must have 'port' field and it must be a number.")));
    return;
  }

  Sockit *sockit = ObjectWrap::Unwrap<Sockit>(aArgs.Holder());

  // Ensure we're not already attempting to connect.
  if(sockit->mIsConnecting) {
    _debug_log(E_ALREADY_CONNECTING);
    isolate->ThrowException(
        Exception::Error(String::NewFromUtf8(isolate, E_ALREADY_CONNECTING)));
    return;
  }

  // Ensure we're not already connected.
  if(sockit->mIsConnected) {
    _debug_log(E_ALREADY_CONNECTED);
    isolate->ThrowException(
        Exception::Error(String::NewFromUtf8(isolate, E_ALREADY_CONNECTED)));
    return;
  }

  // We can consider ourselves in an attempt to connect at this point.
  sockit->mIsConnecting = true;

  // XXXAus: Move the DNS piece into it's own method.

  String::Utf8Value optionsHost(options->Get(hostKey)->ToString());

  bool shouldRetry = false;
  int  retryCount = 0;
  struct hostent *hostEntry;

  do {
    hostEntry = gethostbyname(*optionsHost);

    // Getting the host address failed. Let's see why.
    if(hostEntry == NULL) {
      // Check h_errno, we might retry if the error indicates we should.
      switch(h_errno) {
        case HOST_NOT_FOUND:
          isolate->ThrowException(
              Exception::Error(String::NewFromUtf8(isolate,
                                                   "Couldn't resolve host.")));
          return;
        break;

        case NO_RECOVERY:
          isolate->ThrowException(
              Exception::Error(
                  String::NewFromUtf8(isolate,
                                      "Unexpected failure during host lookup.")));
          return;
        break;

        case NO_DATA:
          isolate->ThrowException(
              Exception::Error(String::NewFromUtf8(isolate,
                                                   "Host exists but has no address.")));
          return;
        break;

        case TRY_AGAIN:
          shouldRetry = true;
          retryCount++;
        break;
      }
    }
  }
  while(shouldRetry && retryCount <= MAX_LOOKUP_RETRIES);

  if(hostEntry == NULL) {
    isolate->ThrowException(
        Exception::Error(String::NewFromUtf8(isolate,
                                             "Couldn't resolve host even after retries.")));
    return;
  }

  int socketHandle = socket(PF_INET, SOCK_STREAM, IPPROTO_TCP);
  if(socketHandle < 0) {
    isolate->ThrowException(
        Exception::Error(String::NewFromUtf8(isolate, "Failed to create socket.")));
    return;
  }

  sockit->mSocket = socketHandle;

  // Set socket non-blocking prior to connect. We'll poll for connect success.
  int flags = fcntl(socketHandle, F_GETFL, 0);
  if(flags == -1) {
    flags = 0;
  }
  int result = fcntl(socketHandle, F_SETFL, flags | O_NONBLOCK);
  if(result < 0) {
    isolate->ThrowException(
        Exception::Error(
            String::NewFromUtf8(isolate, "Failed to set non blocking to socket.")));
    return;
  }

  // Magic socket incantation.
  struct sockaddr_in address;
  memset(&address, 0, sizeof(address));
  address.sin_family = AF_INET;
  // Always use first address returned, it's good enough for our purposes.
  address.sin_addr.s_addr =
      inet_addr(inet_ntoa(*(struct in_addr *)hostEntry->h_addr_list[0]));
  // Using static cast here to enforce short as required by IPv4 functions.
  address.sin_port =
      htons(static_cast<short>(options->Get(portKey)->ToNumber()->Uint32Value()));

  result = connect(
      sockit->mSocket, (sockaddr *) &address, sizeof(struct sockaddr)
    );

  if(result == -1 && errno != EINPROGRESS) {
    // We failed to connect. Close to socket we created.
    close(sockit->mSocket);
    // In case there's another connect attempt, clean up the socket data.
    sockit->mSocket = 0;
    sockit->mIsConnecting = false;
    // Report failure to connect.
    isolate->ThrowException(
        Exception::Error(String::NewFromUtf8(isolate, "Failed to connect.")));
    return;
  }

  struct pollfd fds;
  fds.fd = sockit->mSocket;
  fds.events = POLLWRBAND | POLLWRNORM | POLLNVAL;
  fds.revents = 0;

  result = poll(&fds, 1, sockit->mPollTimeout);

  // If we've failed, we'll clean-up and try and send an exception.
  if(result != 1) {
    // Close and clean-up.
    close(sockit->mSocket);
    sockit->mSocket = 0;
    sockit->mIsConnecting = false;
    sockit->mIsConnected = false;

    if(result == 0) {
      isolate->ThrowException(
          Exception::Error(
              String::NewFromUtf8(isolate, "Polling socket connect() timeout!")));
    }
    else if(result < 0 || (fds.revents & POLLERR)) {
      isolate->ThrowException(
          Exception::Error(
              String::NewFromUtf8(isolate, "Error polling connect() socket!")));
    }
    else if(!((fds.revents & POLLWRBAND) || (fds.revents & POLLWRNORM)) ) {
      isolate->ThrowException(
          Exception::Error(
              String::NewFromUtf8(isolate, "Unhandled poll event connect() socket!")));
    }

    return;
  }

  // Otherwise, we're really connected.
  sockit->mIsConnected = true;
  // And we're no longer attempting to connect.
  sockit->mIsConnecting = false;
}

/*static*/ void
Sockit::Read(const FunctionCallbackInfo<Value>& aArgs) {
  Isolate* isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);

  // Default to returning undefined
  aArgs.GetReturnValue().Set(Undefined(isolate));

  if(aArgs.Length() != 1) {
    isolate->ThrowException(
        Exception::TypeError(
            String::NewFromUtf8(
                isolate,
                "Not enough arguments, read takes the number of bytes to be read from the socket.")));
    return;
  }

  if(!aArgs[0]->IsNumber()) {
    isolate->ThrowException(
        Exception::TypeError(String::NewFromUtf8(isolate,
                                                 "Argument must be a Number.")));
    return;
  }

  Sockit *sockit = ObjectWrap::Unwrap<Sockit>(aArgs.Holder());

  // Make sure we're connected to something.
  if(sockit->mSocket == 0) {
    isolate->ThrowException(
        Exception::Error(
            String::NewFromUtf8(
                isolate,
                "Not connected. To read data you must call connect first.")));
    return;
  }

  // Figure out how many bytes the user wants us to read from the socket.
  unsigned int bytesToRead = aArgs[0]->ToNumber()->Uint32Value();
  // Allocate a shiny buffer.
  char *buffer = new char[bytesToRead];
  // Track how many bytes we've read and total bytes read.
  int totalBytesRead = 0;
  int bytesRead = 0;
  // Read me some tasty bytes!
  struct pollfd fds;
  fds.fd = sockit->mSocket;
  fds.events = POLLIN;

  do {
    fds.revents = 0;

    int result = poll(&fds, 1, sockit->mPollTimeout);
    if(result == 0) {
      isolate->ThrowException(
          Exception::Error(String::NewFromUtf8(isolate,
                                               "Polling socket recv() timeout!")));
      break;
    }
    else if(result < 0 || (fds.revents & POLLERR)) {
      isolate->ThrowException(
          Exception::Error(String::NewFromUtf8(isolate,
                                               "Error polling recv() socket!")));
      break;
    }
    else if(!(fds.revents & POLLIN)) {
      isolate->ThrowException(
          Exception::Error(String::NewFromUtf8(isolate,
                                               "Unhandled poll event recv() socket!")));
      break;
    }
    bytesRead = recv(sockit->mSocket, &buffer[totalBytesRead], bytesToRead, 0);

    if(bytesRead < 0) {

      if(errno == EAGAIN || errno == EWOULDBLOCK) {
        continue;
      }

      isolate->ThrowException(
          Exception::Error(
              String::NewFromUtf8(isolate,
                                  "Error while reading from socket!")));
      break;
    }
    if(bytesRead == 0) {
      isolate->ThrowException(
          Exception::Error(String::NewFromUtf8(isolate,
                                               "Connection reset by peer!")));
      break;
    }

    bytesToRead -= bytesRead;
    totalBytesRead += bytesRead;

    bytesRead = 0;
  }
  while(bytesToRead > 0);

  if(totalBytesRead) {
    // Create a node heap allocated buffer first.
    Local<Object> heapBuffer = node::Buffer::New(totalBytesRead);
    // Copy our temporary buffer data into the heap buffer.
    memcpy(node::Buffer::Data(heapBuffer), buffer, totalBytesRead);
    // Done with our temporary buffer.
    delete [] buffer;
    // Return those tasty bytes!
    aArgs.GetReturnValue().Set(heapBuffer);
    return;
  }

  // Done with our temporary buffer.
  delete [] buffer;

  // Return NULL!
  aArgs.GetReturnValue().Set(Null(isolate));
  return;
}

/*static*/ void
Sockit::Write(const FunctionCallbackInfo<Value>& aArgs) {
  Isolate* isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);

  if(aArgs.Length() < 1) {
    isolate->ThrowException(
        Exception::TypeError(String::NewFromUtf8(isolate,
                                                 "Not enough arguments.")));
    return;
  }

  if(aArgs.Length() > 1) {
    isolate->ThrowException(
        Exception::TypeError(
            String::NewFromUtf8(isolate,
                                "Too many arguments.")));
    return;
  }

  Sockit *sockit = ObjectWrap::Unwrap<Sockit>(aArgs.Holder());

  // Always return self even when we throw.
  aArgs.GetReturnValue().Set(aArgs.This());

  // Make sure we're connected to something.
  if(sockit->mSocket == 0) {
    isolate->ThrowException(
        Exception::Error(
            String::NewFromUtf8(
                isolate,
                "Not connected. To write data you must call connect first.")));
    return;
  }

  int success = 0;

  if(aArgs[0]->IsString()) {
    // Convert to utf8 value before sending.
    Local<String> dataString = aArgs[0]->ToString();
    String::Utf8Value data(dataString);
    // Write the data to the socket.
    success = sockit->Write(*data, dataString->Utf8Length());
  }
  else if(aArgs[0]->IsObject() &&
          aArgs[0]->ToObject()->GetConstructorName()->Equals(String::NewFromUtf8(isolate, "Buffer"))) {
    Local<Object> buffer = aArgs[0]->ToObject();
    success =
        sockit->Write(node::Buffer::Data(buffer), node::Buffer::Length(buffer));
  }
  else {
    isolate->ThrowException(
        Exception::TypeError(
            String::NewFromUtf8(isolate,
                                "Invalid argument, must be a 'String' or 'Buffer' object.")));
    return;
  }

  if(success < 0) {
    isolate->ThrowException(
        Exception::Error(String::NewFromUtf8(isolate,
                                             "Unable to write data to socket.")));
  }

  return;
}

int
Sockit::Write(const char *aBuffer, const int aLength) {

  int bytesToWrite = aLength;
  int totalBytesWritten = 0;
  int bytesWritten = 0;

  do {
    bytesWritten =
        send(mSocket,
             aBuffer + (totalBytesWritten * sizeof(char)),
             bytesToWrite,
             0
            );

    if(bytesWritten < 0) {
      return -1;
    }

    totalBytesWritten += bytesWritten;
    bytesToWrite -= bytesWritten;

    bytesWritten = 0;
  }
  while(bytesToWrite > 0);

  return totalBytesWritten;
}

/*static*/ void
Sockit::Close(const FunctionCallbackInfo<Value>& aArgs) {
  Isolate* isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);

  Sockit *sockit = ObjectWrap::Unwrap<Sockit>(aArgs.Holder());
  if(sockit->mSocket != 0) {
    // If close fails we have bigger problems on our hands than a stale
    // socket that isn't closed.
    close(sockit->mSocket);
  }

  sockit->mSocket = 0;
  sockit->mIsConnecting = false;
  sockit->mIsConnected = false;

  aArgs.GetReturnValue().Set(aArgs.This());
  return;
}

/*static*/ void
Sockit::SetPollTimeout(const FunctionCallbackInfo<Value>& aArgs) {
  Isolate* isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);

  if(aArgs.Length() < 1) {
    isolate->ThrowException(
        Exception::TypeError(String::NewFromUtf8(isolate,
                                                 "Not enough arguments.")));
    return;
  }

  if(aArgs.Length() > 1) {
    isolate->ThrowException(
        Exception::TypeError(String::NewFromUtf8(isolate,
                                                 "Too many arguments.")));
    return;
  }

  if(!aArgs[0]->IsNumber()) {
    isolate->ThrowException(
        Exception::TypeError(String::NewFromUtf8(isolate,
                                                 "Argument is not a number.")));
    return;
  }

  Sockit *sockit = ObjectWrap::Unwrap<Sockit>(aArgs.Holder());
  sockit->mPollTimeout = aArgs[0]->Int32Value();

  aArgs.GetReturnValue().Set(aArgs.This());
  return;
}

/*static*/ void
Sockit::SetDebugLog(const FunctionCallbackInfo<Value>& aArgs) {
  Isolate* isolate = Isolate::GetCurrent();
  HandleScope scope(isolate);

  if(aArgs.Length() < 1) {
    isolate->ThrowException(
        Exception::TypeError(String::NewFromUtf8(isolate,
                                                 "Not enough arguments.")));
    return;
  }

  if(aArgs.Length() > 1) {
    isolate->ThrowException(
        Exception::TypeError(String::NewFromUtf8(isolate,
                                                 "Too many arguments.")));
    return;
  }

  if(!aArgs[0]->IsBoolean()) {
    isolate->ThrowException(
        Exception::TypeError(String::NewFromUtf8(isolate,
                                                 "Argument is not a boolean.")));
    return;
  }

  gDebugLog = aArgs[0]->BooleanValue();

  if(gDebugLog) {
    _debug_log("debug log enabled");
  }

  aArgs.GetReturnValue().Set(aArgs.This());
  return;
}
