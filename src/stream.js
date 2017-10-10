'use strict';

/** @typedef {Object} IteratorValue
*
* An item returned by an iterator.
*
* @property done {boolean} - true if iterator has no more values
* @property value {Object} - a value (from some parent collection of values)
*/

/** @typedef {Object} Iterator
*
* An object returning successive values from some underlying collection.
* 
* @property next {Function} return next item as an {@link IteratorValue}
*/


/** @typedef {Object} Iterable
*
* Object that can be iterated over
*
* @property Symbol.iterator {Function} return an {@link Iterator} over items in this collection 
*/

/** @typedef {Array} Entry
*
* A key/value pair [k,v] represeting a logical mapping between the key and the value.
*/

/** @callback Predicate
*
* Evaluate value in stream against some criteria.
*
* @param {Object} item - Item to evaluate
* @param {number} index - index of item in stream
* @param {Object} context - Context, such as the collection we are iterating over
* @returns {boolean} true if item matches criteria, false otherwise
*/

/** @callback ForEachCallback
* @param item {Object} item to process
* @param [index] {number} index of current item in stream
* @param [context] {object} context infromation (such as the collection iterated over)
*/

/** @callback MapFunction
*
* Map value in stream to some other value
*
* @param {Object} item - Item to evaluate
* @param {number} index - index of item in stream
* @param {Object} context - Context, such as the collection we are iterating over
* @returns {Object} mapped value
*/

/** @callback Reducer
*
* Reduce value in stream to a single value
*
* @param {Object} accumulator - current value of accumulator
* @param {Object} item - Item to evaluate
* @param {number} index - index of item in stream
* @param {Object} context - Context, such as the collection we are iterating over
* @returns {Object} new value for accumulator
*/

/** Base stream clase that provides core stream operations.
*
* A stream is an Iterator (it implements next()) with bells on. Various utility methods are provided
* to filter, map, concatenate, and generally work with streams. For convenience, these methods are
* based on the methods already available in a javascript array, so the stream API can often be used
* as a drop-in replacement. In many cases the lazy nature of the stream API (and avoidance of array copies)
* will make the updated code more efficient than using simple arrays.
*
*/
class BaseStream {

	/** Concatenate this stream with another stream (or an iterator)
	*
	* @param iterator {Iterator<T>} - Stream or iterator to concatenate
	* @return {BaseStream<T>} a new stream that iterates over all items in this stream, then all items in the supplied iterator
	*/
	concat(iterator) {
		return new ConcatenatedStream(this, iterator);
	}

	/** Create a stream of entries.
	*
	* an 'entry' is a key/value pair - the key in this case is the position of the item in the stream.
	* @return {BaseStream<Entry>}
	*/
	entries() {
		return this.map((e,i)=>[i,e]);
	}

	/** Check if predicate evaluates to true for all elements in stream 
	*
	* @param predicate {Predicate} - to check 
	* @param [context] {Object} - passed through to predicate (could be the collection we are iterating over)
	* @returns {boolean} true if predicate evaluates to true for every element in the stream
	*/
	every(predicate, context) {
		let index = 0;
		let result = true;
		for (let item = this.next(); !item.done && result; item=this.next()) result = predicate(item.value, index++, context);		
		return result;
	}	

	/** Filter a stream
	* 
	* @param predicate {Predicate} predicate to select items from stream
	* @param [context] {Object} (optional) data to pass through to test function
	* @returns {BaseStream} a stream containing only those items from this stream for which predicate evaluates to true
	*/
	filter(predicate, context) {
		return new FilterStream(this, predicate, context);
	}

	/** Find the first item in a stream for which the predicate evalues to true.
	*
	* @param predicate {Predicate} function to test items
	* @param [context] {Object} data to pass through to test function
	* @returns {Object} the first item in the stream for which predicate evaluates to true
	*/
	find(predicate, context) {
		let index = 0;
		for (let item = this.next(); !item.done; item=this.next()) 
			if (predicate(item.value, index++, context)) return item.value;
		return undefined;
	}

