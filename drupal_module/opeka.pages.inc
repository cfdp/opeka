<?php
/**
 * @file
 * Page callbacks for the Opeka module.
 */

/**
 * The main, user-facing, chat-page.
 */
function opeka_main_page() {
  opeka_add_assets(array(), array('opeka.frontend.js', 'jquery.geowidget-1.0.js'));

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
  drupal_add_css(drupal_get_path('module', 'opeka') . '/widgets/inline/css/inline.css', array('group' => CSS_THEME, 'type' => 'file', 'weight' => 100));
  return array();
}

/*
 * Header widget page for inclusion on third party sites
 *
 */
function opeka_header_widget(){
  opeka_widgets();
  drupal_add_css(drupal_get_path('module', 'opeka') . '/widgets/header/css/header.css', array('group' => CSS_THEME, 'type' => 'file', 'weight' => 100));
  return array();
}

/*
 * Popup widget page for inclusion on third party sites
 *
 */
function opeka_popup_widget(){
  opeka_widgets();
  drupal_add_css(drupal_get_path('module', 'opeka') . '/widgets/popup/css/popup.css', array('group' => CSS_THEME, 'type' => 'file', 'weight' => 100));
  return array();
}

/*
 * Common function for the widgets
 *
 * Add needed css and js files
 */
function opeka_widgets(){
  drupal_add_css(drupal_get_path('module', 'opeka') . '/widgets/css/widget.css', array('group' => CSS_THEME, 'type' => 'file', 'weight' => 100));
  drupal_add_css(drupal_get_path('module', 'opeka') . '/widgets/css/custom.css', array('group' => CSS_THEME, 'type' => 'file', 'weight' => 101));
  drupal_add_js(drupal_get_path('module', 'opeka') . '/widgets/js/init.js');
  return array();
}

/*
 * Implementation of hook_theme().
 */
function opeka_theme(){
  $theme = array();
  $theme['opeka__header_widget_page'] = array(
    'template' => 'widgets/header/opeka--header-widget-page',
    );
  $theme['opeka__inline_widget_page'] = array(
    'template' => 'widgets/inline/opeka--inline-widget-page',
    );
  $theme['opeka__popup_widget_page'] = array(
    'template' => 'widgets/popup/opeka--popup-widget-page',
    );
  $theme['opeka__widget_html'] = array(
    'template' => 'widgets/opeka--widget-html',
  );
  return $theme;
}

/*function template_preprocess_opeka__header_widget_html(&$variables) {
}*/

/**
 * Implements hook_theme_registry_alter().
 */
/*function opeka_theme_registry_alter(&$theme_registry) {

}*/