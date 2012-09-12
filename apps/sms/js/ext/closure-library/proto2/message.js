// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Protocol Buffer Message base class.
 */

goog.provide('goog.proto2.Message');

goog.require('goog.proto2.Descriptor');
goog.require('goog.proto2.FieldDescriptor');
goog.require('goog.proto2.Util');
goog.require('goog.string');



/**
 * Abstract base class for all Protocol Buffer 2 messages. It will be
 * subclassed in the code generated by the Protocol Compiler. Any other
 * subclasses are prohibited.
 * @constructor
 */
goog.proto2.Message = function() {
  /**
   * Stores the field values in this message. Keyed by the tag of the fields.
   * @type {*}
   * @private
   */
  this.values_ = {};

  // The descriptor_ is static to the message function that is being created.
  // Therefore, we retrieve it via the constructor.

  /**
   * Stores the information (i.e. metadata) about this message.
   * @type {!goog.proto2.Descriptor}
   * @private
   */
  this.descriptor_ = this.constructor.descriptor_;

  /**
   * Stores the field information (i.e. metadata) about this message.
   * @type {Object.<number, !goog.proto2.FieldDescriptor>}
   * @private
   */
  this.fields_ = this.descriptor_.getFieldsMap();

  /**
   * The lazy deserializer for this message instance, if any.
   * @type {goog.proto2.LazyDeserializer}
   * @private
   */
  this.lazyDeserializer_ = null;

  /**
   * A map of those fields deserialized, from tag number to their deserialized
   * value.
   * @type {Object}
   * @private
   */
  this.deserializedFields_ = null;
};


/**
 * An enumeration defining the possible field types.
 * Should be a mirror of that defined in descriptor.h.
 *
 * TODO(user): Remove this alias.  The code generator generates code that
 * references this enum, so it needs to exist until the code generator is
 * changed.  The enum was moved to from Message to FieldDescriptor to avoid a
 * dependency cycle.
 *
 * Use goog.proto2.FieldDescriptor.FieldType instead.
 *
 * @enum {number}
 */
goog.proto2.Message.FieldType = {
  DOUBLE: 1,
  FLOAT: 2,
  INT64: 3,
  UINT64: 4,
  INT32: 5,
  FIXED64: 6,
  FIXED32: 7,
  BOOL: 8,
  STRING: 9,
  GROUP: 10,
  MESSAGE: 11,
  BYTES: 12,
  UINT32: 13,
  ENUM: 14,
  SFIXED32: 15,
  SFIXED64: 16,
  SINT32: 17,
  SINT64: 18
};


/**
 * Initializes the message with a lazy deserializer and its associated data.
 * This method should be called by internal methods ONLY.
 *
 * @param {goog.proto2.LazyDeserializer} deserializer The lazy deserializer to
 *   use to decode the data on the fly.
 *
 * @param {*} data The data to decode/deserialize.
 */
goog.proto2.Message.prototype.initializeForLazyDeserializer = function(
    deserializer, data) {

  this.lazyDeserializer_ = deserializer;
  this.values_ = data;
  this.deserializedFields_ = {};
};


/**
 * Sets the value of an unknown field, by tag.
 *
 * @param {number} tag The tag of an unknown field (must be >= 1).
 * @param {*} value The value for that unknown field.
 */
goog.proto2.Message.prototype.setUnknown = function(tag, value) {
  goog.proto2.Util.assert(!this.fields_[tag],
                          'Field is not unknown in this message');

  goog.proto2.Util.assert(tag >= 1, 'Tag is not valid');
  goog.proto2.Util.assert(value !== null, 'Value cannot be null');

  this.values_[tag] = value;
  if (this.deserializedFields_) {
    delete this.deserializedFields_[tag];
  }
};


/**
 * Iterates over all the unknown fields in the message.
 *
 * @param {function(number, *)} callback A callback method
 *     which gets invoked for each unknown field.
 * @param {Object=} opt_scope The scope under which to execute the callback.
 *     If not given, the current message will be used.
 */
goog.proto2.Message.prototype.forEachUnknown = function(callback, opt_scope) {
  var scope = opt_scope || this;
  for (var key in this.values_) {
    if (!this.fields_[/** @type {number} */ (key)]) {
      callback.call(scope, Number(key), this.values_[key]);
    }
  }
};


/**
 * Returns the descriptor which describes the current message.
 *
 * @return {goog.proto2.Descriptor} The descriptor.
 */
