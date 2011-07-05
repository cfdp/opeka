<?php
/**
 * @file
 * Admin pages for the Opeka module.
 */

/**
 * The main, user-facing, chat-page.
 */
function opeka_admin_page() {
  $build = array();

  $build[] = array(
    '#markup' => 'Not implmented yet.',
  );

  return $build;
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

