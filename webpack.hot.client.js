/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

// This alternative WebpackDevServer combines the functionality of:
// https://github.com/webpack/webpack-dev-server/blob/webpack-1/client/index.js
// https://github.com/webpack/webpack/blob/webpack-1/hot/dev-server.js

// It only supports their simplest configuration (hot updates on same server).
// It makes some opinionated choices on top, like adding a syntax error overlay
// that looks similar to our console output. The error overlay is inspired by:
// https://github.com/glenjamin/webpack-hot-middleware

/* eslint-disable */

var ansiHTML = require('ansi-html');
var SockJS = require('sockjs-client');
var stripAnsi = require('strip-ansi');
var url = require('url');
var Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();

// WARNING: this code is untranspiled and is used in browser too.
// Please make sure any changes are in ES5 or contribute a Babel compile step.

// Some custom utilities to prettify Webpack output.
// This is quite hacky and hopefully won't be needed when Webpack fixes this.
// https://github.com/webpack/webpack/issues/2878

var friendlySyntaxErrorLabel = 'Syntax error:';

function isLikelyASyntaxError(message) {
  return message.indexOf(friendlySyntaxErrorLabel) !== -1;
}

// Cleans up webpack error messages.
function formatMessage(message) {
  var lines = message.split('\n');

  // line #0 is filename
  // line #1 is the main error message
  if (!lines[0] || !lines[1]) {
    return message;
  }

  // Remove webpack-specific loader notation from filename.
  // Before:
  // ./~/css-loader!./~/postcss-loader!./src/App.css
  // After:
  // ./src/App.css
  if (lines[0].lastIndexOf('!') !== -1) {
    lines[0] = lines[0].substr(lines[0].lastIndexOf('!') + 1);
  }

  // Cleans up verbose "module not found" messages for files and packages.
  if (lines[1].indexOf('Module not found: ') === 0) {
    lines = [
      lines[0],
      // Clean up message because "Module not found: " is descriptive enough.
      lines[1].replace('Cannot resolve \'file\' or \'directory\' ', '').replace('Cannot resolve module ', '').replace('Error: ', ''),
      // Skip all irrelevant lines.
      // (For some reason they only appear on the client in browser.)
      '',
      lines[lines.length - 1] // error location is the last line
    ]
  }

  // Cleans up syntax error messages.
  if (lines[1].indexOf('Module build failed: ') === 0) {
    // For some reason, on the client messages appear duplicated:
    // https://github.com/webpack/webpack/issues/3008
    // This won't happen in Node but since we share this helpers,
    // we will dedupe them right here. We will ignore all lines
    // after the original error message text is repeated the second time.
    var errorText = lines[1].substr('Module build failed: '.length);
    var cleanedLines = [];
    var hasReachedDuplicateMessage = false;
    // Gather lines until we reach the beginning of duplicate message.
    lines.forEach(function(line, index) {
      if (
      // First time it occurs is fine.
      index !== 1 &&
      // line.endsWith(errorText)
      line.length >= errorText.length && line.indexOf(errorText) === line.length - errorText.length) {
        // We see the same error message for the second time!
        // Filter out repeated error message and everything after it.
        hasReachedDuplicateMessage = true;
      }
      if (!hasReachedDuplicateMessage ||
      // Print last line anyway because it contains the source location
      index === lines.length - 1) {
        // This line is OK to appear in the output.
        cleanedLines.push(line);
      }
    });
    // We are clean now!
    lines = cleanedLines;
    // Finally, brush up the error message a little.
    lines[1] = lines[1].replace('Module build failed: SyntaxError:', friendlySyntaxErrorLabel);
  }

  // Reassemble the message.
  message = lines.join('\n');
  // Internal stacks are generally useless so we strip them
  message = message.replace(/^\s*at\s.*:\d+:\d+[\s\)]*\n/gm, ''); // at ... ...:x:y

  return message;
}

function formatWebpackMessages(json) {
  var formattedErrors = json.errors.map(function(message) {
    return 'Error in ' + formatMessage(message)
  });
  var formattedWarnings = json.warnings.map(function(message) {
    return 'Warning in ' + formatMessage(message)
  });
  var result = {
    errors: formattedErrors,
    warnings: formattedWarnings
  };
  if (result.errors.some(isLikelyASyntaxError)) {
    // If there are any syntax errors, show just them.
    // This prevents a confusing ESLint parsing error
    // preceding a much more useful Babel syntax error.
    result.errors = result.errors.filter(isLikelyASyntaxError);
  }
  return result;
}

