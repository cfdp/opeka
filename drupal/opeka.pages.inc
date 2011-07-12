<?php
/**
 * @file
 * Page callbacks for the Opeka module.
 */

/**
 * The main, user-facing, chat-page.
 */
function opeka_main_page() {
  $js_url = variable_get('opeka_nowjs_url', 'https://localhost:3000/nowjs/now.js');

  if (!$js_url) {
    $errormsg = t('Opeka web service URL missing.');
    drupal_set_message($errormsg, 'error');
    return $errormsg;
  }

  // Add the nowjs JavaScript file to the page. It will take care of 
  // connecting to the nowjs server.
  drupal_add_js($js_url, array('type' => 'external', 'weight' => -42));

  // Settings to expose to the JavaScript client.
  $settings = array(
    'path' => base_path() . drupal_get_path('module', 'opeka'),
  );
  drupal_add_js(array('opeka' => $settings), 'setting');

  // Load the required JavaScript libraries.
  drupal_add_library('system', 'jquery.bbq');
  drupal_add_library('system', 'ui.dialog');

  // Load the required JavaScript files.
  $path = drupal_get_path('module', 'opeka');
  foreach (array('opeka.common.js', 'jquery.tmpl.min.js', 'opeka.frontend.js') as $filename) {
    drupal_add_js($path . '/js/' . $filename);
  }

  return '<div id="opeka-placeholder">' . t('Loading chat…') . '</div>';
}

