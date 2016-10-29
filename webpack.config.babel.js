import webpack, {
  LoaderOptionsPlugin,
  DefinePlugin,
  NoErrorsPlugin,
  HotModuleReplacementPlugin,
  ProvidePlugin
} from 'webpack'

import path from 'path'

import autoprefixer from 'autoprefixer'
import precss from 'precss'
import smart_import from 'postcss-smart-import'

import ManifestPlugin from 'webpack-manifest-plugin'
import ExtractTextPlugin from 'extract-text-webpack-plugin'
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin'
import CompressionPlugin from 'compression-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import ImageminPlugin from 'imagemin-webpack-plugin'

const {UglifyJsPlugin, CommonsChunkPlugin, DedupePlugin} = webpack.optimize

const cssLoaderOptions = 'modules&minimize=1&importLoaders=1&localIdentName=[path]__[name]_[local]__[hash:base64:8]!postcss'

const ENV = process.env.NODE_ENV || 'development'

const output = {
  path: path.join(__dirname, 'build'),
  pathinfo: true,
  filename: 'static/js/[name].[hash:8].js',
  chunkFilename: 'static/js/[name].[hash:8].chunk.js'
}

const entry = {
  app: './index.js',
  vendor: ['babel-polyfill', 'whatwg-fetch', 'es6-promise']
}

const rules = [
  {
    test: /\.(js|jsx)$/,
    exclude: /node_modules/,
    loader: 'babel',
    query: {
      babelrc: true
    }
  }, {
    test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/,
    loader: 'file',
    query: {
      name: 'static/media/[name].[hash:8].[ext]'
    }
  },
  // "url" loader works just like "file" loader but it also embeds
  // assets smaller than specified size as data URLs to avoid requests.
  {
    test: /\.(mp4|webm|wav|mp3|m4a|aac|oga)(\?.*)?$/,
    loader: 'url',
    query: {
      limit: 10000,
      name: 'static/media/[name].[hash:8].[ext]'
    }
  }
]

const config = {
  context: path.join(__dirname, 'src'),
  entry,
  output,
  module: {
    rules
  },
  resolve: {
    alias: {
      css: path.join(__dirname, 'src/assets/css'),
      img: path.join(__dirname, 'src/assets/images'),
      fonts: path.join(__dirname, 'src/assets/fonts'),
      components: path.join(__dirname, 'src/app/components')
    }
  },
  plugins: [
    new DefinePlugin({ENV: JSON.stringify(ENV)}),
    new CommonsChunkPlugin({name: 'vendor', filename: 'static/js/vendor.[hash:8].js'}),
    new LoaderOptionsPlugin({
      debug: ENV === 'development',
      options: {
        postcss: () => [smart_import, precss, autoprefixer]
      }
    }),
    new ManifestPlugin({fileName: 'asset-manifest.json'}),
    new HtmlWebpackPlugin({
      inject: true,
      template: path.join(__dirname, 'public/index.html'),
      // Change to your title
      title: 'App - Example',
      favicon: path.join(__dirname, 'public/favicon.ico'),
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      }
    }),
    new CaseSensitivePathsPlugin,
    new ProvidePlugin({Promise: 'exports?global.Promise!es6-promise', fetch: 'whatwg-fetch'}),
    new CompressionPlugin({
      asset: '[path].gz[query]',
      algorithm: 'gzip',
      test: /\.js$|\.html$/,
      threshold: 10240,
      minRatio: 0.8
    }),
    new ImageminPlugin({
      disable: false,
      optipng: {
        optimizationLevel: 3
      },
      gifsicle: {
        optimizationLevel: 1
      },
      jpegtran: {
        progressive: false
      },
      svgo: {},
      pngquant: null, // pngquant is not run unless you pass options here
      plugins: []
    })
  ],
  bail: true,
  cache: true,
  devtool: 'hidden-source-map'
}

if (ENV === 'development') {
  /************************************************************************
  *                               DEVELOPMENT
  *************************************************************************/

  config.module.rules.push({
    test: /\.(scss|sass|css)$/,
    use: [
      'style-loader', {
        loader: 'css-loader',
        options: {
          localIdentName: '[path]__[name]_[local]__[hash:base64:8]',
          modules: 1,
          importLoaders: 1
        }
      }, {
        loader: 'postcss-loader'
      }
    ]
  })

  config.plugins.push(new HotModuleReplacementPlugin())
  config.plugins.push(new NoErrorsPlugin())

  config.entry = [
    // require.resolve('webpack-dev-server/client') + '?/',
    // require.resolve('webpack/hot/dev-server'),
    require.resolve('./webpack.hot.client'),
    './index.js'
  ]
  // config.devtool = 'inline-source-map'
  config.devtool = 'eval-source-map'
} else {
  /************************************************************************
  *                               PRODUCTION
  *************************************************************************/
  config.plugins.push(new UglifyJsPlugin({
    sourceMap: true,
    compress: {
      sequences: true,
      dead_code: true,
      unused: true
    },
    compressor: {
      warnings: false
    },
    output: {
      comments: false
    }
  }))

  config.module.rules.push({
    test: /\.(scss|sass|css)$/,
    loader: ExtractTextPlugin.extract({
      fallbackLoader: 'style-loader',
      loader: [`css-loader?${cssLoaderOptions}`, 'postcss-loader']
    })
  })
  config.plugins.push(new DedupePlugin)
  config.plugins.push(new ExtractTextPlugin('static/css/style.[hash:8].css'))
}

export default config
