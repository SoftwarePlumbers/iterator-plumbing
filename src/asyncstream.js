'use strict';

/** @typedef {Object} AsyncIterator
*
* An object returning successive values from some underlying collection.
* 
* @property next {Function} return next item as an __Promise__ of an {@link IteratorValue}
*/

/** Base stream clase that provides core asynchronous stream operations.
*
* A async stream is an {@link AsyncIterator} with bells on. Various utility methods are provided
* to filter, map, concatenate, and generally work with streams. For convenience, these methods are
* based on the methods already available in a javascript array, so the stream API can often be used
* as a drop-in replacement. In many cases the lazy nature of the stream API (and avoidance of array copies)
* will make the updated code more efficient than using simple arrays.
*
*/
class BaseAsyncStream {

	/** Concatenate this stream with another stream (or an iterator)
	*
	* @param iterator {AsyncIterator} items to concatenate
	* @returns {BaseAsyncStream} a new stream that iterates over all items in this stream, then all items in the supplied iterator
	*/
	concat(iterator) {
		return new ConcatenatedAsyncStream(this, iterator);
	}

	/** Create a stream of entries.
	*
	* an 'entry' is a key/value pair - the key in this case is the position of the item in the stream.
	* @returns {BaseAsyncStream<Entry>}
	*/
	entries() {
		return this.map((e,i)=>[i,e]);
	}

	/** Check if predicate evaluates to true for all elements in stream 
	*
	* @param predicate {Predicate} - to check 
	* @param [context] {Object} - passed through to predicate (could be the collection we are iterating over)
	* @returns {Promise<boolean>} resolves to true if predicate evaluates to true for every element in the stream
	*/
	every(predicate, context) {
		let index = 0;

		let check = ({done, value}) => {
			if (done) return true;
			if (predicate(value, index++, context)) {
				return this.next().then(check);
			}
			return false;
		}

		return this.next().then(check);
	}	

	/** Filter a stream
	* 
	* @param predicate {Predicate} predicate to select items from stream
	* @param [context] {Object} (optional) data to pass through to test function
	* @returns {BaseAsyncStream} a stream containing only those items from this stream for which predicate evaluates to true
	*/
	filter(predicate, context) {
		return new FilterAsyncStream(this, predicate, context);
	}

	/** Find the first item in a stream for which the predicate evalues to true.
	*
	* @param predicate {Predicate} function to test items
	* @param [context] {Object} data to pass through to test function
	* @returns {Promise} resolves to the first item in the stream for which predicate evaluates to true
	*/
	find(predicate, context) {
		let index = 0;

		let check = ({done, value}) => {
			if (done) return undefined;
			if (predicate(value, index++, context)) return value;
			return this.next().then(check);
		}

		return this.next().then(check);
	}

	/** Find the index of the first item in a stream for which the predicate evalues to true.
	*
	* @param predicate {Predicate} function to test items
	* @param [context] {Object} data to pass through to test function
	* @returns {Promise<number>} resolves to the index of first item in the stream for which predicate evaluates to true, or -1
	*/
	findIndex(predicate, context) {
		let index = 0;

		let check = ({done, value}) => {
			if (done) return -1;
			if (predicate(value, index, context)) return index;
			index++;
			return this.next().then(check);
		}

		return this.next().then(check);
	}


	/** Flatten a nested structure by iterating over the stream returned by stream_accessor for each item in this stream.
	*
	* If a stream accessor is not provided, an attempt will be made to use AsyncStream.from(e) to retrieve a stream from
	* each element e of this stream. This works fine if e is an {@link Iterable}.
	*
	* @param [stream_accessor] {Function} function that returns a stream given an object in this stream
	* @returns {BaseAsyncStream} stream that iterates over every object in every stream returned by stream_accessor.
	*/
	flatten(stream_accessor) {
		return new FlattenedAsyncStream(this, stream_accessor);
	}

	/** Execute callback for every element in stream
	*
	* @param callback {ForEachCallback} function to execute
	* @param context {Object} context passed through to callback (could be the collection we are iterating over)
	* @@returns Promise resolved one all callbacks have been executed.
	*/
	forEach(callback, context) {
		let index = 0;

		let execute = ({done, value}) => {
			if (!done) {
				index++;
				callback(value, index, context);
				return this.next().then(execute);
			}
			return {done,value};
		}

		return this.next().then(execute);
	}	

