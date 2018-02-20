<?php

namespace Drupal\opeka\Controller;

use Drupal\Core\Controller\ControllerBase;

/**
 * Class ChatController.
 */
class ChatController extends ControllerBase {

  /**
   * Action for the chat's main page.
   *
   * @return string
   *   Return page render array.
   */
  public function mainChatPage() {  
    return [
      '#theme' => 'opeka_chat',
    ];
  }

  /**
   * Action for the chat's admin page.
   *
   * @return string
   *   Return page render array.
   */
  public function adminChatPage() {  
    return [
      '#theme' => 'opeka_admin_chat',
    ];
  }
  

}
