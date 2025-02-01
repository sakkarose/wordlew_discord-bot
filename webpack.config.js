const path = require('path-browserify');

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
      "url": require.resolve("url/"),
      "zlib": require.resolve("browserify-zlib"),
      "assert": require.resolve("assert/"),
      "async_hooks": false,
      "console": require.resolve("console-browserify"),
      "diagnostics_channel": false,
      "http": require.resolve("stream-http"),
      "http2": false,
      "net": false,
      "perf_hooks": false,
      "querystring": require.resolve("querystring-es3"),
      "tls": false,
      "util/types": require.resolve("util/"),
    },
  },
  mode: 'production',
};