	/** Test to see if stream includes a given value
	*
	* @param {Object} item value to look for
	* @param [fromIndex=0] index to start looking 
	* @returns {Promise<boolean>} true if an item found which is strictly equal to the parameter item
	*/
	includes(item, fromIndex = 0) {
		return this.slice(fromIndex).find(e => e === item).then(e => e !== undefined);
	}

	/** Find the index of the first item in a stream strictly equal to the given item
	*
	* @param item {Object} value to look for
	* @param [fromIndex=0] {number} index to start looking (defaults to 0)
	* @returns {Promise<number>} resolves to the index of first item in the stream matching item, or -1
	*/
	indexOf(item, fromIndex = 0) {
		return this.slice(fromIndex)
			.findIndex(e => e === item)
			.then(search => search < 0 ? -1 : search + fromIndex);
	}

	/** Join elements into a string with optional separator
	* 
	* @param separator {String} string to use as separator
	* @returns {Promise<string>} resolves to all elements of stream joined into a string.
	*/
	join(separator) {
		return this.next().then( ({done,value})=>{
			if (done) return "";
			let result = new String(value);
			return this.forEach(e => { result+=separator; result+=e; }).then(()=>result);
		});
	}

	/** Apply a map operation to a stream.
	*
	* @param mapper {MapFunction} map function 
	* @param [context] {Object} context passed through to mapping function (could be the colllection we are iterating over)	
	* @returns {BaseAsyncStream} a stream that is the result of applying mapper to every element in this stream.
	*/
	map(mapper,context) {
		return new MappingAsyncStream(this, mapper, context);
	}

	/** Add an element to a stream
	*
	* Equivalent to this.concat(Stream.from(arguments))
	*
	* @param {Object} element to add
	* @returns {BaseAsyncStream} a new stream that will iterate through all elments of this stream, then the supplied element
	*/
	push() {
		return this.concat(AsyncStream.from(arguments));
	}


	/** Reduces a stream of values to a single object by repeatedly applying a function.
	*
	* executes accumulator = callback(accumulator, element, index, context) for every element in the stream.
	*
	* @param callback {Reducer} reduction function.
	* @param value {Object} initial value of accumulator
	* @param [context] Passed through to reduction function (could be the collection we are iterating over)
	* @returns {Promise} resolves to the final value of the accumulator
	*/
	reduce(callback, accumulator, context) {
		let index = 0;

		let execute = ({done, value}) => {
			if (done) return accumulator;
			accumulator = callback(accumulator, value, index++, context);
			return this.next().then(execute);
		}

		return this.next().then(execute);
	}


	/** Get the first item in the stream. 
	* 
	* @returns {Promise} resolves to the first item in the stream, or undefined if none exists.
	*/
	shift() {
		return this.next().then(({done, value}) => done ? undefined : value);
	}

	/** Get a subset of data from the stream, throwing away other values.
	*
	* @param [begin = 0] {number} index of first element in slice
	* @param [index] of first element after slice; by default all remaining elements
	* @returns {BaseAsyncStream} a stream containing a subset of elements 
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
	* @returns {Promise<boolean>} resolves to true if an element is found for which predicate evaluates to true.
	*/
	some(predicate) {
		return this.find(predicate).then(e => e != undefined);
	}


	/** Convert stream to array 
	*
	* @returns {Promise<Array>} A promise of an array containing all elements in the stream.
	*/
	toArray() {
		let array = [];
		return this.forEach(e => array.push(e)).then(() => array);
	}

	/** Convert stream of key/value pairs to an array of values
	*
	* Equivalent to map(([k,v])=>v).toArray()
	*
	* @returns {Promise<Array>} resolves to an array of simple values.
	*/
	toValues() {
		return this.map(([k,v])=>v).toArray();
	}

	/** Convert stream to map
	*
	* @param key {Function} function to convert item to key - defaults to [k,v]=>k
	* @param value {Function} function to convert item to value - defaults to [k,v]=>v
	* @return {Promise<Map>} resolves to a new Map with specified keys and values from stream
	*/
	toMap(key = e=>e[0], value = e=>e[1]) {
		let map = new Map();
		return this.forEach(e => map.set(key(e), value(e))).then(()=>map);
	}