	/** Find the index of the first item in a stream for which the predicate evalues to true.
	*
	* @param predicate {Predicate} function to test items
	* @param [context] {Object} data to pass through to test function
	* @returns {number} the index of first item in the stream for which predicate evaluates to true, or -1
	*/
	findIndex(predicate, context) {
		let index = 0;
		for (let item = this.next(); !item.done; item=this.next()) 
			if (predicate(item.value, index, context)) return index; else index++;
		return -1;
	}

	/** Flatten a nested structure by iterating over the stream returned by stream_accessor for each item in this stream.
	*
	* If a stream accessor is not provided, an attempt will be made to use Stream.from(e) to retrieve a stream from
	* each element e of this stream. This works fine if e is an {@link Iterable}.
	*
	* @param [stream_accessor] {Function} function that returns a stream given an object in this stream
	* @returns {BaseStream} stream that iterates over every object in every stream returned by stream_accessor.
	*/
	flatten(stream_accessor) {
		return new FlattenedStream(this, stream_accessor);
	}

	/** Execute callback for every element in stream
	*
	* @param callback {ForEachCallback} function to execute
	* @param context {Object} context passed through to callback (could be the collection we are iterating over)
	*/
	forEach(callback, context) {
		let index = 0;
		for (let item = this.next(); !item.done; item=this.next()) {
			callback(item.value, index++, context);
		}		
	}	

	/** Test to see if stream includes a given value
	*
	* @param {Object} item value to look for
	* @param [fromIndex=0] index to start looking (defaults to 0)
	* @returns {boolean} true if an item found which is strictly equal to the parameter item
	*/
	includes(item, fromIndex = 0) {
		return this.slice(fromIndex).find(e => e === item) !== undefined;
	}

	/** Find the index of the first item in a stream for which the predicate evalues to true.
	*
	* @param item value to look for
	* @param fromIndex index to start looking (defaults to 0)
	* @returns the index of first item in the stream matching item, or -1
	*/
	indexOf(item, fromIndex = 0) {
		let search = this.slice(fromIndex).findIndex(e => e === item);
		return search < 0 ? -1 : search + fromIndex;
	}

	/** Join elements into a string with optional separator
	* 
	* @param separator {String} string to use as separator
	* @returns {String} all elements of stream joined into a string.
	*/
	join(separator) {
		let { done, value } = this.next();
		if (done) return "";
		let result = new String(value);
		this.forEach(e => { result+=separator; result+=e; });
		return result;
	}

	/** Apply a map operation to a stream.
	*
	* @param mapper {MapFunction} map function 
	* @param [context] {Object} context passed through to mapping function (could be the colllection we are iterating over)	
	* @returns {BaseStream} a stream that is the result of applying mapper to every element in this stream.
	*/
	map(mapper,context) {
		return new MappingStream(this, mapper, context);
	}

	/** Add an element to a stream
	*
	* Equivalent to this.concat(Stream.from(arguments))
	*
	* @param {Object} element to add
	* @returns {BaseStream} a new stream that will iterate through all elments of this stream, then the supplied element
	*/
	push() {
		return this.concat(Stream.from(arguments));
	}


	/** Reduces a stream of values to a single object by repeatedly applying a function.
	*
	* executes accumulator = callback(accumulator, element, index, context) for every element in the stream.
	*
	* @param callback {Reducer} reduction function.
	* @param value {Object} initial value of accumulator
	* @param [context] Passed through to reduction function (could be the collection we are iterating over)
	* @returns the final value of the accumulator
	*/
	reduce(callback, value, context) {
		let index = 0;
		for (let item = this.next(); !item.done; item=this.next()) {
			value = callback(value, item.value,  index++, context);
		}		
		return value;
	}


	/** Get the first item in the stream. 
	* 
	* @returns {Object} the first item in the stream, or undefined if none exists.
	*/
	shift() {
		let item = this.next();
		return (item.done) ? undefined : item.value;
	}