// Color scheme inspired by https://github.com/glenjamin/webpack-hot-middleware
var colors = {
  reset: [
    'transparent', 'transparent'
  ],
  black: '181818',
  red: 'E36049',
  green: 'B3CB74',
  yellow: 'FFD080',
  blue: '7CAFC2',
  magenta: '7FACCA',
  cyan: 'C3C2EF',
  lightgrey: 'EBE7E3',
  darkgrey: '6D7891'
};
ansiHTML.setColors(colors);

function createOverlayIframe(onIframeLoad) {
  var iframe = document.createElement('iframe');
  iframe.id = 'react-dev-utils-webpack-hot-dev-client-overlay';
  iframe.src = 'about:blank';
  iframe.style.position = 'fixed';
  iframe.style.left = 0;
  iframe.style.top = 0;
  iframe.style.right = 0;
  iframe.style.bottom = 0;
  iframe.style.width = '100vw';
  iframe.style.height = '100vh';
  iframe.style.border = 'none';
  iframe.style.zIndex = 9999999999;
  iframe.onload = onIframeLoad;
  return iframe;
}

function addOverlayDivTo(iframe) {
  var div = iframe.contentDocument.createElement('div');
  div.id = 'react-dev-utils-webpack-hot-dev-client-overlay-div';
  div.style.position = 'fixed';
  div.style.boxSizing = 'border-box';
  div.style.left = 0;
  div.style.top = 0;
  div.style.right = 0;
  div.style.bottom = 0;
  div.style.width = '100vw';
  div.style.height = '100vh';
  div.style.backgroundColor = 'black';
  div.style.color = '#E8E8E8';
  div.style.fontFamily = 'Menlo, Consolas, monospace';
  div.style.fontSize = 'large';
  div.style.padding = '2rem';
  div.style.lineHeight = '1.2';
  div.style.whiteSpace = 'pre-wrap';
  div.style.overflow = 'auto';
  iframe.contentDocument.body.appendChild(div);
  return div;
}

var overlayIframe = null;
var overlayDiv = null;
var lastOnOverlayDivReady = null;

function ensureOverlayDivExists(onOverlayDivReady) {
  if (overlayDiv) {
    // Everything is ready, call the callback right away.
    onOverlayDivReady(overlayDiv);
    return;
  }

  // Creating an iframe may be asynchronous so we'll schedule the callback.
  // In case of multiple calls, last callback wins.
  lastOnOverlayDivReady = onOverlayDivReady;

  if (overlayIframe) {
    // We're already creating it.
    return;
  }

  // Create iframe and, when it is ready, a div inside it.
  overlayIframe = createOverlayIframe(function onIframeLoad() {
    overlayDiv = addOverlayDivTo(overlayIframe);
    // Now we can talk!
    lastOnOverlayDivReady(overlayDiv);
  });

  // Zalgo alert: onIframeLoad() will be called either synchronously
  // or asynchronously depending on the browser.
  // We delay adding it so `overlayIframe` is set when `onIframeLoad` fires.
  document.body.appendChild(overlayIframe);
}

function showErrorOverlay(message) {
  ensureOverlayDivExists(function onOverlayDivReady(overlayDiv) {
    // Make it look similar to our terminal.
    overlayDiv.innerHTML = '<span style="color: #' + colors.red + '">Failed to compile.</span><br><br>' + ansiHTML(entities.encode(message));
  });
}

function destroyErrorOverlay() {
  if (!overlayDiv) {
    // It is not there in the first place.
    return;
  }

  // Clean up and reset internal state.
  document.body.removeChild(overlayIframe);
  overlayDiv = null;
  overlayIframe = null;
  lastOnOverlayDivReady = null;
}

// Connect to WebpackDevServer via a socket.
var connection = new SockJS(url.format({
  protocol: window.location.protocol, hostname: window.location.hostname, port: window.location.port,
  // Hardcoded in WebpackDevServer
  pathname: '/sockjs-node'
}));

// Unlike WebpackDevServer client, we won't try to reconnect
// to avoid spamming the console. Disconnect usually happens
// when developer stops the server.
connection.onclose = function() {
  console.info('The development server has disconnected.\nRefresh the page if necessary.');
};

