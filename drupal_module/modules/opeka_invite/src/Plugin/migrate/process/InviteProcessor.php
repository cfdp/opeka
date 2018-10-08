<?php

namespace Drupal\opeka_invite\Plugin\migrate\process;

use Drupal\migrate\ProcessPluginBase;

/**
 * Return invite.
 *
 * @MigrateProcessPlugin(
 *   id = "d7_invite_processor"
 * )
 */
class InviteProcessor extends ProcessPluginBase {

  /**
   * {@inheritdoc}
   */
  public function transform($value, \Drupal\migrate\MigrateExecutableInterface $migrate_executable, \Drupal\migrate\Row $row, $destination_property) {
    return $value;
  }

}

