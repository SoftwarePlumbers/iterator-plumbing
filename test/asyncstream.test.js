const chai = require('chai');
const promises = require('chai-as-promised');
const expect = chai.expect;
const AsyncStream = require('../src/asyncstream');
const Stream = require('../src/stream');

chai.use(promises);

function delayed_iterable(iterable) {

	return {
		iterable,
		[Symbol.iterator] : () => {
			let iterator = iterable[Symbol.iterator]();
			return { 
				next: () => new Promise((resolve, reject) => setTimeout(() => resolve(iterator.next()),20))
			}
		}
	};
}

const TEST_DATA = delayed_iterable([ 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89 ]);
const TEST_MAP1 = delayed_iterable([ [ 'foo', 'bar' ], [ 'dinkum', 'thinkum'], ['wyoming','knot'], ['dick','seaton'] ]);
const TEST_MAP2 = delayed_iterable([ { name: 'peter', grade: 'A'}, { name: 'paul', grade: 'B'}, { name: 'jonathan', grade: 'D'} ]);
const TEST_OBJ1 = { foo: 'bar', dinkum: 'thinkum', wyoming: 'knot', dick: 'seaton' };
const TEST_OBJ2 = { peter: 'A', paul: 'B', jonathan: 'D' };
const TEST_ARR1 = [ 'foo','bar','dinkum','thinkum','wyoming','knot','dick','seaton' ];




