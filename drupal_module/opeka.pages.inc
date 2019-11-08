<?php
/**
 * @file
 * Page callbacks for the Opeka module.
 */

/**
 * The main, user-facing, chat-page.
 * 
 * Build assets and templates for client side javascript
 */
function opeka_main_page() {
  global $user;
  $port = $_SERVER['REMOTE_PORT'];
  opeka_add_assets(array(), array('opeka.frontend.js', 'jquery.geowidget-1.0.js'), array(
    'user' => array(
      'name' => isset($user->name) ? $user->name : '',
      'uid' => (integer) $user->uid,
      'sid' => isset($user->sid) ? $user->sid : '',
      'admin' => FALSE,
      'remotePort' => $port
    )));

  $output = array();

  // Load the templates we need for rendering.
  $template_path = dirname(__FILE__) . '/templates/';
  $output[] = file_get_contents($template_path . 'common.tmpl.html');
  $output[] = file_get_contents($template_path . 'frontend.tmpl.html');

  return implode("\n", $output);
}


/*
 * Inline widget page for inclusion on third party sites
 *
 * We make sure the css of the widget is loaded in the CSS_THEME group, to avoid overrides
 */
function opeka_inline_widget(){
  opeka_widgets();
  drupal_add_css(drupal_get_path('module', 'opeka') . '/css/widget.inline.css', array('group' => CSS_THEME, 'type' => 'file', 'weight' => 100));
  return array();
}

/*
 * Header widget page for inclusion on third party sites
 *
 */
function opeka_header_widget(){
  opeka_widgets();
  drupal_add_css(drupal_get_path('module', 'opeka') . '/css/widget.header.css', array('group' => CSS_THEME, 'type' => 'file', 'weight' => 100));
  return array();
}

/*
 * Popup widget page for inclusion on third party sites
 *
 */
function opeka_popup_widget(){
  opeka_widgets();
  drupal_add_css(drupal_get_path('module', 'opeka') . '/css/widget.popup.css', array('group' => CSS_THEME, 'type' => 'file', 'weight' => 100));
  return array();
}

/*
 * Foldout widget page for inclusion on third party sites
 *
 */
function opeka_foldout_widget(){
  opeka_widgets();
  drupal_add_css(drupal_get_path('module', 'opeka') . '/css/widget.foldout.css', array('group' => CSS_THEME, 'type' => 'file', 'weight' => 100));
  return array();
}

/*
 * Mixed widget page for inclusion on third party sites
 *
 */
function opeka_mixed_widget(){
  opeka_widgets();
  drupal_add_css(drupal_get_path('module', 'opeka') . '/css/widget.mixed.css', array('group' => CSS_THEME, 'type' => 'file', 'weight' => 100));
  drupal_add_css('//fonts.googleapis.com/css?family=Lato:400,700', array('group' => CSS_THEME, 'type' => 'external', 'weight' => 11));
  return array();
}

/*
 * Common function for the widgets
 *
 * Add needed assets
 */
function opeka_widgets(){
  opeka_add_assets(array(), array('opeka.frontend.js'), array(), TRUE);
  drupal_add_css(drupal_get_path('module', 'opeka') . '/css/widget.css', array('group' => CSS_THEME, 'type' => 'file', 'weight' => 10));
  drupal_add_js(drupal_get_path('module', 'opeka') . '/widgets/js/chatstatus.js', array('weight' => 10));
  return array();
}