goog.proto2.Message.prototype.getDescriptor = function() {
  return this.descriptor_;
};


/**
 * Returns whether there is a value stored at the field specified by the
 * given field descriptor.
 *
 * @param {goog.proto2.FieldDescriptor} field The field for which to check
 *     if there is a value.
 *
 * @return {boolean} True if a value was found.
 */
goog.proto2.Message.prototype.has = function(field) {
  goog.proto2.Util.assert(
      field.getContainingType() == this.descriptor_,
      'The current message does not contain the given field');

  return this.has$Value(field.getTag());
};


/**
 * Returns the array of values found for the given repeated field.
 *
 * @param {goog.proto2.FieldDescriptor} field The field for which to
 *     return the values.
 *
 * @return {!Array} The values found.
 */
goog.proto2.Message.prototype.arrayOf = function(field) {
  goog.proto2.Util.assert(
      field.getContainingType() == this.descriptor_,
      'The current message does not contain the given field');

  return this.array$Values(field.getTag());
};


/**
 * Returns the number of values stored in the given field.
 *
 * @param {goog.proto2.FieldDescriptor} field The field for which to count
 *     the number of values.
 *
 * @return {number} The count of the values in the given field.
 */
goog.proto2.Message.prototype.countOf = function(field) {
  goog.proto2.Util.assert(
      field.getContainingType() == this.descriptor_,
      'The current message does not contain the given field');

  return this.count$Values(field.getTag());
};


/**
 * Returns the value stored at the field specified by the
 * given field descriptor.
 *
 * @param {goog.proto2.FieldDescriptor} field The field for which to get the
 *     value.
 * @param {number=} opt_index If the field is repeated, the index to use when
 *     looking up the value.
 *
 * @return {*} The value found or null if none.
 */
goog.proto2.Message.prototype.get = function(field, opt_index) {
  goog.proto2.Util.assert(
      field.getContainingType() == this.descriptor_,
      'The current message does not contain the given field');

  return this.get$Value(field.getTag(), opt_index);
};


/**
 * Returns the value stored at the field specified by the
 * given field descriptor or the default value if none exists.
 *
 * @param {goog.proto2.FieldDescriptor} field The field for which to get the
 *     value.
 * @param {number=} opt_index If the field is repeated, the index to use when
 *     looking up the value.
 *
 * @return {*} The value found or the default if none.
 */
goog.proto2.Message.prototype.getOrDefault = function(field, opt_index) {
  goog.proto2.Util.assert(
      field.getContainingType() == this.descriptor_,
      'The current message does not contain the given field');

  return this.get$ValueOrDefault(field.getTag(), opt_index);
};


/**
 * Stores the given value to the field specified by the
 * given field descriptor. Note that the field must not be repeated.
 *
 * @param {goog.proto2.FieldDescriptor} field The field for which to set
 *     the value.
 * @param {*} value The new value for the field.
 */
goog.proto2.Message.prototype.set = function(field, value) {
  goog.proto2.Util.assert(
      field.getContainingType() == this.descriptor_,
      'The current message does not contain the given field');

  this.set$Value(field.getTag(), value);
};


/**
 * Adds the given value to the field specified by the
 * given field descriptor. Note that the field must be repeated.
 *
 * @param {goog.proto2.FieldDescriptor} field The field in which to add the
 *     the value.
 * @param {*} value The new value to add to the field.
 */
goog.proto2.Message.prototype.add = function(field, value) {
  goog.proto2.Util.assert(
      field.getContainingType() == this.descriptor_,
      'The current message does not contain the given field');

  this.add$Value(field.getTag(), value);
};


/**
 * Clears the field specified.
 *
 * @param {goog.proto2.FieldDescriptor} field The field to clear.
 */
goog.proto2.Message.prototype.clear = function(field) {
  goog.proto2.Util.assert(
      field.getContainingType() == this.descriptor_,
      'The current message does not contain the given field');

  this.clear$Field(field.getTag());
};


/**
 * Compares this message with another one ignoring the unknown fields.
 * @param {*} other The other message.
 * @return {boolean} Whether they are equal. Returns false if the {@code other}
 *     argument is a different type of message or not a message.
 */
