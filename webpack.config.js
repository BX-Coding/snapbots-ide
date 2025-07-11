import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';
import Dotenv from 'dotenv-webpack';

import * as url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));


export default {
  entry: path.join(__dirname, "src", "index.tsx"),
  output: {
    path: path.join(__dirname, "/build"),
  },
  mode: "development",
  devServer: {
    port: 8080,
    historyApiFallback: true,
    proxy: {
      '/api/modal/simulation': {
        target: 'https://eucalyptus--snapbot-simulation.modal.run/',
        pathRewrite: { '^/api/modal/simulation.js': '/generation' },
        changeOrigin: true,
        secure: false,
      },
      '/api/modal/hybrid': {
        target: 'https://eucalyptus--snapbot-hybrid.modal.run/',
        pathRewrite: { '^/api/modal/hybrid.js': '/generation' },
        changeOrigin: true,
        secure: false,
      }
    }
  },
  module: {
    rules: [
      // Still using babel loader for js files only to support funky CodeMirror component see BXC-210
      {
        test: /\.?(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              '@babel/preset-env', 
              ['@babel/preset-react', {"runtime": "automatic"}]
          ], plugins: [
            '@babel/plugin-syntax-import-assertions'
          ]
          }
        }
      },
      { 
        test: /\.tsx?$/, 
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            experimentalWatchApi: true,
            compiler: 'typescript',
          }
        }, 
        exclude: /node_modules/ 
      },
      { enforce: "pre", test: /\.js$/, exclude: /node_modules/, loader: "source-map-loader" },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.png$/,
        type: 'asset/resource'
      },
      {
        test: /\.svg$/,
        type: 'asset/resource'
      },
      {
        test: /\.(jpg|jpeg)$/,
        type: 'asset/resource'
      },
      {
        test: /\.ptch1$/,
        use: ['arraybuffer-loader'],
      },
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "public", "index.html"),
    }),
    new NodePolyfillPlugin(),
    new Dotenv({
      path: path.join(__dirname, ".env"),
      safe: true,
      allowEmptyValues: true,
      systemvars: true,
      silent: true,
      defaults: false
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  }
}