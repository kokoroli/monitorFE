/**
 * @file init func
 * @author JYkid
 * @version 0.0.1-beta
 */

import Config from "./config";
import { getJsError, geetResourceError, ajaxError } from "./error";
import EventCenter from "./eventCenter";

/* eslint-disable */
function InitMonitor(userConfig) {
  let self = this;
  let config = new Config(userConfig);
  self._config = config;

  self._config.protocol = window.location.protocol + "//";
  if (config.https) {
    self._config.protocol = 'https://';
  }
  const eventCenter = new EventCenter();
  self._eventCenter = eventCenter;
  
  self._initListenJS();
  self._initListenAjax();
}

InitMonitor.prototype = {
  _initListenJS: function() {
    const self = this;

    // 监听全局下的 Promise 错误
    let unhandledrejection = function(err){
      getJsError(err, self._config);
    }
    window.addEventListener("unhandledrejection", unhandledrejection);
    self._setEvent({
      type: "unhandledrejection",
      func: unhandledrejection
    });
    
    // 监听全局下的error事件
    let errorEvent = function(err) {

      if (err.cancelable) {
        // 判断错误是否来自 monitor
        if (err.filename.indexOf('monitor') > -1 || process.env.NODE_ENV === 'development') {
          return;
        } else {
          getJsError(err, self._config);
        }
      } else {
        // 静态资源加载的error事件
        geetResourceError(err, self._config);
      }
    }
    window.addEventListener("error", errorEvent, true);
    self._setEvent({
      type: "error",
      func: errorEvent
    });
  },
  _initListenAjax: function () {
    let self = this;
    function ajaxEventTrigger(event) {
      var ajaxEvent = new CustomEvent(event, { detail: this });
      window.dispatchEvent(ajaxEvent);
    };
    
    var oldXHR = window.XMLHttpRequest;

    function newXHR() {
      var realXHR = new oldXHR();
     
      realXHR.addEventListener('load', function () {
        ajaxEventTrigger.call(this, 'ajaxLoad');
      }, false);
     
      realXHR.addEventListener('timeout', function () {
        ajaxEventTrigger.call(this, 'ajaxTimeout');
      }, false);
     
      realXHR.addEventListener('readystatechange', function() {
        ajaxEventTrigger.call(this, 'ajaxReadyStateChange');
      }, false);
     
      return realXHR;
    };
     
     window.XMLHttpRequest = newXHR;
     self._startLintenAjax();
  },
  _startLintenAjax: function() {
    const self = this;
    
    // ajax timeout
    let ajaxTimeout = function(err) {
      !(err.detail.responseURL.indexOf(self._config.url) > -1) && ajaxError(err, self._config);
    };
    window.addEventListener("ajaxTimeout", ajaxTimeout);
    self._setEvent({
      type: "ajaxTimeout",
      func: ajaxTimeout
    });

    // ajax load error
    let ajaxLoad = function(err) {
      !(err.detail.responseURL.indexOf(self._config.url) > -1) && ajaxError(err, self._config);
    }
    window.addEventListener("ajaxLoad", ajaxLoad);
    self._setEvent({
      type: "ajaxLoad",
      func: ajaxLoad
    });
  },
  _getEvent: function() {
    const self = this;
    return self._eventCenter._get();
  },
  _setEvent: function(event) {
    const self = this;
    self._eventCenter._set(event);
  },
}

module.exports = InitMonitor;