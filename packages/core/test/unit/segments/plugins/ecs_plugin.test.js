var expect = require('chai').expect;
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.use(sinonChai);

var ECSPlugin = require('../../../../lib/segments/plugins/ecs_plugin');

describe('ECSPlugin', function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should return an object holding ECS metadata', function(done) {
    ECSPlugin.getData(function(data) {
      expect(data.ecs.container).not.to.be.empty;
      done();
    });
  });
});
