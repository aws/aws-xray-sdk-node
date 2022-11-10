class SqsMessageHelper {

  static isSampled(message) {
    const {attributes} = message; // extract attributes from message
    if (!('AWSTraceHeader' in attributes)) {
      return false;
    }
    return attributes['AWSTraceHeader'].includes('Sampled=1');
  }
}

export default SqsMessageHelper;
