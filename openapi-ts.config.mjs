/** @type {import('@hey-api/openapi-ts').UserConfig} */
export default {
  input: './contracts/cli-openapi.json',
  output: {
    importFileExtension: '.js',
    path: './src/generated/cli-api',
  },
};
