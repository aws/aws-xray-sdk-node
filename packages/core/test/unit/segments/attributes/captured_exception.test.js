var assert = require('chai').assert;
var CapturedException = require('../../../../lib/segments/attributes/captured_exception');

describe('CapturedException', function() {
  describe('#constructor', function() {
    it('should create a CapturedException for a String', function() {
      var err = 'Error here!';
      var captured = new CapturedException(err);

      assert.equal(captured.message, err);
      assert.equal(captured.type, '');
      assert.deepEqual(captured.stack, []);
    });

    it('should create a CapturedException for an Error', function() {
      var err = new Error('Error here!');
      var captured = new CapturedException(err);

      assert.equal(captured.message, err.message);
      assert.equal(captured.type, err.name);
      assert.isArray(captured.stack);
    });

    it('should create a CapturedException for an Error with no stack trace', function() {
      var err = { message: 'Error here!', name: 'Error'};
      var captured = new CapturedException(err);

      assert.deepEqual(captured.stack, []);
    });

    it('should create a CapturedException for an Error with a parsed stack trace', function() {
      var err = new Error('Test error');
      err.stack = ('Test error\n    at /path/to/file.js:200:15\n    ' +
        'at myTestFunction /path/to/another/file.js:20:30\n    ' +
        'at myTest [as _myTests] (test.js:10:5)');

      var stack = [
        {
          path: '/path/to/file.js',
          line: 200,
          label: 'anonymous'
        },
        {
          path: '/path/to/another/file.js',
          line: 20,
          label: 'myTestFunction'
        },
        {
          path: 'test.js',
          line: 10,
          label: 'myTest [as _myTests]'
        }
      ];

      var captured = new CapturedException(err);
      assert.deepEqual(captured.stack, stack);
    });

    it('should create a CapturedException with remote false by default', function() {
      var err = { message: 'Error here!', name: 'Error'};
      var captured = new CapturedException(err);

      assert.equal(captured.remote, false);
    });

    it('should create a CapturedException with remote true when set', function() {
      var err = { message: 'Error here!', name: 'Error'};
      var captured = new CapturedException(err, true);

      assert.equal(captured.remote, true);
    });
  });
});
