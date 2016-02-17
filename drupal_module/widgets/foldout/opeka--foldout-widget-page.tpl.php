<div class="name-tab">
  <?php
    if ($variables['opeka_widget_roomtype'] == "pair"):
      print render($variables['opeka_pair_chat_name']);
    elseif ($variables['opeka_widget_roomtype'] == "group"):
      print render($variables['opeka_group_chat_name']);
    endif;
  ?>
</div>
<div class="status-wrapper foldout">
  <div class="status-tab"></div>
  <div class="status-content">
    <p>
      <?php print render($variables['opeka_schedule']); ?>
    </p>
  </div>
  <div class="login-button">
    <a id="join-chat" class="btn chat" href="#"></a>
  </div>
</div>

