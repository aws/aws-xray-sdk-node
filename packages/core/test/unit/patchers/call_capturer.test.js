var assert = require('chai').assert;
var sinon = require('sinon');

var CallCapturer = require('../../../lib/patchers/call_capturer');

describe('CallCapturer', function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#constructor', function() {
    var jsonDoc = {
      services: {
        s3: {}
      }
    };

    it('should return a call capturer object loaded with the default JSON document', function() {
      var capturer = new CallCapturer();

      assert.instanceOf(capturer, CallCapturer);
      assert.property(capturer.services, 'dynamodb');
    });

    it('should return a call capturer object loaded with a custom JSON document given a file location', function() {
      var capturer = new CallCapturer('./test/resources/custom_whitelist.json');

      assert.instanceOf(capturer, CallCapturer);
      assert.property(capturer.services, 's3');
    });

    it('should return a call capturer object loaded with a custom source object', function() {
      var capturer = new CallCapturer(jsonDoc);

      assert.instanceOf(capturer, CallCapturer);
      assert.property(capturer.services, 's3');
    });
  });

  describe('#append', function() {
    var capturer;

    beforeEach(function() {
      capturer = new CallCapturer({ services: { s3: {} }});
    });

    it('should extend the current service list', function() {
      capturer.append({ services: { dynamodb: {} }});

      assert.property(capturer.services, 's3');
      assert.property(capturer.services, 'dynamodb');
    });
  });

  describe('#capture', function() {
    var jsonDocDynamoParams, jsonDocDynamoDesc, jsonDocSQS, responseDynamo, responseSQS;

    beforeEach(function() {
      responseDynamo = {
        request: {
          operation: 'getItem',
          params: {
            TableName: 'myTable',
            ProjectionExpression: 'Table',
            ConsistentRead: true,
            ExpressionAttributeNames: {
              '#attrName': 'SessionID'
            }
          }
        },
        data: {
          TableNames: ['hello'],
          ConsumedCapacity: '10'
        }
      };

      responseSQS = {
        request: {
          operation: 'sendMessageBatch',
          params: {}
        },
        data: {
          Failed: [1,2,3],
          Successful: [1,2,3,4,5,6,7]
        }
      };

      jsonDocDynamoParams = {
        services: {
          dynamodb: {
            operations: {
              getItem: {
                request_parameters: [ 'TableName' ],
                response_parameters: [ 'ConsumedCapacity' ]
              }
            }
          }
        }
      };

      jsonDocDynamoDesc = {
        services: {
          dynamodb: {
            operations: {
              getItem: {
                request_descriptors: {
                  ExpressionAttributeNames: {
                    get_keys: true,
                    rename_to: 'attribute_names_substituted'
                  }
                },
                response_descriptors: {
                  TableNames: {
                    list: true,
                    get_count: true
                  }
                }
              }
            }
          }
        }
      };

      jsonDocSQS = {
        services: {
          sqs: {
            operations: {
              sendMessageBatch: {
                response_descriptors: {
                  Failed: {
                    list: true,
                    get_count: true,
                  },
                  Successful: {
                    list: true,
                    get_count: true,
                  },
                }
              }
            }
          }
        }
      };
    });

    it('should capture the request and response params noted', function() {
      var capturer = new CallCapturer(jsonDocDynamoParams);
      var data = capturer.capture('dynamodb', responseDynamo);

      assert.deepEqual(data, { table_name: 'myTable', consumed_capacity: '10' });
    });

    it('should capture falsey request and response params noted', function() {
      responseDynamo.request.params.TableName = false;

      var capturer = new CallCapturer(jsonDocDynamoParams);
      var data = capturer.capture('dynamodb', responseDynamo);

      assert.deepEqual(data, { table_name: false, consumed_capacity: '10' });
    });

    it('should not capture the request param if missing', function() {
      delete responseDynamo.request.params.TableName;

      var capturer = new CallCapturer(jsonDocDynamoParams);
      var data = capturer.capture('dynamodb', responseDynamo);

      assert.notProperty(data, 'table_name');
      assert.propertyVal(data, 'consumed_capacity', '10');
    });

    it('should not capture the response param if missing', function() {
      delete responseDynamo.data.ConsumedCapacity;

      var capturer = new CallCapturer(jsonDocDynamoParams);
      var data = capturer.capture('dynamodb', responseDynamo);

      assert.notProperty(data, 'consumed_capacity');
    });

    it('should capture the request descriptors as noted', function() {
      var capturer = new CallCapturer(jsonDocDynamoDesc);
      var data = capturer.capture('dynamodb', responseDynamo);

      assert.deepEqual(data, { attribute_names_substituted: [ '#attrName' ], table_names: 1 });
    });

    it('should capture falsey request descriptors noted', function() {
      delete jsonDocDynamoDesc.services.dynamodb.operations.getItem.request_descriptors.ExpressionAttributeNames.get_keys;
      delete jsonDocDynamoDesc.services.dynamodb.operations.getItem.request_descriptors.ExpressionAttributeNames.rename_to;
      responseDynamo.request.params.ExpressionAttributeNames = false;

      var capturer = new CallCapturer(jsonDocDynamoDesc);
      var data = capturer.capture('dynamodb', responseDynamo);

      assert.propertyVal(data, 'expression_attribute_names', false);
    });

    it('should rename the request descriptor if noted', function() {
      var capturer = new CallCapturer(jsonDocDynamoDesc);
      var data = capturer.capture('dynamodb', responseDynamo);

      assert.property(data, 'attribute_names_substituted');
      assert.deepEqual(data.attribute_names_substituted, [ '#attrName' ]);
    });

    it('should not capture the request descriptor if missing', function() {
      delete responseDynamo.request.params.ExpressionAttributeNames;

      var capturer = new CallCapturer(jsonDocDynamoDesc);
      var data = capturer.capture('dynamodb', responseDynamo);

      assert.notProperty(data, 'attribute_names_substituted');
    });

    it('should capture the response descriptors as noted', function() {
      var capturer = new CallCapturer(jsonDocSQS);
      var data = capturer.capture('sqs', responseSQS);

      assert.deepEqual(data, { failed: 3, successful: 7 });
    });

    it('should not capture the response descriptor if missing', function() {
      delete responseSQS.data.Failed;

      var capturer = new CallCapturer(jsonDocSQS);
      var data = capturer.capture('sqs', responseSQS);

      assert.notProperty(data, 'failed');
      assert.propertyVal(data, 'successful', 7);
    });

    it('should rename the response descriptor if noted', function() {
      jsonDocSQS.services.sqs.operations.sendMessageBatch.response_descriptors.Failed.rename_to = 'error';

      var capturer = new CallCapturer(jsonDocSQS);
      var data = capturer.capture('sqs', responseSQS);

      assert.propertyVal(data, 'error', 3);
    });

    it('should ignore response data if null, in the event of an error', function () {
      var capturer = new CallCapturer(jsonDocSQS);
      responseSQS.data = null;
      var data = capturer.capture('sqs', responseSQS);

      assert.deepEqual(data, {});
    });
  });
});
