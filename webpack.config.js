const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  resolve: {
    fallback: {
      "buffer": require.resolve("buffer/"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util/"),
      "events": require.resolve("events/"),
      "path": require.resolve("path-browserify"),
      "fs": false,
      "child_process": false,
      "worker_threads": false,
      "timers": require.resolve("timers-browserify"),
      "https": require.resolve("https-browserify"),
      "process": require.resolve("process/browser"),
    },
  },
  mode: 'production',
};
