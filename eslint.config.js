// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Biến toàn cục do PocketBase cung cấp trong pb_migrations / pb_hooks (JSVM).
const pocketbaseGlobals = {
  migrate: 'readonly',
  Collection: 'readonly',
  onRecordAfterCreateSuccess: 'readonly',
  onRecordAfterUpdateSuccess: 'readonly',
  onRecordAfterDeleteSuccess: 'readonly',
  onRecordEnrich: 'readonly',
  routerAdd: 'readonly',
  cronAdd: 'readonly',
  __hooks: 'readonly',
  $app: 'readonly',
  $apis: 'readonly',
  $security: 'readonly',
  $dbx: 'readonly',
  $os: 'readonly',
  Record: 'readonly',
  TextField: 'readonly',
  DateField: 'readonly',
  require: 'readonly',
  module: 'writable',
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'server/pb_data/*'],
  },
  {
    files: ['server/pb_migrations/**/*.js', 'server/pb_hooks/**/*.js'],
    languageOptions: { globals: pocketbaseGlobals },
  },
  {
    files: ['server/tests/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly', fetch: 'readonly' } },
  },
]);
