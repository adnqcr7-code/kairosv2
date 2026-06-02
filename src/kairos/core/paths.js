const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_KAIROS_DATA_DIR = path.join(ROOT_DIR, 'data', 'kairos');

module.exports = {
  DEFAULT_KAIROS_DATA_DIR,
  ROOT_DIR
};