	/** Get a subset of data from the stream, throwing away other values.
	*
	* @param [begin = 0] {number} index of first element in slice
	* @param [index] of first element after slice; by default all remaining elements
	* @param {BaseStream} a stream containing a subset of elements 
	*/
	slice(begin = 0, end) {
		if (begin < 0) throw new RangeError('begin must be > 0');
		if (end && end < 0) throw new RangeError('end must be > 0');
		let predicate = end 
			? (e,i) => begin <= i && i < end
			: (e,i) => begin <= i;
		return this.filter(predicate);
	}

	/** Find if some element in the stream matches the predicate.
	*
	* @param predicate {Predicate} function to test elements.
	* @returns {boolean} true if an element is found for which predicate evaluates to true.
	*/
	some(predicate) {
		return this.find(predicate) != undefined;
	}


	/** Convert stream to array 
	*
	* @returns {Array} an array containing all elements in the stream.
	*/
	toArray() {
		let array = [];
		for (let item = this.next(); !item.done; item=this.next()) array.push(item.value);
		return array;
	}

	/** Convert stream of key/value pairs to an array of values.
	*
	* Equivalent to map(([k,v])=>v).toArray().
	*
	* @returns {Array} an array of simple values.
	*/
	toValues() {
		return this.map(([k,v])=>v).toArray();
	}

	/** Convert stream to map
	*
	* @param [key] {Function} function to convert item to key - defaults to [k,v]=>k
	* @param [value] {Function} function to convert item to value - defaults to [k,v]=>v
	* @return {Map} a new Map with specified keys and values from stream
	*/
	toMap(key = e=>e[0], value = e=>e[1]) {
		let map = new Map();
		for (let item = this.next(); !item.done; item=this.next()) {
			map.set(key(item.value),value(item.value));
		}
		return map;		
	}

	/** Convert stream to object
	*
	* @param [key] {Function} function to convert item to key - defaults to [k,v]=>k
	* @param [value] {Function} function to convert item to value - defaults to [k,v]=>v
	* @return {Object} a new object with specified property names and values from stream
	*/
	toObject(key = e=>e[0], value = e=>e[1]) {
		let obj = {};
		for (let item = this.next(); !item.done; item=this.next()) {
			obj[key(item.value)]=value(item.value);
		}
		return obj;		
	}
}

/** Stream class that simply wraps another iterator.
*
* A stream is an iterator (it implements next()) with bells on. Various utility methods are provided
* to filter, map, concatenate, and generally work with streams. For convenience, these methods are
* based on the methods already available in a javascript array, so the stream API can often be used
* as a drop-in replacement. In many cases the lazy nature of the stream API (and avoidance of array copies)
* will make the updated code more efficient than using simple arrays.
*
*/
class Stream extends BaseStream {

	/** Build a stream from an iterator.
	*
	* Essentially just wraps the supplied iterator, providing all the additional stream functions.
	*
	* @param iterator to wrap.
	*/
	constructor(iterator) {
		super();
		this.iterator = iterator;
	}

	/** Get the next item in the stream.
	*
	* As per the iterable protocol, next returns the tuple { done, value } where done is true once there are no more
	* items in the stream.
	*
	* @returns {IteratorValue} the next item (which is just the result of calling next on the iterator supplied in the constructor)
	*/
	next() {
		return this.iterator.next();
	}

	/** Build a stream from an iterable
	*
	* If source is Iterable, return a stream over items in source. Otherwise, return a stream with a single
	* element, source. 
	* 
	* @param source {Iterable|Object} object to build a stream from.
	* @returns {Stream} a new stream
	*/
	static from(source) {
		return (source[Symbol.iterator]) ? new Stream(source[Symbol.iterator]()) : Stream.of(source);
	}

	/** Build a stream from an object 
	* 
	* @param source {Object} object to build a stream from.
	* @returns {Stream<Entry>} A stream of key/value pairs in the format [k,v] where k is the name of the attribute and v the value.
	*/
	static fromProperties(source) {
		let keys = Object.keys(source)[Symbol.iterator]();
		return new Stream( { next() { let { done, value } = keys.next(); return { done, value: [value, source[value]] } } } );
	}

	/** Build a stream from the given arguments.
	*
	* @param elements {...*} to convert into a stream.
	* @param {Stream} a stream returning each argument in turn.
	*/
	static of(...elements) {
		return Stream.from(elements);
	}

