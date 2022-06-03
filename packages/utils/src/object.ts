/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ObjOrArray, Primitive, WrappedFunction } from '@sentry/types';

import { htmlTreeAsString } from './browser';
import { isElement, isError, isEvent, isInstanceOf, isPrimitive } from './is';
// import { isElement, isError, isEvent, isInstanceOf, isPlainObject, isPrimitive } from './is';
// import { memoBuilder, MemoFunc } from './memo';
import { truncate } from './string';

/**
 * Replace a method in an object with a wrapped version of itself.
 *
 * @param source An object that contains a method to be wrapped.
 * @param name The name of the method to be wrapped.
 * @param replacementFactory A higher-order function that takes the original version of the given method and returns a
 * wrapped version. Note: The function returned by `replacementFactory` needs to be a non-arrow function, in order to
 * preserve the correct value of `this`, and the original method must be called using `origMethod.call(this, <other
 * args>)` or `origMethod.apply(this, [<other args>])` (rather than being called directly), again to preserve `this`.
 * @returns void
 */
export function fill(source: { [key: string]: any }, name: string, replacementFactory: (...args: any[]) => any): void {
  if (!(name in source)) {
    return;
  }

  const original = source[name] as () => any;
  const wrapped = replacementFactory(original) as WrappedFunction;

  // Make sure it's a function first, as we need to attach an empty prototype for `defineProperties` to work
  // otherwise it'll throw "TypeError: Object.defineProperties called on non-object"
  if (typeof wrapped === 'function') {
    try {
      markFunctionWrapped(wrapped, original);
    } catch (_Oo) {
      // This can throw if multiple fill happens on a global object like XMLHttpRequest
      // Fixes https://github.com/getsentry/sentry-javascript/issues/2043
    }
  }

  source[name] = wrapped;
}

/**
 * Defines a non-enumerable property on the given object.
 *
 * @param obj The object on which to set the property
 * @param name The name of the property to be set
 * @param value The value to which to set the property
 */
export function addNonEnumerableProperty(obj: { [key: string]: unknown }, name: string, value: unknown): void {
  Object.defineProperty(obj, name, {
    // enumerable: false, // the default, so we can save on bundle size by not explicitly setting it
    value: value,
    writable: true,
    configurable: true,
  });
}

/**
 * Remembers the original function on the wrapped function and
 * patches up the prototype.
 *
 * @param wrapped the wrapper function
 * @param original the original function that gets wrapped
 */
export function markFunctionWrapped(wrapped: WrappedFunction, original: WrappedFunction): void {
  const proto = original.prototype || {};
  wrapped.prototype = original.prototype = proto;
  addNonEnumerableProperty(wrapped, '__sentry_original__', original);
}

/**
 * This extracts the original function if available.  See
 * `markFunctionWrapped` for more information.
 *
 * @param func the function to unwrap
 * @returns the unwrapped version of the function if available.
 */
export function getOriginalFunction(func: WrappedFunction): WrappedFunction | undefined {
  return func.__sentry_original__;
}

/**
 * Encodes given object into url-friendly format
 *
 * @param object An object that contains serializable values
 * @returns string Encoded
 */
