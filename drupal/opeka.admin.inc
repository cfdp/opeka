<?php
/**
 * @file
 * Admin pages for the Opeka module.
 */

/**
 * The main, user-facing, chat-page.
 */
function opeka_admin_page() {
  global $user;
  $js_url = variable_get('opeka_nowjs_url', 'http://localhost:3000/nowjs/now.js');

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
    'user' => array(
      'name' => $user->name,
      'uid' => (integer) $user->uid,
      'sid' => $user->sid,
      'admin' => TRUE,
    ),
  );
  drupal_add_js(array('opeka' => $settings), 'setting');

  // Load the required JavaScript libraries.
  drupal_add_library('system', 'jquery.bbq');
  drupal_add_library('system', 'ui.dialog');

  // Add our own JavaScript files.
  $path = drupal_get_path('module', 'opeka');
  foreach (array('opeka.common.js', 'jquery.tmpl.min.js', 'opeka.backend.js') as $filename) {
    drupal_add_js($path . '/js/' . $filename);
  }

  return '<div id="opeka-placeholder">' . t('Loading chat…') . '</div>';
}

/**
 * Admin settings form for Opeka.
 */
function opeka_admin_settings_form($form, &$form_state) {
  $form[] = array(
    '#markup' => 'Not implmented yet.',
  );

  return system_settings_form($form);
}

