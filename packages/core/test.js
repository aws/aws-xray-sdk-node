var logger = require('./lib/logger')

delete console['debug']
delete console['log']
logger.getLogger().setLevel('debug')
logger.getLogger().debug('hello')