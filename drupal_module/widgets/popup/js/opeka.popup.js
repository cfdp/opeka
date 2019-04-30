/**
 * This script must be added to all pages where the popup should be shown.
 */

var Drupal = Drupal || {},
    opekaPopupWidgets = opekaPopupWidgets|| {},
    jQuery = jQuery|| {};

(function($, Drupal, opekaPopupWidgets, undefined){
  var i = 0;
  Drupal.behaviors.opeka_widgetsPopupData = {

    attach: function(context, settings) {
      // Add wrapper for widgets to DOM and load widgets once the chat server is ready
      $(context).find("body").once("add-opeka-widgets").each(function () {
        $('body').append('<div class="curachat-widgets"><div class="ungrevers-chat"></div></div>');
        if (!$.isEmptyObject(opekaPopupWidgets)){
          Drupal.behaviors.opeka_widgets.waitForOpekaServer(opekaPopupWidgets);
        }
        else {
          console.error("Opeka popup widgets not defined.");
        }
      });
    }
  }
  
  Drupal.behaviors.opeka_widgets = {};
  
  /**
   * Wait for the external server script to load
   * We don't want to wait more than 10 seconds
   * @todo: we should check the the connect.js script to see if server is up
   */
  Drupal.behaviors.opeka_widgets.waitForOpekaServer = function(allPopups) {
    $.each(allPopups, function(k,v) {
      // Check if the popup has been closed by the client earlier
      if (!(Drupal.behaviors.opeka_widgets.getCookie(v.chatName) === "yes")) {
        setTimeout(function () {
          Drupal.behaviors.opeka_widgets.addWidget(v);
        }, 1000);     
      }
    });
  };

  /**
   * Initialize widget and add it to the page
   * @param {Object} widget An instance of the popupController object
   */
  Drupal.behaviors.opeka_widgets.addWidget = function(widget) {
    var newWidget = new Drupal.behaviors.opeka_widgets.OpekaPopupController(widget);
    newWidget.init();
  };
  
  /**
   * Constructor function for the popup widgets
   *
   * @param {Object} opekaPopup Object containing various settings
   *
   * See embed.html for example values
   */
  Drupal.behaviors.opeka_widgets.OpekaPopupController = function(opekaPopup) {
    this.chatType = opekaPopup.chatType || "default"; // "default" accommodates both pair and group chats
    this.baseURL = opekaPopup.baseURL;
    //this.chatURL = opekaPopup.baseURL + '/opeka-widgets/popup/' + this.chatType + '?client_url=' + opekaPopup.clientURL;
    this.chatURL = opekaPopup.baseURL + '/opeka-widgets/popup' + '?client_url=' + opekaPopup.clientURL;
    this.chatName = opekaPopup.chatName;
    this.cssFiles = opekaPopup.cssFiles;
    this.embedLocation = opekaPopup.embedLocation;
    this.widgetSize = opekaPopup.widgetSize;
  };
  
  /**
   * Init function
   */
  Drupal.behaviors.opeka_widgets.OpekaPopupController.prototype.init = function(){
    this.addOpekaPopupCss();
    this.addEmbedHTML(this.chatName);
    this.popupAnimation(this.chatName);
    this.addMsgListener();
  };

  /**
   * Add custom CSS file to HEAD
   * @param {string} cssId Id of the css file - the name of the CSS file
   * @param {string} cssPath Absolute path to the directory of the CSS file
   */
  Drupal.behaviors.opeka_widgets.OpekaPopupController.prototype.addOpekaPopupCss = function() {
    var cssFiles = this.cssFiles;
    // Check if there's any css files to add.
    // The cssFiles global is initialized in embed.html
    if (typeof cssFiles !== 'undefined' && cssFiles.length > 0) {
      /* Add CSS files to HEAD */
      $.each(cssFiles, function (i, val) {
        if (!document.getElementById(cssFiles[i][0])) {
          var head = document.getElementsByTagName('head')[0];
          var link = document.createElement('link');
          link.id = cssFiles[i][0];
          link.rel = 'stylesheet';
          link.type = 'text/css';
          link.href = cssFiles[i][1] + cssFiles[i][0];
          link.media = 'all';
          head.appendChild(link)
        }
      });
    }
  };

  // Add the popup HTML to the page
  Drupal.behaviors.opeka_widgets.OpekaPopupController.prototype.addEmbedHTML = function() {

    $(this.embedLocation).append('<div class="opeka-chat-popup-wrapper ' + this.chatName + 
      '"><div id="opeka-chat-iframe-' + this.chatName + '"><iframe src="' + this.chatURL + 
      '" frameborder="0" marginwidth="0" marginheight="0" scrolling="no"></iframe></div></div>');
    };
    
  //Popup animation
  Drupal.behaviors.opeka_widgets.OpekaPopupController.prototype.popupAnimation = function(popupAction) {
      var popupWrapper = ".opeka-chat-popup-wrapper." + this.chatName,
        height = $(popupWrapper).height(),
        smallHeight = 35,
        largeHeight = 70,
        totalHeight = 0,
        isVisible = $(popupWrapper).css('display') == 'none' ? false : true,
        declineWidgetCookie = Drupal.behaviors.opeka_widgets.getCookie === "yes" ? true : false;

      // Get height of all widgets
      $('.opeka-chat-popup-wrapper').each(function () {
        totalHeight += $(this).height()
      });
      // Make widget popup if open or occupied
      if (!declineWidgetCookie && (popupAction === (this.chatType + "-Open"))) {
        $(popupWrapper).animate({
          top: 0
        }, 300, function () {
          $(popupWrapper).show();
        });
        // Animate to big size
        $(popupWrapper+" iframe").animate({
          height: largeHeight
        }, 300);
      }
      else if (popupAction === (this.chatType + "-Occupied")){
        $(popupWrapper).animate({
          top: 0
        }, 300, function () {
          $(popupWrapper).show();
        });
        // Animate to small size
        $(popupWrapper+" iframe").animate({
          height: smallHeight
        }, 300);
      }
      else if (popupAction === (this.chatType + "-Closed")) {
        $(popupWrapper).animate({
          top: totalHeight
        }, 300, function () {
          $(popupWrapper).hide()
        });
      }
      if (!($(popupWrapper).css('display') == 'none')) {
        isVisible = true;
      }
    };

  // Close popup when the close iframe message is received
  Drupal.behaviors.opeka_widgets.OpekaPopupController.prototype.closePopup = function() {
    var popupWrapper = "." + this.chatName;
    Drupal.behaviors.opeka_widgets.setStatus(this.chatName);
    $(popupWrapper).fadeOut();
  };
  

  /**
   * Receive messages from the iframe
   * https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
   */
  Drupal.behaviors.opeka_widgets.OpekaPopupController.prototype.addMsgListener = function() {
    window.addEventListener("message", this.receiveMessage.bind(this), false);
  };

  Drupal.behaviors.opeka_widgets.OpekaPopupController.prototype.receiveMessage = function(event) {
    if (event.origin !== this.baseURL) {
      return;
    } else if (event.data === this.chatType + "-CloseIframe") {
      this.closePopup();
    } else {
      this.popupAnimation(event.data);
    }
  };
  
  Drupal.behaviors.opeka_widgets.setStatus = function(chatName) {
    // var date = new Date();
    // date.setDate(date.getDate() + 1); 
    // Remember for one day
    // var cookie = "opeka-widgets-declined-" + chatName + "=yes;expires=" + date.toUTCString() + ";path=" + Drupal.settings.basePath;
    var cookie = "opeka-widgets-declined-" + chatName + "=yes;path=" + drupalSettings.basePath;

    document.cookie = cookie;
  };
  
  /**
   * Check if a cookie has been set for the client
   *
   * Verbatim copy of Drupal.comment.getCookie().
   */
  Drupal.behaviors.opeka_widgets.getCookie = function(chatName) {
    var search = "opeka-widgets-declined-" + chatName + '=';
    var returnValue = '';

    if (document.cookie.length > 0) {
      offset = document.cookie.indexOf(search);
      if (offset != -1) {
        offset += search.length;
        var end = document.cookie.indexOf(';', offset);
        if (end == -1) {
          end = document.cookie.length;
        }
        returnValue = decodeURIComponent(document.cookie.substring(offset, end).replace(/\+/g, '%20'));
      }
    }

    return returnValue;
  }; 
})(jQuery, Drupal, opekaPopupWidgets);
  