export function urlEncode(object: { [key: string]: any }): string {
  return Object.keys(object)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(object[key])}`)
    .join('&');
}

/**
 * Transforms any `Error` or `Event` into a plain object with all of their enumerable properties, and some of their
 * non-enumerable properties attached.
 *
 * @param value Initial source that we have to transform in order for it to be usable by the serializer
 * @returns An Event or Error turned into an object - or the value argurment itself, when value is neither an Event nor
 *  an Error.
 */
export function convertToPlainObject<V extends unknown>(
  value: V,
):
  | {
      [ownProps: string]: unknown;
      type: string;
      target: string;
      currentTarget: string;
      detail?: unknown;
    }
  | {
      [ownProps: string]: unknown;
      message: string;
      name: string;
      stack?: string;
    }
  | V {
  if (isError(value)) {
    return {
      message: value.message,
      name: value.name,
      stack: value.stack,
      ...getOwnProperties(value),
    };
  } else if (isEvent(value)) {
    const newObj: {
      [ownProps: string]: unknown;
      type: string;
      target: string;
      currentTarget: string;
      detail?: unknown;
    } = {
      type: value.type,
      target: serializeEventTarget(value.target),
      currentTarget: serializeEventTarget(value.currentTarget),
      ...getOwnProperties(value),
    };

    if (typeof CustomEvent !== 'undefined' && isInstanceOf(value, CustomEvent)) {
      newObj.detail = value.detail;
    }

    return newObj;
  } else {
    return value;
  }
}

/** Creates a string representation of the target of an `Event` object */
function serializeEventTarget(target: unknown): string {
  try {
    return isElement(target) ? htmlTreeAsString(target) : Object.prototype.toString.call(target);
  } catch (_oO) {
    return '<unknown>';
  }
}

/** Filters out all but an object's own properties */
function getOwnProperties(obj: unknown): { [key: string]: unknown } {
  if (typeof obj === 'object' && obj !== null) {
    const extractedProps: { [key: string]: unknown } = {};
    for (const property in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, property)) {
        extractedProps[property] = (obj as Record<string, unknown>)[property];
      }
    }
    return extractedProps;
  } else {
    return {};
  }
}

/**
 * Given any captured exception, extract its keys and create a sorted
 * and truncated list that will be used inside the event message.
 * eg. `Non-error exception captured with keys: foo, bar, baz`
 */
export function extractExceptionKeysForMessage(exception: Record<string, unknown>, maxLength: number = 40): string {
  const keys = Object.keys(convertToPlainObject(exception));
  keys.sort();

  if (!keys.length) {
    return '[object has no keys]';
  }

  if (keys[0].length >= maxLength) {
    return truncate(keys[0], maxLength);
  }

  for (let includedKeys = keys.length; includedKeys > 0; includedKeys--) {
    const serialized = keys.slice(0, includedKeys).join(', ');
    if (serialized.length > maxLength) {
      continue;
    }
    if (includedKeys === keys.length) {
      return serialized;
    }
    return truncate(serialized, maxLength);
  }

  return '';
}

function defaultBailBeforeRecursion<T>(_key: string, value: T, _options: VisitOptions): T | undefined {
  return isPrimitive(value) ? value : undefined;
}

/**
 * Given any object, return the new object with removed keys that value was `undefined`.
 * Works recursively on objects and arrays.
 *
 * Attention: This function keeps circular references in the returned object.
 */
export function dropUndefinedKeys<T>(val: T): T {
  return visit('', val, { filter: (_key, value) => value === undefined });
}

/**
 * Ensure that something is an object.
 *
 * Turns `undefined` and `null` into `String`s and all other primitives into instances of their respective wrapper
 * classes (String, Boolean, Number, etc.). Acts as the identity function on non-primitives.
 *
 * @param wat The subject of the objectification
 * @returns A version of `wat` which can safely be used with `Object` class methods
 */
export function objectify(wat: unknown): typeof Object {
  let objectified;
  switch (true) {
    case wat === undefined || wat === null:
      objectified = new String(wat);
      break;

    // Though symbols and bigints do have wrapper classes (`Symbol` and `BigInt`, respectively), for whatever reason
    // those classes don't have constructors which can be used with the `new` keyword. We therefore need to cast each as
    // an object in order to wrap it.
    case typeof wat === 'symbol' || typeof wat === 'bigint':
      objectified = Object(wat);
      break;

    // this will catch the remaining primitives: `String`, `Number`, and `Boolean`
    case isPrimitive(wat):
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      objectified = new (wat as any).constructor(wat);
      break;

    // by process of elimination, at this point we know that `wat` must already be an object
    default:
      objectified = wat;
      break;
  }
  return objectified;
}

export type VisitOptions = {
  depth?: number;
  maxProperties?: number;
  memoizer?: Map<unknown, Primitive | ObjOrArray<unknown>>;
  preserveCircularReferences?: boolean;
  bailBeforeRecursion?: <T>(key: string, value: T, options: VisitOptions) => T | undefined;
  filter?: (key: string, value: unknown) => boolean;
};

// TODO Fix this docstring for options change
/**
 * Visits a node to perform processing on it
 *
 * @param key The key corresponding to the given node
 * @param value The node to be visited
 * @param depth Optional number indicating the maximum recursion depth
 * @param maxProperties Optional maximum number of properties/elements included in any single object/array
 * @param memoizer Optional Memo class handling decycling
 * @param preserveCircularReferences If false, the string '[Circular ~]' will be substituted for any circular references
 * @param bailBeforeRecursion A function to handle all cases in which recursion should not happen. Returns the value
 * with which to bail, or undefined if recursion should continue.
 * @param filter A function to decide if a child node should be included in the processed version of the current node
 */
export function visit<T>(key: string, value: T, options: VisitOptions = {}): T {
  const {
    depth = +Infinity,
    maxProperties = +Infinity,
    memoizer = new Map(),
    preserveCircularReferences = true,
    bailBeforeRecursion = defaultBailBeforeRecursion,
    filter = () => true,
  } = options;

  const bailValue = bailBeforeRecursion<T>(key, value, options);
  if (bailValue !== undefined) {
    return bailValue;
  }

  // If we make it to this point, we know we have either an object or an array.
  const origValue = value as unknown as ObjOrArray<unknown>;

  // Create an accumulator to hold the results of visiting each node, and add both it and the original value to our
  // memoizer.
  const processed = (Array.isArray(origValue) ? [] : {}) as ObjOrArray<unknown>;
  memoizer.set(origValue, processed);

  // Before we begin, convert `Error` and `Event` instances into plain objects, since some of each of their relevant
  // properties are non-enumerable and otherwise would get missed.
  const visitable = convertToPlainObject(origValue as ObjOrArray<unknown>);

  // eslint-disable-next-line guard-for-in
  for (const visitKey in visitable) {
    const visitValue = visitable[visitKey];

    if (!filter(visitKey, visitValue)) {
      continue;
    }

    if (Object.keys(processed).length >= maxProperties) {
      processed[visitKey] = '[MaxProperties ~]';
      break;
    }

    // Recursively visit all the child nodes
    processed[visitKey] = visit(visitKey, visitValue, {
      depth: depth - 1,
      maxProperties,
      memoizer,
      preserveCircularReferences,
      bailBeforeRecursion,
    });
  }

  // Once we've finished recursing, remove the parent from memo storage. (This is necessary so that if we see the same
  // value elsewhere, as part of another branch, we won't mistakenly think we've hit a circular reference.)
  memoizer.delete(value);

  // Return accumulated values
  return processed as unknown as T;
}

// TODO (v8): remove this (this means the method will no longer be exported, under any name)
export { visit as walk };
