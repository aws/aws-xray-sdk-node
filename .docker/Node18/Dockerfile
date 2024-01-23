FROM node:18
COPY . /var/xray
RUN cd /var/xray \
    && npm install -g typescript lerna@6 mocha \
    && rm package-lock.json \
    && npm install \
    && cd /var/xray/packages/core \
    && npm run prepare \
    && npm run copy-lib \
    && npm install -g \
    && cd /var/xray/sdk_contrib \
    && npm install \
    && npm link aws-xray-sdk-core