	/** Convert stream to object
	*
	* @param [key] {Function} function to convert item to key - defaults to [k,v]=>k
	* @param [value] {Function} function to convert item to value - defaults to [k,v]=>v
	* @return {Promise} resolves to a new object with specified property names and values from stream
	*/
	toObject(key = e=>e[0], value = e=>e[1]) {
		let obj = {};
		return this.forEach(e => obj[key(e)] = value(e)).then(()=>obj);
	}
}

/** AsyncStream class that simply wraps an asynchronous iterator.
*
* A stream is an iterator (it implements next()) with bells on. Various utility methods are provided
* to filter, map, concatenate, and generally work with streams. For convenience, these methods are
* based on the methods already available in a javascript array, so the stream API can often be used
* as a drop-in replacement. In many cases the lazy nature of the stream API (and avoidance of array copies)
* will make the updated code more efficient than using simple arrays.
*
* @extends BaseAsyncStream
*/
class AsyncStream extends BaseAsyncStream {

	/** Build a stream from an iterator.
	*
	* Essentially just wraps the supplied iterator, providing all the additional stream functions.
	*
	* @param iterator {AsyncIterator} to wrap.
	*/
	constructor(iterator) {
		super();
		this.iterator = iterator;
	}

	/** Get the next item in the stream.
	*
	* @returns {Promise<IteratorValue>} a promise of the next item (which is just the result of calling next on the iterator supplied in the constructor)
	*/
	next() {
		return this.iterator.next();
	}

	/** Build an asynchronous stream from an iterable
	*
	* If source is iterable, return an async stream over items in source. Otherwise, return a stream with a single
	* element, source. 
	* 
	* @param iterator {Iterable|Object} iterable to build a stream from.
	* @return {AsyncStream} a new asynchronous stream
	*/
	static from(source) {
		if (Symbol.iterator in source) {
			let iterator = source[Symbol.iterator]();
			return new AsyncStream({ next: ()=>Promise.resolve(iterator.next())});
		}
		return Stream.of(source);
	}

	/** Build an async stream from the given arguments.
	*
	* @param elements {...*} to convert into a stream.
	* @return {AsyncStream} a new asynchronous stream
	*/
	static of(...elements) {
		return AsyncStream.from(elements);
	}


	/** an empty stream
	*/
	static get EMPTY() {
		return new EmptyStream();
	}

}

/** @private */
class EmptyStream extends BaseAsyncStream {
	next() { return Promise.resolve({ done: true }); }
}


/** Stream that filters items based on a predicate function
*
* Stream will only return items for which predicate function evaluates to true.
* @private
*/
class FilterAsyncStream extends BaseAsyncStream {

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
		return this.iterator.next().then(({done,value})=>{
			if (done || this.predicate(value, this.index++, this.context)) return { done, value };
			return this.next();
		});
	}
}

/** Stream that applies a function to transform values supplied by some other stream or iterator.
* @private
*/
class MappingAsyncStream extends BaseAsyncStream {

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
		return this.iterator.next().then(({done,value})=>({ done, value : !done && this.mapper(value, this.index++, this.context) }));
	}
}

/** Stream composed of two other streams.
*
* Resulting stream will return all elements from the first stream followed by all elements from the second
*
* @private
*/
class ConcatenatedAsyncStream extends BaseAsyncStream {

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
		return this.iterator1.next()
			.then(({done,value}) => done ? this.iterator2.next() : { done, value });
	}
}

/** Stream composed by obtaining a stream from each object in a stream
*
* @private
*/
class FlattenedAsyncStream extends BaseAsyncStream {

	/** Constructor
	*
	* @param iterator an interator over something that produces a stream
	* @param stream_accessor function used to obtain a stream from each element returned by itereator
	*/
	constructor(iterator, stream_accessor = iterable => AsyncStream.from(iterable)) {
		super();
		this.outer = iterator.map(stream_accessor);
		this.outer_value = this.outer.next();
	}

	/** Get the next item in the stream.
	*
	* As per the iterable protocol, next returns the tuple { done, value } where done is true once there are no more
	* items in the stream.
	*
	* @returns the next item 
	*/
	next() {
		return this.outer_value.then( outer_value =>  {
			if (outer_value.done) return { done: true } 
			return outer_value.value.next()
				.then(({done,value}) => {
					if (done) {
						this.outer_value = this.outer.next();
						return this.next();
					}
					return { done, value };
				})
		});
	}
}

module.exports = AsyncStream;
