const AsyncStream = require('./asyncstream');
const Stream = require('./stream');

module.exports = { Stream, AsyncStream, from: Stream.from, of: Stream.of };