describe('Async Stream', () => {


	it('clones an array', () => {
		return expect(AsyncStream.from(TEST_DATA).toArray()).to.eventually.deep.equal(TEST_DATA.iterable);
	});

	it('can concatenate streams', () => {
		return expect(
			AsyncStream
				.from(TEST_DATA)
				.concat(AsyncStream
					.from(TEST_DATA))
					.toArray())
			.to.eventually.deep.equal(TEST_DATA.iterable.concat(TEST_DATA.iterable));
	});

	it('filters streams', ()=>{
		return expect(
			AsyncStream
				.from(TEST_DATA)
				.filter(e=>e>10)
				.toArray())
			.to.eventually.deep.equal(TEST_DATA.iterable.filter(e=>e>10));		
	});

	it ('maps streams', ()=>{
		return expect(
			AsyncStream
				.from(TEST_DATA)
				.map(e=>e*10)
				.toArray())
			.to.eventually.deep.equal(TEST_DATA.iterable.map(e=>e*10));
	});

	it ('reduces streams', ()=>{
		return expect(
			AsyncStream
				.from(TEST_DATA)
				.reduce((v,e)=>v+e,0))
			.to.eventually.equal(TEST_DATA.iterable.reduce((v,e)=>v+e, 0));
	});

	it ('can do "every" test', ()=>{
		return Promise.all([
			expect(
				AsyncStream
					.from(TEST_DATA)
					.every(e=>e<100))
				.to.eventually.be.true,
			expect(
				AsyncStream
					.from(TEST_DATA)
					.every(e=>e<50))
				.to.eventually.be.false
		]);
	});

	it ('forEach visits every member', ()=>{

		let count = 0;
		let result = true;
		return expect(
			AsyncStream
				.from(TEST_DATA)
				.forEach((e)=> {
					result = result && e === TEST_DATA.iterable[count];
					count++
				})
				.then(()=>({result,count})))
			.to.eventually.deep.equal({ result: true, count: TEST_DATA.iterable.length});
	});


	it('can convert items to entries', ()=>{
		return expect(
			AsyncStream
				.from(TEST_DATA)
				.entries()
				.toArray())
			.to.eventually.deep.equal(new Stream(TEST_DATA.iterable.entries()).toArray());
	});

	it('supports find', ()=>{
		return Promise.all([
			expect(
				AsyncStream
					.from(TEST_DATA)
					.find(e => e === 13))
				.to.eventually.equal(13),
			expect(
				AsyncStream
					.from(TEST_DATA)
					.find(e => e === 7))
				.to.eventually.be.undefined
		]);
	});

	it('supports findIndex', ()=>{
		return Promise.all([
			expect(
				AsyncStream
					.from(TEST_DATA)
					.findIndex(e => e === 13))
				.to.eventually.equal(TEST_DATA.iterable.findIndex(e => e === 13)),
			expect(
				AsyncStream
					.from(TEST_DATA)
					.findIndex(e => e === 7))
				.to.eventually.equal(-1)
		]);		
	});

	it('supports includes', ()=>{
		return Promise.all([
			expect(
				AsyncStream
					.from(TEST_DATA)
					.includes(13))
			.to.eventually.be.true,
			expect(
				AsyncStream
					.from(TEST_DATA)
					.includes(7))
			.to.eventually.be.false
		]);				
	});

	it('supports indexOf', ()=>{
		return Promise.all([
			expect(
				AsyncStream
					.from(TEST_DATA)
					.indexOf(13))
			.to.eventually.equal(TEST_DATA.iterable.indexOf(13)),
			expect(
				AsyncStream
					.from(TEST_DATA)
					.indexOf(13,7))
			.to.eventually.equal(-1)
		]);
	});

	it('supports slice', ()=>{
		return expect(
			AsyncStream
				.from(TEST_DATA)
				.slice(2,6)
				.toArray())
		.to.eventually.deep.equal(TEST_DATA.iterable.slice(2,6));
	});

	it('supports join', ()=>{
		return expect(
			AsyncStream
				.from(TEST_DATA)
				.join(','))
			.to.eventually.equal(TEST_DATA.iterable.join(','));
	});

	it('supports push', ()=>{
		let expected = Array.from(TEST_DATA.iterable);
		expected.push('77','88','99');
		return expect(
			AsyncStream
				.from(TEST_DATA)
				.push('77','88','99')
				.toArray())
			.to.eventually.deep.equal(expected);
	});

	it('supports shift', ()=>{
		let expected = Array.from(TEST_DATA.iterable);
		let s = expected.shift();
		let stream = AsyncStream.from(TEST_DATA);
		return expect(stream.shift()).to.eventually.equal(s)
			.then(expect(stream.toArray()).to.eventually.deep.equal(expected));
	});

	it('supports some', ()=>{
		return Promise.all([
			expect(AsyncStream.from(TEST_DATA).some(e => e === 13)).to.eventually.be.true,
			expect(AsyncStream.from(TEST_DATA).some(e => e === 6)).to.eventually.be.false
		]);
	});

	it('converts items to Map', ()=>{
		return Promise.all([
			expect(
				AsyncStream
					.from(TEST_MAP1)
					.toMap()
					.then(map=>Array.from(map.entries())))
			.to.eventually.deep.equal(TEST_MAP1.iterable),

			expect(
				AsyncStream
					.from(TEST_MAP2)
					.toMap(item=>item.name, item=>item.grade)
					.then(map=>Array.from(map.entries())))
			.to.eventually.deep.equal(TEST_MAP2.iterable.map(({name,grade})=>[name,grade]))
		]);
	});


	it('converts "of"  parameters to a stream', ()=>{
		let stream = AsyncStream.of(1,1,2,3,5);
		return expect(stream.toArray()).to.eventually.deep.equal([1,1,2,3,5]);		
	});

	it('converts items to object', ()=>{
		let stream = AsyncStream.from(TEST_MAP1);
		return expect(stream.toObject()).to.eventually.deep.equal(TEST_OBJ1);		
	});

	it('flattens a stream', ()=>{
		let stream = AsyncStream.from(TEST_MAP1).flatten();
		return expect(stream.toArray()).to.eventually.deep.equal(TEST_ARR1);
	});

	it('converts entries to values', ()=>{
		let stream = AsyncStream.from(TEST_MAP1);
		return expect(stream.toValues()).to.eventually.deep.equal(TEST_MAP1.iterable.map(([k,v])=>v));		
	});

});