goog.proto2.Message.prototype.equals = function(other) {
  if (!other || this.constructor != other.constructor) {
    return false;
  }

  var fields = this.getDescriptor().getFields();
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    if (this.has(field) != other.has(field)) {
      return false;
    }

    if (this.has(field)) {
      var isComposite = field.isCompositeType();

      function fieldsEqual(value1, value2) {
        return isComposite ? value1.equals(value2) : value1 == value2;
      }

      var thisValue = this.getValueForField_(field);
      var otherValue = other.getValueForField_(field);

      if (field.isRepeated()) {
        // In this case thisValue and otherValue are arrays.
        if (thisValue.length != otherValue.length) {
          return false;
        }
        for (var j = 0; j < thisValue.length; j++) {
          if (!fieldsEqual(thisValue[j], otherValue[j])) {
            return false;
          }
        }
      } else if (!fieldsEqual(thisValue, otherValue)) {
        return false;
      }
    }
  }

  return true;
};


/**
 * Recursively copies the known fields from the given message to this message.
 * Removes the fields which are not present in the source message.
 * @param {!goog.proto2.Message} message The source message.
 */
goog.proto2.Message.prototype.copyFrom = function(message) {
  goog.proto2.Util.assert(this.constructor == message.constructor,
      'The source message must have the same type.');

  this.values_ = {};
  if (this.deserializedFields_) {
    this.deserializedFields_ = {};
  }
  this.mergeFrom(message);
};


/**
 * Merges the given message into this message.
 *
 * Singular fields will be overwritten, except for embedded messages which will
 * be merged. Repeated fields will be concatenated.
 * @param {!goog.proto2.Message} message The source message.
 */
goog.proto2.Message.prototype.mergeFrom = function(message) {
  goog.proto2.Util.assert(this.constructor == message.constructor,
      'The source message must have the same type.');
  var fields = this.getDescriptor().getFields();

  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    if (message.has(field)) {
      if (this.deserializedFields_) {
        delete this.deserializedFields_[field.getTag()];
      }

      var isComposite = field.isCompositeType();
      if (field.isRepeated()) {
        var values = message.arrayOf(field);
        for (var j = 0; j < values.length; j++) {
          this.add(field, isComposite ? values[j].clone() : values[j]);
        }
      } else {
        var value = message.getValueForField_(field);
        if (isComposite) {
          var child = this.getValueForField_(field);
          if (child) {
            child.mergeFrom(value);
          } else {
            this.set(field, value.clone());
          }
        } else {
          this.set(field, value);
        }
      }
    }
  }
};


/**
 * @return {!goog.proto2.Message} Recursive clone of the message only including
 *     the known fields.
 */
goog.proto2.Message.prototype.clone = function() {
  var clone = new this.constructor;
  clone.copyFrom(this);
  return clone;
};


/**
 * Fills in the protocol buffer with default values. Any fields that are
 * already set will not be overridden.
 * @param {boolean} simpleFieldsToo If true, all fields will be initialized;
 *     if false, only the nested messages and groups.
 */
goog.proto2.Message.prototype.initDefaults = function(simpleFieldsToo) {
  var fields = this.getDescriptor().getFields();
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    var tag = field.getTag();
    var isComposite = field.isCompositeType();

    // Initialize missing fields.
    if (!this.has(field) && !field.isRepeated()) {
      if (isComposite) {
        this.values_[tag] = new /** @type {Function} */ (field.getNativeType());
      } else if (simpleFieldsToo) {
        this.values_[tag] = field.getDefaultValue();
      }
    }

    // Fill in the existing composite fields recursively.
    if (isComposite) {
      if (field.isRepeated()) {
        var values = this.array$Values(tag);
        for (var j = 0; j < values.length; j++) {
          values[j].initDefaults(simpleFieldsToo);
        }
      } else {
        this.get$Value(tag).initDefaults(simpleFieldsToo);
      }
    }
  }
};


/**
 * Returns the field in this message by the given tag number. If no
 * such field exists, throws an exception.
 *
 * @param {number} tag The field's tag index.
 * @return {!goog.proto2.FieldDescriptor} The descriptor for the field.
 * @private
 */
goog.proto2.Message.prototype.getFieldByTag_ = function(tag) {
  goog.proto2.Util.assert(this.fields_[tag],
                          'No field found for the given tag');

  return this.fields_[tag];
};


/**
 * Returns the whether or not the field indicated by the given tag
 * has a value.
 *
 * GENERATED CODE USE ONLY. Basis of the has{Field} methods.
 *
 * @param {number} tag The tag.
 *
 * @return {boolean} Whether the message has a value for the field.
 */
