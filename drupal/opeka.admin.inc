<?php
/**
 * @file
 * Admin pages for the Opeka module.
 */

/**
 * The admin-facing chat-page.
 */
function opeka_admin_page() {
  global $user;

  opeka_add_assets(array(
    'opeka.admin.css',
  ), array(
    'opeka.backend.js',
  ), array(
    'user' => array(
      'name' => $user->name,
      'uid' => (integer) $user->uid,
      'sid' => $user->sid,
      'admin' => TRUE,
    ),
  ));

  $output = array();

  // Load the templates we need for rendering.
  $template_path = dirname(__FILE__) . '/templates/';
  $output[] = file_get_contents($template_path . 'common.tmpl.html');
  $output[] = file_get_contents($template_path . 'backend.tmpl.html');

  return implode("\n", $output);
}

/**
 * Admin settings form for Opeka.
 */
function opeka_admin_settings_form($form, &$form_state) {
  form_load_include($form_state, 'admin.inc', 'lol_queue');

  $form['opeka_nowjs_url'] = array(
    '#type' => 'textfield',
    '#title' => t('Opeka server URL'),
    '#description' => t('URL to the Spravka webservice JavaScript start point, eg. http://localhost:3000/nowjs/now.js'),
    '#required' => TRUE,
    '#default_value' => variable_get('opeka_nowjs_url', ''),
  );

  return system_settings_form($form);
}
