const chai = require('chai')
const expect = chai.expect;
const Stream = require('../src/stream');

const TEST_DATA = [ 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89 ];
const TEST_MAP1 = [ [ 'foo', 'bar' ], [ 'dinkum', 'thinkum'], ['wyoming','knot'], ['dick','seaton'] ];
const TEST_MAP2 = [ { name: 'peter', grade: 'A'}, { name: 'paul', grade: 'B'}, { name: 'jonathan', grade: 'D'} ];


describe('Stream', () => {

	it('clones an array', () => {
		expect(Stream.of(TEST_DATA).toArray()).to.deep.equal(TEST_DATA);
	});

	it('can concatenate streams', () => {
		expect(Stream.of(TEST_DATA).concat(Stream.of(TEST_DATA)).toArray()).to.deep.equal(TEST_DATA.concat(TEST_DATA));
	});

	it('efficiently concatenates streams', () => {

		let ts1 = Date.now();
		let result;
		for (let i = 0; i < 500; i++) {
			result = [];
			for (let j = 0; j < 200; j++) {
				result = result.concat(TEST_DATA);
			}
		}

		let ts2 = Date.now();
		let stream_result;

		for (let i = 0; i < 500; i++) {
			stream_result = Stream.of([]);
			for (let j = 0; j < 200; j++) {
				stream_result = stream_result.concat(Stream.of(TEST_DATA));
			}
		}
		let array=stream_result.toArray();
		let ts3 = Date.now();

		expect(array).to.deep.equal(result);
		//console.log(ts2-ts1, ts3-ts2);
		expect(ts2-ts1).to.be.greaterThan(ts3-ts2);
	});

	it('filters streams', ()=>{
		expect(Stream.of(TEST_DATA).filter(e=>e>10).toArray()).to.deep.equal(TEST_DATA.filter(e=>e>10));		
	});

	it ('maps streams', ()=>{
		expect(Stream.of(TEST_DATA).map(e=>e*10).toArray()).to.deep.equal(TEST_DATA.map(e=>e*10));
	});

	it ('reduces streams', ()=>{
		expect(Stream.of(TEST_DATA).reduce((v,e)=>v+e,0)).to.equal(TEST_DATA.reduce((v,e)=>v+e, 0));
	});

	it ('can do "every" test', ()=>{
		expect(Stream.of(TEST_DATA).every(e=>e<100)).to.be.true;
		expect(Stream.of(TEST_DATA).every(e=>e<50)).to.be.false;
	});

	it ('forEach visits every member', ()=>{

		let count = 0;
		Stream.of(TEST_DATA).forEach((e)=> {
			expect(e).to.equal(TEST_DATA[count]);
			count++
		});
		expect(count).to.equal(TEST_DATA.length);
	});

	it('efficiently performs chains of stream operations', () => {

		let big_array = [];

		for (let j = 0; j < 200; j++) {
			big_array = big_array.concat(TEST_DATA);
		}

		let result;
		let ts1 = Date.now();
		for (let i = 0; i < 200; i++) {
			result = big_array.filter(e=>e<50).map(e=>e*10);
		}

		let ts2 = Date.now();
		let stream_result;
		for (let i = 0; i < 200; i++) {
			stream_result = Stream.of(big_array).filter(e=>e<50).map(e=>e*10).toArray();
		}

		let ts3 = Date.now();

		expect(stream_result).to.deep.equal(result);
		expect(ts2-ts1).to.be.greaterThan(ts3-ts2);
	});

	it('can convert items to entries', ()=>{
		expect(Stream.of(TEST_DATA).entries().toArray()).to.deep.equal(new Stream(TEST_DATA.entries()).toArray());
	});

	it('supports find', ()=>{
		expect(Stream.of(TEST_DATA).find(e => e === 13)).to.equal(13);
		expect(Stream.of(TEST_DATA).find(e => e === 7)).to.be.undefined;
	});

	it('supports findIndex', ()=>{
		expect(Stream.of(TEST_DATA).findIndex(e => e === 13)).to.equal(TEST_DATA.findIndex(e => e === 13));
		expect(Stream.of(TEST_DATA).findIndex(e => e === 7)).to.equal(-1);		
	});

	it('supports includes', ()=>{
		expect(Stream.of(TEST_DATA).includes(13)).to.be.true;
		expect(Stream.of(TEST_DATA).includes(7)).to.be.false;				
	});

	it('supports indexOf', ()=>{
		expect(Stream.of(TEST_DATA).indexOf(13)).to.equal(TEST_DATA.indexOf(13));
		expect(Stream.of(TEST_DATA).indexOf(13,7)).to.equal(-1);
	});

	it('supports slice', ()=>{
		expect(Stream.of(TEST_DATA).slice(2,6).toArray()).to.deep.equal(TEST_DATA.slice(2,6));
	});

	it('supports join', ()=>{
		expect(Stream.of(TEST_DATA).join(',')).to.equal(TEST_DATA.join(','));
	});

	it('supports push', ()=>{
		let expected = Array.from(TEST_DATA);
		expected.push('77','88','99');
		expect(Stream.of(TEST_DATA).push('77','88','99').toArray()).to.deep.equal(expected);
	});

	it('supports some', ()=>{
		expect(Stream.of(TEST_DATA).some(e => e === 13)).to.be.true;
		expect(Stream.of(TEST_DATA).some(e => e === 6)).to.be.false;
	});

	it('converts items to Map', ()=>{
		expect(Array.from(Stream.of(TEST_MAP1).toMap().entries())).to.deep.equal(TEST_MAP1);
		expect(Array.from(Stream.of(TEST_MAP2).toMap(item=>item.name, item=>item.grade).entries())).to.deep.equal(TEST_MAP2.map(({name,grade})=>[name,grade]));
	});

});
