<?php

namespace Drupal\opeka\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Session\AccountProxy;
use Drupal\Component\Utility\UrlHelper;

/**
 * Class ChatConfigurationForm.
 */
class ChatConfigurationForm extends ConfigFormBase {

  /**
   * The http client.
   *
   * @var \GuzzleHttp\Client
   */
  protected $httpClient;

  /**
   * The list of settings that are URLs.
   *
   * @var \GuzzleHttp\Client
   */
  protected $urlTypeSettingsList = [
    'file_url',
    'connectjs_url',
    'groupchat_feedback_url',
    'feedback_url',
    'client_url',
  ];

  /**
   * Class constructor.
   */
  public function __construct(ConfigFactoryInterface $config_factory, AccountProxy $current_user, Client $http_client) {
    $this->configFactory = $config_factory;
    $this->currentUser = $current_user;
    $this->httpClient = $http_client;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('config.factory'),
      $container->get('current_user'),
      $container->get('http_client')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'opeka_admin_settings_form';
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames() {
    return [
      'opeka.settings',
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {

    $url_validation_checkbox_label = $this->t('Check public access to URL?');
    $url_validation_checkbox_description = $this->t('Check this box if you want to check whether this URL is "alive".');
    $config = $this->config('opeka.settings');

    $form['connectjs_url_fieldset'] = [
      '#type' => 'fieldset',
      '#title' => $this->t('Opeka server'),
    ];
    $form['connectjs_url_fieldset']['connectjs_url'] = [
      '#type' => 'textfield',
      '#title' => $this->t('URL'),
      '#description' => $this->t('URL to the Opeka connect.js javascript, eg. http://localhost:3000/connect.js'),
      '#required' => TRUE,
      '#default_value' => $config->get('connectjs_url'),
    ];
    $form['connectjs_url_fieldset']['connectjs_url_validate'] = [
      '#type' => 'checkbox',
      '#title' => $url_validation_checkbox_label,
      '#description' => $url_validation_checkbox_description,
      '#required' => FALSE,
      '#default_value' => 0,
    ];

    $form['opeka_schedule'] = [
      '#type' => 'textarea',
      '#title' => $this->t('Chat schedule'),
      '#description' => $this->t('The schedule for the upcoming chat sessions'),
      '#required' => TRUE,
      '#default_value' => $config->get('schedule'),
    ];

    $form['pair_chat_name'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Pair chat name'),
      '#description' => $this->t('The pair chat name can be shown in some chat widgets'),
      '#required' => FALSE,
      '#default_value' => $config->get('pair_chat_name'),
    ];

    $form['group_chat_name'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Group chat name'),
      '#description' => $this->t('The group chat name can be shown in some chat widgets'),
      '#required' => FALSE,
      '#default_value' => $config->get('group_chat_name'),
    ];

    $form['welcome_message'] = [
      '#type' => 'textarea',
      '#title' => $this->t('Welcome message'),
      '#maxlength' => 1024,
      '#description' => $this->t('Text shown before user logs into the chat.'),
      '#required' => FALSE,
      '#default_value' => $config->get('welcome_message') ?: $this->t('Welcome to the chat! You can customize this message at Admin => config => services => opeka'),
    ];

    $form['client_login_sound'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Login sound file'),
      '#description' => $this->t('URL to a sound file that is played for the counselor when a client logs in.'),
      '#required' => FALSE,
      '#default_value' => $config->get('client_login_sound') ?: '../sites/all/modules/custom/opeka/media/bell.mp3',
    ];

    $form['feedback_url_fieldset'] = [
      '#type' => 'fieldset',
      '#title' => $this->t('Feedback'),
    ];
    $form['feedback_url_fieldset']['feedback_url'] = [
      '#type' => 'textfield',
      '#title' => $this->t('URL'),
      '#description' => $this->t('URL to a feedback page, e.g. a Google Form, where clients can enter evaluation data after a chat.'),
      '#required' => FALSE,
      '#default_value' => $config->get('feedback_url'),
    ];
    $form['feedback_url_fieldset']['feedback_url_validate'] = [
      '#type' => 'checkbox',
      '#title' => $url_validation_checkbox_label,
      '#description' => $url_validation_checkbox_description,
      '#required' => FALSE,
      '#default_value' => 0,
    ];

    $form['groupchat_feedback_url_fieldset'] = [
      '#type' => 'fieldset',
      '#title' => $this->t('Group Chat feedback '),
    ];
    $form['groupchat_feedback_url_fieldset']['groupchat_feedback_url'] = [
      '#type' => 'textfield',
      '#title' => $this->t('URL'),
      '#description' => $this->t('URL to a feedback page, e.g. a Google Form, where group chat clients can enter evaluation data after a chat.'),
      '#required' => FALSE,
      '#default_value' => $config->get('groupchat_feedback_url'),
    ];
    $form['groupchat_feedback_url_fieldset']['groupchat_feedback_url_validate'] = [
      '#type' => 'checkbox',
      '#title' => $url_validation_checkbox_label,
      '#description' => $url_validation_checkbox_description,
      '#required' => FALSE,
      '#default_value' => 0,
    ];

    $form['feedback_auto_redirect'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Automatic redirection to questionnaire in external window?'),
      '#description' => $this->t('Check this box if the feedback form should be opened automatically for clients.'),
      '#required' => FALSE,
      '#default_value' => $config->get('feedback_auto_redirect', 0),
    ];

    $form['reg_pair_url'] = [
      '#type' => 'textfield',
      '#title' => $this->t('1-to-1 chat registration form'),
      '#description' => $this->t('URL to a registration form, where counselors can enter data after a 1-to-1 chat.'),
      '#required' => FALSE,
      '#default_value' => $config->get('reg_pair_url'),
    ];

    $form['reg_group_url'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Group chat registration form'),
      '#description' => $this->t('URL to a registration form, where counselors can enter data after a group chat.'),
      '#required' => FALSE,
      '#default_value' => $config->get('reg_group_url'),
    ];

    $form['pairchat_user_list'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Pair chat user list visibility'),
      '#description' => $this->t('Toggle the user list visibility in the pair chat. Check it if the user list should be visible'),
      '#required' => FALSE,
      '#default_value' => $config->get('pairchat_user_list', 0),
    ];

    $form['client_url'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Popup widget'),
      '#description' => $this->t('If the popup or the multi widgets are used, please provide the URL of the client site, eg. http://mysite.com.'),
      '#required' => FALSE,
      '#default_value' => $config->get('client_url'),
    ];

    $form['custom_css'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Custom css file for widget styles'),
      '#description' => $this->t('URL to a custom css file for the widgets.'),
      '#required' => FALSE,
      '#default_value' => $config->get('custom_css'),
    ];

    $form['server_restart'] = [
      '#type' => 'submit',
      '#value' => 'Restart server',
      '#submit' => ['restart_server'],
    ];

    $form['actions']['submit'] = [
      '#type' => 'submit',
      '#value' => $this->t('Submit'),
      '#button_type' => 'primary',
    ];

    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function validateForm(array &$form, FormStateInterface $form_state) {
    parent::validateForm($form, $form_state);

    foreach ($this->urlTypeSettingsList as $url_setting) {
      if (!$form_state->getValue($url_setting . "_validate")) {
        continue;
      }
      $url = $form_state->getValue($url_setting);
      if (UrlHelper::isValid($url)) {
        try {
          $this->httpClient->get($url);
        }
        catch (ClientException $exception) {
          $status_code = $exception->getResponse()->getStatusCode();
          $reason_phrase = $exception->getResponse()->getReasonPhrase();
          $form_state->setErrorByName(
            $url_setting,
            $this->t('The URL for %fieldset_label returned "@status_code @reason_phrase". Please make sure the the URL is correct.',
              [
                '%fieldset_label' => $form[$url_setting . "_fieldset"]['#title'],
                '@status_code' => $status_code,
                '@reason_phrase' => $reason_phrase,
              ]
            )
          );
        }
      }
      elseif (trim($url) !== '') {
        $form_state->setErrorByName('custom_css', $this->t('Please make sure to enter a valid URL.'));
      }
    }
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    $opeka_settings_config = $this->configFactory->getEditable('opeka.settings');
    foreach ($form_state->getValues() as $key => $value) {
      $opeka_settings_config->set($key, $form_state->getValue($key));
    }
    $opeka_settings_config->save();
    parent::submitForm($form, $form_state);
  }

}
