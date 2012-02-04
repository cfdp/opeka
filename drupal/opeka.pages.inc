<?php
/**
 * @file
 * Page callbacks for the Opeka module.
 */

/**
 * The main, user-facing, chat-page.
 */
function opeka_main_page() {
  opeka_add_assets(array('opeka.frontend.js', 'jquery.geowidget-1.0.js'));

  return '<div id="opeka-app">' . t('Loading chat…') . '</div>';
}
