/**
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function () {
  'use strict';

  var PROMISE_REJECTION_LOGGING_DELAY = 10 * 1000; // 10s
  var logRejectionTimeoutId;
  var unhandledRejections = [];

  function logRejectedPromises() {
    unhandledRejections.forEach(function (reason) {
      CATALINA.Analytics.trackError('UnhandledPromiseRejection', reason);
    });

    unhandledRejections = [];
    logRejectionTimeoutId = null;
  }

  window.addEventListener('unhandledrejection', function (event) {
    debugLog('unhandledrejection fired: ' + event.reason);
    // Keep track of rejected promises by adding them to the list.
    unhandledRejections.push({promise: event.promise, reason: event.reason});

    // We need to wait before we log this rejected promise, since there's a
    // chance it will be caught later on, in which case it's not an error.
    if (!logRejectionTimeoutId) {
      logRejectionTimeoutId = setTimeout(logRejectedPromises,
        PROMISE_REJECTION_LOGGING_DELAY);
    }
  });

  window.addEventListener('rejectionhandled', function (event) {
    debugLog('rejectionhandled fired: ' + event.reason);

    // If a previously rejected promise is handled, remove it from the list.
    unhandledRejections = unhandledRejections.filter(function (rejection) {
      rejection.promise !== event.promise;
    });
  });


  function lazyLoadWCPolyfillsIfNecessary(callback) {
    callback = callback || null;
    var onload = function () {
      // For native Imports, manually fire WCR so user code
      // can use the same code path for native and polyfill'd imports.
      if (!window.HTMLImports) {
        document.dispatchEvent(
          new CustomEvent('WebComponentsReady', {bubbles: true}));
      }
      if (callback) {
        callback();
      }
    };

    var webComponentsSupported = (
    'registerElement' in document &&
    'import' in document.createElement('link') &&
    'content' in document.createElement('template'));

    if (webComponentsSupported) {
      onload();
    } else {
      var script = document.createElement('script');
      script.async = true;
      script.src = 'bower_components/webcomponentsjs/webcomponents-lite.min.js';
      script.onload = onload;
      document.head.appendChild(script);
    }

    if (!(CATALINA.Util.getChromeVersion() &&
      CATALINA.Util.getChromeVersion() >= 46 || CATALINA.Util.getFirefoxVersion() && CATALINA.Util.getFirefoxVersion() >= 40)) {
      var script = document.createElement('script');
      //script.async = true;
      script.src = 'https://cdn.polyfill.io/v2/polyfill.min.js?features=es6,intl';
      document.head.appendChild(script);
      ga('send', 'event', 'browser', 'unsupported-es6-intl', navigator.userAgent);
      console.log('Your browser is out-of-date. Please download one of these up-to-date, free and excellent browsers: Chrome, Chromium, Opera, Vivaldi');
    }
  }

  window.addEventListener('offline', function () {
    if (CATALINA.Elements && CATALINA.Elements.Template.$.toast) {
      CATALINA.Elements.Template.$.toast.showMessage(
        'You can still work offline.');
    }
  });

  // See https://developers.google.com/web/fundamentals/engage-and-retain/app-install-banners/advanced
  window.addEventListener('beforeinstallprompt', function (event) {
    CATALINA.Analytics.trackEvent('installprompt', 'fired');

    event.userChoice.then(function (choiceResult) {
      // choiceResult.outcome will be 'accepted' or 'dismissed'.
      // choiceResult.platform will be 'web' or 'android' if the prompt was
      // accepted, or '' if the prompt was dismissed.
      CATALINA.Analytics.trackEvent('installprompt', choiceResult.outcome,
        choiceResult.platform);
    });
  });

  function initApp() {
    // wc.js brings in a URL() polyfill that we need to wait for in unsupported
    // browsers. In Chrome, lazyLoadWCPolyfillsIfNecessary is effectively not
    // async. It's a noop and its callback gets invoked right away. Therefore,
    // this shouldn't slow anything down.
    lazyLoadWCPolyfillsIfNecessary(function () {
      CATALINA.Elements.init();
    });
  }

  initApp();
})();
