'use strict';

/** Base stream clase that provides core stream operations.
*
* A stream is an iterator (it implements next()) with bells on. Various utility methods are provided
* to filter, map, concatenate, and generally work with streams. For convenience, these methods are
* based on the methods already available in a javascript array, so the stream API can often be used
* as a drop-in replacement. In many cases the lazy nature of the stream API (and avoidance of array copies)
* will make the updated code more efficient than using simple arrays.
*
*/
class BaseStream {

	/** Concatenate this stream with another stream (or an iterator)
	*
	* @param iterator Stream or iterator to concatenate
	* @return a new stream that iterates over all items in this stream, then all items in the supplied iterator
	*/
	concat(iterator) {
		return new ConcatenatedStream(this, iterator);
	}

	/** Create a stream of entries.
	*
	* an 'entry' is a key/value pair - the key in this case is the position of the item in the stream.
	*/
	entries() {
		return this.map((e,i)=>[i,e]);
	}

	/** Check if predicate evaluates to true for all elements in stream 
	*
	* @param predicate to check 
	* @param concext passed through to predicate (could be the collection we are iterating over)
	* @returns true if predicate evaluates to true for every element in the stream
	*/
	every(predicate, context) {
		let index = 0;
		let result = true;
		for (let item = this.next(); !item.done && result; item=this.next()) result = predicate(item.value, index++, context);		
		return result;
	}	

	/** Filter a stream
	* 
	* @param predicate {Function} predicate to select items from stream
	* @param context (optional) data to pass through to test function
	* @returns a stream containing only those items from this stream for which predicate evaluates to true
	*/
	filter(predicate, context) {
		return new FilterStream(this, predicate, context);
	}

	/** Find the first item in a stream for which the predicate evalues to true.
	*
	* @param predicate {Function} function to test items
	* @param context (optional) data to pass through to test function
	* @returns the first item in the stream for which predicate evaluates to true
	*/
	find(predicate, context) {
		let index = 0;
		for (let item = this.next(); !item.done; item=this.next()) 
			if (predicate(item.value, index++, context)) return item.value;
		return undefined;
	}

	/** Find the index of the first item in a stream for which the predicate evalues to true.
	*
	* @param predicate {Function} function to test items
	* @param context (optional) data to pass through to test function
	* @returns the index of first item in the stream for which predicate evaluates to true, or -1
	*/
	findIndex(predicate, context) {
		let index = 0;
		for (let item = this.next(); !item.done; item=this.next()) 
			if (predicate(item.value, index, context)) return index; else index++;
		return -1;
	}

	/** Flatten a nested structure by iterating over the stream returned by stream_accessor for each item in this stream
	* @param stream_accessor {Function} function that returns a stream given an object in this stream
	* @returns stream that iterates over every object in every stream returned by stream_accessor.
	*/
	flatten(stream_accessor) {
		return new FlattenedStream(this, stream_accessor);
	}

	/** Execute callback for every element in stream
	*
	* @param callback {Function} function to execute
	* @param concext passed through to predicate (could be the collection we are iterating over)
	*/
	forEach(callback, context) {
		let index = 0;
		for (let item = this.next(); !item.done; item=this.next()) {
			callback(item.value, index++, context);
		}		
	}	

	/** Test to see if stream includes a given value
	*
	* @param item value to look for
	* @param fromIndex index to start looking (defaults to 0)
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
	* @returns all elements of stream joined into a string.
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
	* @param mapper {Function} map function 
	* @param context Passed through to mapping function (could be the colllection we are iterating over)	
	* @returns a stream that is the result of applying mapper to every element in this stream.
	*/
	map(mapper,context) {
		return new MappingStream(this, mapper, context);
	}

	/** Add an element to a stream
	*
	* Equivalent to this.concat(Stream.from(arguments))
	*
	* @param element to add
	* @returns a new stream that will iterate through all elmeents of this stream, then the supplied element
	*/
	push() {
		return this.concat(Stream.from(arguments));
	}


	/** Recuces a stream of values to a single object by repeatedly applying a function.
	*
	* executes accumulator = callback(accumulator, element) for every element in the stream.
	*
	* @param callback {Function} reduction function.
	* @param value initial value of accumulator
	* @param context Passed through to reduction function (could be the collection we are iterating over)
	* @returns the final value of the accumulator
	*/
	reduce(callback, value, context) {
		let index = 0;
		for (let item = this.next(); !item.done; item=this.next()) {
			value = callback(value, item.value,  index++, context);
		}		
		return value;
	}


	/** Get the first item in the stream 
	* 
	* @returns the first item in the stream, or undefined if none exists.
	*/
	shift() {
		let item = this.next();
		return (item.done) ? undefined : item.value;
	}

	/**
	*
	* @param begin index of first element in slice
	* @param index of first element after slice
	* @param a stream containing a subset of elements 
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
	* @param predicate {Function} function to test elements.
	*/
	some(predicate) {
		return this.find(predicate) != undefined;
	}


	/** Convert stream to array 
	*
	* @returns an array containing all elements in the stream.
	*/
	toArray() {
		let array = [];
		for (let item = this.next(); !item.done; item=this.next()) array.push(item.value);
		return array;
	}

	/** Convert stream to map
	*
	* @param key {Function} function to convert item to key - defaults to [k,v]=>k
	* @param value {Function} function to convert item to value - defaults to [k,v]=>v
	* @return a new Map with specified keys and values from stream
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
	* @param key {Function} function to convert item to key - defaults to [k,v]=>k
	* @param value {Function} function to convert item to value - defaults to [k,v]=>v
	* @return a new Map with specified keys and values from stream
	*/
	toObject(key = e=>e[0], value = e=>e[1]) {
		let obj = {};
		for (let item = this.next(); !item.done; item=this.next()) {
			obj[key(item.value)]=value(item.value);
		}
		return obj;		
	}
}

/** Stream clase that simply wraps another iterator.
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
	* @returns the next item (which is just the result of calling next on the iterator supplied in the constructor)
	*/
	next() {
		return this.iterator.next();
	}

	/** Build a stream from an iterable 
	* 
	* @param source iterable object to build a stream from.
	*/
	static from(source) {
		if (source[Symbol.iterator]) return new Stream(source[Symbol.iterator]());
		throw new TypeError("Can't figure out how to iterate over ", source);
	}

	/** Build a stream from an iterable 
	* 
	* @param source object to build a stream from.
	* @returns A stream of key/value pairs in the format [k,v] where k is the name of the attribute and v the value.
	*/
	static fromProperties(source) {
		let keys = Object.keys(source)[Symbol.iterator]();
		return new Stream( { next() { let { done, value } = keys.next(); return { done, value: [value, source[value]] } } } );
	}

	/** Build a stream from the given arguments.
	*
	* @param elements {...*} to convert into a stream.
	* @param a stream returning each argument in turn.
	*/
	static of(...elements) {
		return Stream.from(elements);
	}
}

class EmptyStream extends BaseStream {
	next() { return { done: true } }
}

Stream.EMPTY = new EmptyStream();

/** Stream that filters items based on a predicate function
*
* Stream will only return items for which predicate function evaluates to true.
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
		let current = this.iterator.next();
		if (current.done) return { done: true };
		return { done: false, value: this.mapper(current.value, this.index++, this.context) };
	}
}

/** Stream composed of two other streams.
*
* Resulting stream will return all elements from the first stream followed by all elements from the second
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
		this._nextOuter();
		return this.inner.next();
	}
}

module.exports = Stream;
