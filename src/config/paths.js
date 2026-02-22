const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(BASE_DIR, 'data');

module.exports = {
  BASE_DIR,
  DATA_DIR
};
