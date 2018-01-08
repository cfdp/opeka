<div class="status-wrapper">
  <?php print $messages; ?>
  <div class="status-tab"></div>
  <div id="output"></div>
  <div class="status-content">
    <p>
      <?php print render($variables['opeka_schedule']); ?>
    </p>
  </div>
  <div class="login-button">
    <a id="join-chat" class="btn chat" href="#"></a>
    <div class="button-subtext">
      <?php print render($variables['opeka_widget_header_button_subtext']); ?>
    </div>
  </div>
</div>