goog.proto2.Message.prototype.has$Value = function(tag) {
  goog.proto2.Util.assert(this.fields_[tag],
                          'No field found for the given tag');

  return tag in this.values_ && goog.isDef(this.values_[tag]) &&
      this.values_[tag] !== null;
};


/**
 * Returns the value for the given field. If a lazy deserializer is
 * instantiated, lazily deserializes the field if required before returning the
 * value.
 *
 * @param {goog.proto2.FieldDescriptor} field The field.
 * @return {*} The field value, if any.
 * @private
 */
goog.proto2.Message.prototype.getValueForField_ = function(field) {
  // Retrieve the current value, which may still be serialized.
  var tag = field.getTag();
  if (!tag in this.values_) {
    return null;
  }

  var value = this.values_[tag];
  if (value == null) {
    return null;
  }

  // If we have a lazy deserializer, then ensure that the field is
  // properly deserialized.
  if (this.lazyDeserializer_) {
    // If the tag is not deserialized, then we must do so now. Deserialize
    // the field's value via the deserializer.
    if (!(tag in this.deserializedFields_)) {
      var deserializedValue = this.lazyDeserializer_.deserializeField(
          this, field, value);
      this.deserializedFields_[tag] = deserializedValue;
      return deserializedValue;
    }

    return this.deserializedFields_[tag];
  }

  // Otherwise, just return the value.
  return value;
};


/**
 * Gets the value at the field indicated by the given tag.
 *
 * GENERATED CODE USE ONLY. Basis of the get{Field} methods.
 *
 * @param {number} tag The field's tag index.
 * @param {number=} opt_index If the field is a repeated field, the index
 *     at which to get the value.
 *
 * @return {*} The value found or null for none.
 * @protected
 */
goog.proto2.Message.prototype.get$Value = function(tag, opt_index) {
  var field = this.getFieldByTag_(tag);
  var value = this.getValueForField_(field);

  if (field.isRepeated()) {
    goog.proto2.Util.assert(goog.isArray(value));

    var index = opt_index || 0;
    goog.proto2.Util.assert(index >= 0 && index < value.length,
        'Given index is out of bounds');

    return value[index];
  }

  goog.proto2.Util.assert(!goog.isArray(value));
  return value;
};


/**
 * Gets the value at the field indicated by the given tag or the default value
 * if none.
 *
 * GENERATED CODE USE ONLY. Basis of the get{Field} methods.
 *
 * @param {number} tag The field's tag index.
 * @param {number=} opt_index If the field is a repeated field, the index
 *     at which to get the value.
 *
 * @return {*} The value found or the default value if none set.
 * @protected
 */
goog.proto2.Message.prototype.get$ValueOrDefault = function(tag, opt_index) {

  if (!this.has$Value(tag)) {
    // Return the default value.
    var field = this.getFieldByTag_(tag);
    return field.getDefaultValue();
  }

  return this.get$Value(tag, opt_index);
};


/**
 * Gets the values at the field indicated by the given tag.
 *
 * GENERATED CODE USE ONLY. Basis of the {field}Array methods.
 *
 * @param {number} tag The field's tag index.
 *
 * @return {!Array} The values found. If none, returns an empty array.
 * @protected
 */
goog.proto2.Message.prototype.array$Values = function(tag) {
  goog.proto2.Util.assert(this.getFieldByTag_(tag).isRepeated(),
      'Cannot call fieldArray on a non-repeated field');
  var field = this.getFieldByTag_(tag);
  var value = this.getValueForField_(field);
  goog.proto2.Util.assert(value == null || goog.isArray(value));
  return (/** @type {Array} */value) || [];
};


/**
 * Returns the number of values stored in the field by the given tag.
 *
 * GENERATED CODE USE ONLY. Basis of the {field}Count methods.
 *
 * @param {number} tag The tag.
 *
 * @return {number} The number of values.
 * @protected
 */
goog.proto2.Message.prototype.count$Values = function(tag) {
  var field = this.getFieldByTag_(tag);

  if (field.isRepeated()) {
    if (this.has$Value(tag)) {
      goog.proto2.Util.assert(goog.isArray(this.values_[tag]));
    }

    return this.has$Value(tag) ? this.values_[tag].length : 0;
  } else {
    return this.has$Value(tag) ? 1 : 0;
  }
};