// Remember some state related to hot module replacement.
var isFirstCompilation = true;
var mostRecentCompilationHash = null;
var hasCompileErrors = false;

function clearOutdatedErrors() {
  // Clean up outdated compile errors, if any.
  if (hasCompileErrors && typeof console.clear === 'function') {
    console.clear();
  }
}

// Successful compilation.
function handleSuccess() {
  clearOutdatedErrors();
  destroyErrorOverlay();

  var isHotUpdate = !isFirstCompilation;
  isFirstCompilation = false;
  hasCompileErrors = false;

  // Attempt to apply hot updates or reload.
  if (isHotUpdate) {
    tryApplyUpdates();
  }
}

// Compilation with warnings (e.g. ESLint).
function handleWarnings(warnings) {
  clearOutdatedErrors();
  destroyErrorOverlay();

  var isHotUpdate = !isFirstCompilation;
  isFirstCompilation = false;
  hasCompileErrors = false;

  function printWarnings() {
    // Print warnings to the console.
    for (var i = 0; i < warnings.length; i++) {
      console.warn(stripAnsi(warnings[i]));
    }
  }

  // Attempt to apply hot updates or reload.
  if (isHotUpdate) {
    tryApplyUpdates(function onSuccessfulHotUpdate() {
      // Only print warnings if we aren't refreshing the page.
      // Otherwise they'll disappear right away anyway.
      printWarnings();
    });
  } else {
    // Print initial warnings immediately.
    printWarnings();
  }
}

// Compilation with errors (e.g. syntax error or missing modules).
function handleErrors(errors) {
  clearOutdatedErrors();

  isFirstCompilation = false;
  hasCompileErrors = true;

  // "Massage" webpack messages.
  var formatted = formatWebpackMessages({errors: errors, warnings: []});

  // Only show the first error.
  showErrorOverlay(formatted.errors[0]);

  // Also log them to the console.
  for (var i = 0; i < formatted.errors.length; i++) {
    console.error(stripAnsi(formatted.errors[i]));
  }

  // Do not attempt to reload now.
  // We will reload on next success instead.
}

// There is a newer version of the code available.
function handleAvailableHash(hash) {
  // Update last known compilation hash.
  mostRecentCompilationHash = hash;
}

// Handle messages from the server.
connection.onmessage = function(e) {
  var message = JSON.parse(e.data);
  switch (message.type) {
    case 'hash':
      handleAvailableHash(message.data);
      break;
    case 'ok':
      handleSuccess();
      break;
    case 'warnings':
      handleWarnings(message.data);
      break;
    case 'errors':
      handleErrors(message.data);
      break;
    default:
      // Do nothing.
  }
}

// Is there a newer version of this code available?
function isUpdateAvailable() {
  /* globals __webpack_hash__ */
  // __webpack_hash__ is the hash of the current compilation.
  // It's a global variable injected by Webpack.
  return mostRecentCompilationHash !== __webpack_hash__;
}

// Webpack disallows updates in other states.
function canApplyUpdates() {
  return module.hot.status() === 'idle';
}

// Attempt to update code on the fly, fall back to a hard reload.
function tryApplyUpdates(onHotUpdateSuccess) {
  if (!module.hot) {
    // HotModuleReplacementPlugin is not in Webpack configuration.
    window.location.reload();
    return;
  }

  if (!isUpdateAvailable() || !canApplyUpdates()) {
    return;
  }

  function handleApplyUpdates(err, updatedModules) {
    if (err || !updatedModules) {
      window.location.reload();
      return;
    }

    if (typeof onHotUpdateSuccess === 'function') {
      // Maybe we want to do something.
      onHotUpdateSuccess();
    }

    if (isUpdateAvailable()) {
      // While we were updating, there was a new update! Do it again.
      tryApplyUpdates();
    }
  }

  // https://webpack.github.io/docs/hot-module-replacement.html#check
  var result = module.hot.check(/* autoApply */
  true, handleApplyUpdates);

  // // Webpack 2 returns a Promise instead of invoking a callback
  if (result && result.then) {
    result.then(function(updatedModules) {
      handleApplyUpdates(null, updatedModules);
    }, function(err) {
      handleApplyUpdates(err, null);
    });
  }
};
