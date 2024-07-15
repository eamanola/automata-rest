const TerserPlugin = require('terser-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const entry = {
  index: ['./src/index.js'],
};

const output = {
  filename: 'index.bundle.js',
  library: { type: 'commonjs2' },
  path: `${__dirname}/dist`,
};

const aModule = {
  rules: [
    {
      exclude: [/node_modules/u],
      test: /\.js$/ui,
      use: {
        loader: 'babel-loader',
        options: { presets: ['@babel/preset-env'] },
      },
    },
  ],
};

const plugins = [];

const optimization = {
  minimizer: [new TerserPlugin()],
  minimize: true,
};

const resolve = {};

const experiments = {};

module.exports = {
  entry,
  experiments,
  externals: [nodeExternals()],
  externalsPresets: { node: true },
  mode: 'production',
  module: aModule,
  optimization,
  output,
  plugins,
  resolve,
};
