<?php

namespace Drupal\opeka_invite\Plugin\migrate\destination;

use Drupal\Core\Database\Connection;
use Drupal\Core\Database\Database;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\migrate\MigrateException;
use Drupal\migrate\MigrateSkipProcessException;
use Drupal\migrate\Plugin\MigrationInterface;
use Drupal\migrate\Plugin\migrate\destination\DestinationBase;
use Drupal\migrate\Row;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides table destination plugin.
 *
 * Use this plugin for a table not registered with Drupal Schema API.
 *
 * @MigrateDestination(
 *   id = "d7_invites_destination"
 * )
 */
class InviteDestination extends DestinationBase implements ContainerFactoryPluginInterface {

  /**
   * The name of the destination table.
   *
   * @var string
   */
  protected $tableName = 'opeka_invite';

  /**
   * IDMap compatible array of id fields.
   *
   * @var array
   */
  protected $idFields = [
    'iid' => [
      'type' => 'integer',
      'alias' => 'oi'
    ],
  ];

  /**
   * Array of fields present on the destination table.
   *
   * @var array
   */
  protected $fields = [];

  /**
   * The database connection.
   *
   * @var \Drupal\Core\Database\Connection
   */
  protected $dbConnection;

  /**
   * Constructs a new Table.
   *
   * @param array $configuration
   *   A configuration array containing information about the plugin instance.
   * @param string $plugin_id
   *   The plugin_id for the plugin instance.
   * @param mixed $plugin_definition
   *   The plugin implementation definition.
   * @param \Drupal\migrate\Plugin\MigrationInterface $migration
   *   The migration.
   * @param \Drupal\Core\Database\Connection $connection
   *   The database connection.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, MigrationInterface $migration, Connection $connection) {
    parent::__construct($configuration, $plugin_id, $plugin_definition, $migration);
    $this->dbConnection = $connection;
    $this->fields = [
      'iid' => $this->t('Unique invitation ID.'),
      'name' => $this->t('Invitation name.'),
      'time' => $this->t('Unix timestamp for the invitation scheduled time.'),
      'token' => $this->t('Random token used for user authentication.'),
      'invitee' => $this->t('Invitee name.'),
      'email' => $this->t('Invitee email.'),
      'counselor' => $this->t('Counselor name.'),
      'comment' => $this->t('Personal message.'),
      'status' => $this->t('1 if the invitation is active, 0 otherwise'),
      'count' => $this->t('How many times the token has been checked against.'),
    ];;
    $this->supportsRollback = TRUE;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition, MigrationInterface $migration = NULL) {
    $db_key = !empty($configuration['database_key']) ? $configuration['database_key'] : NULL;

    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $migration,
      Database::getConnection('default', $db_key)
    );
  }

  /**
   * {@inheritdoc}
   */
  public function getIds() {
    if (empty($this->idFields)) {
      throw new MigrateException(
        'Id fields are required for a table destination'
      );
    }
    return $this->idFields;
  }

  /**
   * {@inheritdoc}
   */
  public function fields(MigrationInterface $migration = NULL) {
    return $this->fields;
  }

  /**
   * {@inheritdoc}
   */
  public function import(Row $row, array $old_destination_id_values = []) {
    $id = $row->getSourceIdValues();
    if (count($id) != count($this->idFields)) {
      throw new MigrateSkipProcessException(
        'All the id fields are required for a table migration.'
      );
    }

    $values = $row->getDestination();

    if ($this->fields) {
      $values = array_intersect_key($values, $this->fields);
    }

    $status = $this->dbConnection->merge($this->tableName)
      ->key($id)
      ->fields($values)
      ->execute();

    return $status ? $id : NULL;
  }

  /**
   * {@inheritdoc}
   */
  public function rollback(array $destination_identifier) {
    $delete = $this->dbConnection->delete($this->tableName);
    foreach ($destination_identifier as $field => $value) {
      $delete->condition($field, $value);
    }
    $delete->execute();
  }

}