	/** an empty stream
	*/
	static get EMPTY() {
		return new EmptyStream();
	}
}

/** @private */
class EmptyStream extends BaseStream {
	next() { return { done: true } }
}


/** Stream that filters items based on a predicate function
*
* Stream will only return items for which predicate function evaluates to true.
*
* @private
*/
class FilterStream extends BaseStream {

	/** Construct a new filtered stream.
	*
	* @param iterator iterator or stream to provide underlying data
	* @param predicate {Function} function to filter items.
	* @param context (optional) data to pass through to test function
	*/
	constructor(iterator, predicate, context) {
		super();
		this.iterator = iterator;
		this.predicate = predicate;
		this.context = context;
		this.index = 0;
	}

	/** Get the next item in the stream.
	*
	* As per the iterable protocol, next returns the tuple { done, value } where done is true once there are no more
	* items in the stream.
	*
	* @returns the next item (which is just the result of calling next on the iterator supplied in the constructor)
	*/
	next() {
		let current = this.iterator.next();
		while (!current.done && !this.predicate(current.value, this.index++)) {
			current = this.iterator.next();
		}
		return current;
	}
}

/** Stream that applies a function to transform values supplied by some other stream or iterator.
* @private
*/
class MappingStream extends BaseStream {

	/** Constructor
	* 
	* @param iterator stream or iterator that supplies values
	* @param mapper function used to transform values
	* @param context Passed through to mapping function (could be the colllection we are iterating over)
	*/
	constructor(iterator, mapper, context) {
		super();
		this.iterator = iterator;
		this.mapper = mapper;
		this.context = context;
		this.index = 0;
	}

	/** Get the next item in the stream.
	*
	* As per the iterable protocol, next returns the tuple { done, value } where done is true once there are no more
	* items in the stream.
	*
	* @returns the next item (which is just the result of calling next on the iterator supplied in the constructor)
	*/
	next() {
		let { done, value } = this.iterator.next();
		if (done) return { done };
		return { done, value: this.mapper(value, this.index++, this.context) };
	}
}

/** Stream composed of two other streams.
*
* Resulting stream will return all elements from the first stream followed by all elements from the second
* @private
*
*/
class ConcatenatedStream extends Stream {

	/** Constructor
	*
	* @param iterator1 first stream or iterator
	* @param iterator2 second stream or iterator
	*/
	constructor(iterator1, iterator2) {
		super();
		this.iterator1 = iterator1;
		this.iterator2 = iterator2;
	}

	/** Get the next item in the stream.
	*
	* As per the iterable protocol, next returns the tuple { done, value } where done is true once there are no more
	* items in the stream.
	*
	* @returns the next item (which is just the result of calling next on the iterator supplied in the constructor)
	*/
	next() {
		let current = this.iterator1.next();
		if (!current.done) return current;
		current = this.iterator2.next();
		return current;
	}
}

/** Stream composed by obtaining a stream from each object in a stream
*
* @private
*/
class FlattenedStream extends Stream {

	/** Constructor
	*
	* @param iterator an interator over something that produces a stream
	* @param stream_accessor function used to obtain a stream from each element returned by itereator
	*/
	constructor(iterator, stream_accessor = iterable => Stream.from(iterable)) {
		super();
		this.outer = iterator;
		this.stream_accessor = stream_accessor;
		this._nextOuter();
	}

	_nextOuter() {
		let { done, value } = this.outer.next();
		if (done)
			this.inner = Stream.EMPTY;
		else
			this.inner = this.stream_accessor(value);
	}

	/** Get the next item in the stream.
	*
	* As per the iterable protocol, next returns the tuple { done, value } where done is true once there are no more
	* items in the stream.
	*
	* @returns the next item (which is just the result of calling next on the iterator supplied in the constructor)
	*/
	next() {
		let current = this.inner.next();
		if (!current.done) return current;
		//TODO: I think there is a bug here to do with handling empty inner collections
		this._nextOuter();
		return this.inner.next();
	}
}

module.exports = Stream;