/**
 * Sets the value of the *non-repeating* field indicated by the given tag.
 *
 * GENERATED CODE USE ONLY. Basis of the set{Field} methods.
 *
 * @param {number} tag The field's tag index.
 * @param {*} value The field's value.
 * @protected
 */
goog.proto2.Message.prototype.set$Value = function(tag, value) {
  if (goog.proto2.Util.conductChecks()) {
    var field = this.getFieldByTag_(tag);

    goog.proto2.Util.assert(!field.isRepeated(),
                            'Cannot call set on a repeated field');

    this.checkFieldType_(field, value);
  }

  this.values_[tag] = value;
  if (this.deserializedFields_) {
    this.deserializedFields_[tag] = value;
  }
};


/**
 * Adds the value to the *repeating* field indicated by the given tag.
 *
 * GENERATED CODE USE ONLY. Basis of the add{Field} methods.
 *
 * @param {number} tag The field's tag index.
 * @param {*} value The value to add.
 * @protected
 */
goog.proto2.Message.prototype.add$Value = function(tag, value) {
  if (goog.proto2.Util.conductChecks()) {
    var field = this.getFieldByTag_(tag);

    goog.proto2.Util.assert(field.isRepeated(),
                            'Cannot call add on a non-repeated field');

    this.checkFieldType_(field, value);
  }

  if (!this.values_[tag]) {
    this.values_[tag] = [];
  }

  this.values_[tag].push(value);
  if (this.deserializedFields_) {
    delete this.deserializedFields_[tag];
  }
};


/**
 * Ensures that the value being assigned to the given field
 * is valid.
 *
 * @param {!goog.proto2.FieldDescriptor} field The field being assigned.
 * @param {*} value The value being assigned.
 * @private
 */
goog.proto2.Message.prototype.checkFieldType_ = function(field, value) {
  goog.proto2.Util.assert(value !== null);

  var nativeType = field.getNativeType();
  if (nativeType === String) {
    goog.proto2.Util.assert(typeof value === 'string',
                            'Expected value of type string');
  } else if (nativeType === Boolean) {
    goog.proto2.Util.assert(typeof value === 'boolean',
                            'Expected value of type boolean');
  } else if (nativeType === Number) {
    goog.proto2.Util.assert(typeof value === 'number',
                            'Expected value of type number');
  } else if (field.getFieldType() ==
             goog.proto2.FieldDescriptor.FieldType.ENUM) {
    goog.proto2.Util.assert(typeof value === 'number',
                            'Expected an enum value, which is a number');
  } else {
    goog.proto2.Util.assert(value instanceof nativeType,
                            'Expected a matching message type');
  }
};


/**
 * Clears the field specified by tag.
 *
 * GENERATED CODE USE ONLY. Basis of the clear{Field} methods.
 *
 * @param {number} tag The tag of the field to clear.
 * @protected
 */
goog.proto2.Message.prototype.clear$Field = function(tag) {
  goog.proto2.Util.assert(this.getFieldByTag_(tag), 'Unknown field');
  delete this.values_[tag];
  if (this.deserializedFields_) {
    delete this.deserializedFields_[tag];
  }
};


/**
 * Sets the metadata that represents the definition of this message.
 *
 * GENERATED CODE USE ONLY. Called when constructing message classes.
 *
 * @param {Function} messageType Constructor for the message type to
 *     which this metadata applies.
 * @param {Object} metadataObj The object containing the metadata.
 */
goog.proto2.Message.set$Metadata = function(messageType, metadataObj) {
  var fields = [];
  var descriptorInfo;

  for (var key in metadataObj) {
    if (!metadataObj.hasOwnProperty(key)) {
      continue;
    }

    goog.proto2.Util.assert(goog.string.isNumeric(key), 'Keys must be numeric');

    if (key == 0) {
      descriptorInfo = metadataObj[0];
      continue;
    }

    // Create the field descriptor.
    fields.push(
        new goog.proto2.FieldDescriptor(messageType, key, metadataObj[key]));
  }

  goog.proto2.Util.assert(descriptorInfo);

  // Create the descriptor.
  messageType.descriptor_ =
      new goog.proto2.Descriptor(messageType, descriptorInfo, fields);

  messageType.getDescriptor = function() {
    return messageType.descriptor_;
  };
};
