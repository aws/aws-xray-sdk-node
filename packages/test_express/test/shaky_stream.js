var stream = require('stream');
var util = require('util');

var Readable = stream.Readable;

var timeoutFn = typeof setTimeoutOrig === 'function' ? setTimeoutOrig : setTimeout;

/**
 * ShakyStream will send data in 2 parts, pausing between parts.
 * @param {object} options
 * @param {number} options.pauseFor Length of time in ms to pause stream when reading.
 */
function ShakyStream(options) {
    if (!(this instanceof ShakyStream)) {
        return new ShakyStream(options);
    }
    if (!options.highWaterMark) {
        options.highWaterMark = 1024 * 16;
    }
    this._shakyTime = options.pauseFor;
    this._didStart = false;
    this._isPaused = false;

    Readable.call(this, options);
}

util.inherits(ShakyStream, Readable);

ShakyStream.prototype._read = function _read(_) {
    if (!this._didStart) {
        this._didStart = true;
        this.push(Buffer.from('{"Count":1,"Items":[{"id":{"S":"2016-12-11"},"dateUTC":{"N":"1481494545591"},'));
    }
    if (this._didStart && this._isPaused) {
        return;
    } else if (this._didStart) {
        this._isPaused = true;
        var self = this;
        timeoutFn(function() {
            self.push(Buffer.from('"javascript":{"M":{"foo":{"S":"bar"},"baz":{"S":"buz"}}}}],"ScannedCount":1}'));
            self.push(null);
        }, this._shakyTime);
    }
};

module.exports = {ShakyStream: ShakyStream};
