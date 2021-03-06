# ![Software Plumbers](http://docs.softwareplumbers.com/common/img/SquareIdent-160.png) Iterator Plumbing

Synchronous and Asynchronous Iterator utilities, providing many standard array functions without the neeed to create an array.

## Example

```javascript
let stream = Stream.of([1,2,3,4,5,6,7,8,9]);

let result = stream.map(a=>a*7).filter(a=>a%2===0).slice(2,4).join(', ')
```

and result should equal '42, 56'. No itermediate arrays will be created; pipeline is typically more efficient than using the equivalent array methods.

## Asynchronous Streams

For i/o operations we may also want to work with promises. Accordingly, we support a modified version of the iterator 
protocol where next() returns a Promise that resolves to `{ done, value }` as opposed to directly returning it. Pipelines
such as the above example will work unchanged on an asynchronous stream with th exception that terminals (such as join)
return a Promise rather than a simple value.

For the latest API documentation see [The Software Plumbers Site](http://docs.softwareplumbers.com/iterator-plumbing/master)

## Project Status

Beta. It seems functional, and the unit tests pass.   

## Why another set of iterator utilities?

There's lots of good ones out there. However, features of this one that may appeal:

1. No transpilers, written in straight javascript
2. Trivial dependencies (tristate-logic is developed by same author)
3. API is so similar to Array that in many cases a stream pipeline can simply replace existing array-based code
4. Clean class-based implementation










