'use strict';

const config = require('./config');
const app = require('./app');

app.listen(config.port, () => {
  console.log(`[clinicapp] API escuchando en http://localhost:${config.port} (${config.env})`);
});
