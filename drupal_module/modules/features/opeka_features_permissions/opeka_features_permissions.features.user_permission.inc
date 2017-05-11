<?php
/**
 * @file
 * opeka_features_permissions.features.user_permission.inc
 */

/**
 * Implements hook_user_default_permissions().
 */
function opeka_features_permissions_user_default_permissions() {
  $permissions = array();

  // Exported permission: 'access opeka chat'.
  $permissions['access opeka chat'] = array(
    'name' => 'access opeka chat',
    'roles' => array(
      'administrator' => 'administrator',
      'anonymous user' => 'anonymous user',
      'authenticated user' => 'authenticated user',
    ),
    'module' => 'opeka',
  );

  // Exported permission: 'administer opeka chat'.
  $permissions['administer opeka chat'] = array(
    'name' => 'administer opeka chat',
    'roles' => array(
      'administrator' => 'administrator',
    ),
    'module' => 'opeka',
  );

  // Exported permission: 'administer opeka opening hours'.
  $permissions['administer opeka opening hours'] = array(
    'name' => 'administer opeka opening hours',
    'roles' => array(
      'Koordinator' => 'Koordinator',
      'administrator' => 'administrator',
    ),
    'module' => 'opeka_opening_hours',
  );

  // Exported permission: 'administer opeka screening'.
  $permissions['administer opeka screening'] = array(
    'name' => 'administer opeka screening',
    'roles' => array(
      'administrator' => 'administrator',
    ),
    'module' => 'opeka_screening',
  );

  // Exported permission: 'administer opeka settings'.
  $permissions['administer opeka settings'] = array(
    'name' => 'administer opeka settings',
    'roles' => array(
      'administrator' => 'administrator',
    ),
    'module' => 'opeka',
  );

  // Exported permission: 'generate opeka chat ban codes'.
  $permissions['generate opeka chat ban codes'] = array(
    'name' => 'generate opeka chat ban codes',
    'roles' => array(
      'Koordinator' => 'Koordinator',
      'administrator' => 'administrator',
    ),
    'module' => 'opeka',
  );

  // Exported permission: 'hide typing message'.
  $permissions['hide typing message'] = array(
    'name' => 'hide typing message',
    'roles' => array(
      'Chatrådgiver' => 'Chatrådgiver',
      'Koordinator' => 'Koordinator',
      'administrator' => 'administrator',
    ),
    'module' => 'opeka',
  );

  // Exported permission: 'pause opeka chat autoscroll'.
  $permissions['pause opeka chat autoscroll'] = array(
    'name' => 'pause opeka chat autoscroll',
    'roles' => array(
      'Chatrådgiver' => 'Chatrådgiver',
      'Koordinator' => 'Koordinator',
      'administrator' => 'administrator',
    ),
    'module' => 'opeka',
  );

  return $permissions;
}
