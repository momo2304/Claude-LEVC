'use strict';

const http = require('node:http');
const config = require('./src/config');
const { openDb } = require('./src/db');
const { createNotifier } = require('./src/notify');
const { createApp } = require('./src/app');

const db = openDb(config.dbPath);
const notifier = createNotifier(config);
const server = http.createServer(createApp({ config, db, notifier }));

server.listen(config.port, () => {
  console.log(`${config.brand.name} listening on ${config.siteUrl} (port ${config.port})`);
  if (!config.admin.password) console.warn('ADMIN_PASSWORD not set: /admin is disabled.');
  if (!config.notify.webhookUrl && !config.notify.resendApiKey) {
    console.warn('No SALES_WEBHOOK_URL or RESEND_API_KEY set: sales will only see bookings in /admin.');
  }
  if (!config.finance.enabled) console.warn('FCA_STATEMENT not set: finance page and finance copy are hidden.');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
