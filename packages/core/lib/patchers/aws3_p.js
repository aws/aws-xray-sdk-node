"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureAWSClient = void 0;
var service_error_classification_1 = require("@aws-sdk/service-error-classification");
var aws_1 = __importDefault(require("../segments/attributes/aws"));
var querystring_1 = require("querystring");
var subsegment_1 = __importDefault(require("../segments/attributes/subsegment"));
var contextUtils = require('../context_utils');
var logger = require('../logger');
var utils_1 = require("../utils");
function buildAttributesFromMetadata(client, command, metadata) {
    return __awaiter(this, void 0, void 0, function () {
        var extendedRequestId, requestId, statusCode, attempts, serviceIdentifier, operation, aws, _a, http;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    extendedRequestId = metadata.extendedRequestId, requestId = metadata.requestId, statusCode = metadata.httpStatusCode, attempts = metadata.attempts;
                    serviceIdentifier = client.config.serviceId;
                    operation = command.constructor.name.slice(0, -7);
                    _a = aws_1.default.bind;
                    _b = {
                        extendedRequestId: extendedRequestId,
                        requestId: requestId,
                        retryCount: attempts
                    };
                    _c = {
                        operation: operation
                    };
                    _d = {};
                    return [4 /*yield*/, client.config.region()];
                case 1:
                    aws = new (_a.apply(aws_1.default, [void 0, (_b.request = (_c.httpRequest = (_d.region = _e.sent(),
                            _d.statusCode = statusCode,
                            _d),
                            _c.params = command.input,
                            _c),
                            _b), serviceIdentifier]))();
                    http = { response: { status: statusCode || 0 } };
                    return [2 /*return*/, [aws, http]];
            }
        });
    });
}
function addFlags(http, subsegment, err) {
    var _a, _b;
    if (err && service_error_classification_1.isThrottlingError(err)) {
        subsegment.addThrottleFlag();
    }
    else if (((_a = http.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
        subsegment.addThrottleFlag();
    }
    var cause = utils_1.getCauseTypeFromHttpStatus((_b = http.response) === null || _b === void 0 ? void 0 : _b.status);
    if (cause === 'fault') {
        subsegment.addFaultFlag();
    }
    else if (cause === 'error') {
        subsegment.addErrorFlag();
    }
}
function captureAWSClient(client, manualSegment) {
    var _this = this;
    // create local copy so that we can later call it
    var send = client.send;
    var serviceIdentifier = client.config.serviceId;
    client.send = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(_this, void 0, void 0, function () {
            var command, segment, operation, output, subsegment, res, _a, aws, http, err_1, _b, aws, http, errObj;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        command = args[0];
                        segment = manualSegment || contextUtils.resolveSegment();
                        operation = command.constructor.name.slice(0, -7);
                        if (!segment) {
                            output = serviceIdentifier + '.' + operation;
                            if (!contextUtils.isAutomaticMode()) {
                                logger.getLogger().info('Call ' + output + ' requires a segment object' +
                                    ' on the request params as "XRaySegment" for tracing in manual mode. Ignoring.');
                            }
                            else {
                                logger.getLogger().info('Call ' + output +
                                    ' is missing the sub/segment context for automatic mode. Ignoring.');
                            }
                            return [2 /*return*/, send.apply(client, args)];
                        }
                        subsegment = segment.addNewSubsegment(serviceIdentifier);
                        subsegment.addAttribute('namespace', 'aws');
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 4, , 7]);
                        return [4 /*yield*/, send.apply(client, [command])];
                    case 2:
                        res = (_c.sent());
                        if (!res)
                            throw new Error('Failed to get response from instrumented AWS Client.');
                        return [4 /*yield*/, buildAttributesFromMetadata(client, command, res.$metadata)];
                    case 3:
                        _a = _c.sent(), aws = _a[0], http = _a[1];
                        subsegment.addAttribute('aws', aws);
                        subsegment.addAttribute('http', http);
                        addFlags(http, subsegment);
                        subsegment.close();
                        return [2 /*return*/, res];
                    case 4:
                        err_1 = _c.sent();
                        if (!err_1.$metadata) return [3 /*break*/, 6];
                        return [4 /*yield*/, buildAttributesFromMetadata(client, command, err_1.$metadata)];
                    case 5:
                        _b = _c.sent(), aws = _b[0], http = _b[1];
                        subsegment.addAttribute('aws', aws);
                        subsegment.addAttribute('http', http);
                        addFlags(http, subsegment, err_1);
                        _c.label = 6;
                    case 6:
                        errObj = { message: err_1.message, name: err_1.name, stack: err_1.stack || new Error().stack };
                        subsegment.close(errObj, true);
                        throw err_1;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    client.middlewareStack.add(function (next) { return function (args) { return __awaiter(_this, void 0, void 0, function () {
        var segment, parent;
        return __generator(this, function (_a) {
            segment = manualSegment || contextUtils.resolveSegment();
            if (!segment)
                return [2 /*return*/, next(args)];
            parent = (segment instanceof subsegment_1.default
                ? segment.segment
                : segment);
            args.request.headers['X-Amzn-Trace-Id'] = querystring_1.stringify({
                Root: parent.trace_id,
                Parent: segment.id,
                Sampled: parent.notTraced ? '0' : '1',
            }, ';');
            return [2 /*return*/, next(args)];
        });
    }); }; }, {
        step: 'build',
    });
    return client;
}
exports.captureAWSClient = captureAWSClient;
