<?php
/**
 * @file
 * Page callbacks for the Opeka module.
 */

/**
 * The main, user-facing, chat-page.
 */
function opeka_main_page() {
  $js_url = variable_get('opeka_nowjs_url', 'http://localhost:3000/nowjs/now.js');

  if (!$js_url) {
    $errormsg = t('Spravka web service URL missing.');
    drupal_set_message($errormsg, 'error');
    return $errormsg;
  }

  // Add the nowjs JavaScript file to the page. It will take care of 
  // connecting to the nowjs server.
  drupal_add_js($js_url, array('type' => 'external', 'weight' => -42));

  // Load the required JavaScript files.
  $path = drupal_get_path('module', 'opeka');
  foreach (array('jquery.tmpl.min.js', 'opeka.frontend.js') as $filename) {
    drupal_add_js($path . '/js/' . $filename);
  }

  return '<div id="chat-placeholder">' . t('Loading chat…') . '</div>';
}

