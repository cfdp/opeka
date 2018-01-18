<div id='widget'>
  <header>
    <h1 id="title"></h1>
    <h2 id="subtitle" class='subtle-text'></h2>
  </header>
  <section class='chat'>
    <h3>
      <div class="login-button">
        <i class='icn-chat'></i> Chatrådgivning
        <a id="join-chat" class="btn chat" href="#"></a>
      </div>
    </h3>
    <p id="chat-description"></p>
  </section>
  <section class='letterbox'>
    <h3>
      <a href='http://cyberhus.dk/brevkasse?utm_source=kram&amp;utm_medium=widget&amp;utm_campaign=kramwidget' target='_blank' title='Brevkasser i Cyberhus'>
        <i class='icn-letterbox'></i> Brevkasser
        <i class='arrow'></i>
      </a>
    </h3>
    <ul id='letterbox-container'></ul>
  </section>
  <section class='forum'>
    <h3>
      <a href='http://cyberhus.dk/debat?utm_source=kram&amp;utm_medium=widget&amp;utm_campaign=kramwidget' target='_blank' title='Debatter i Cyberhus'>
        <i class='icn-forum'></i> Debatter
        <i class='arrow'></i>
      </a>
    </h3>
    <ul id='forum-container'></ul>
  </section>
  <footer>
    <p class='subtle-text'>Et samarbejde mellem Cyberhus og <span id ="partner-name"></span>.</p>
    <a class='logo-cyberhus' href='http://cyberhus.dk?utm_source=kram&amp;utm_medium=widget&amp;utm_campaign=kramwidget' target='_blank' title='Cyberhus'>
      <i></i>
    </a>
    <span class="logo-partner"><img id="partner-logo"></span>
  </footer>
</div>
<script>
  // Helper function to add scripts
  var Opeka = Opeka || {},
      Drupal = Drupal || {},
      wrapperScriptURL = Drupal.settings.opeka.mixed_widget_url;

  addScript(wrapperScriptURL, function() {});

  function addScript(src, callback) {
    var s,
      r,
      t;
    r = false;
    s = document.createElement('script');
    s.type = 'text/javascript';
    s.src = src;
    s.onload = s.onreadystatechange = function() {
      //console.log(this.readyState); //uncomment this line to see which ready states are called.
      if (!r && (!this.readyState || this.readyState == 'complete')) {
        r = true;
        callback(this.readyState);
      }
    };
    t = document.getElementsByTagName('script')[0];
    t.parentNode.insertBefore(s, t);
  }

  //jsonp for incl. various
  function OpekaVarious(fields) {
    var fieldsOutput = '',
      length = fields.length,
      node = fields[0].node,
      title = node.title,
      subTitle = node.Undertitel,
      chatDescription = node.field_widget_chat_description,
      qnaTerms = node.field_widget_qna_terms.replace(/, /g, '+'),
      forumTerms = node.field_widget_forum_terms.replace(/, /g, '+'),
      partnerLogo = node.uri,
      partnerName = node.field_widget_customer_name,
      qnaDataURL = 'https://cyberhus.dk/widget/letterbox/' + qnaTerms + '?callback=OpekaLetterbox',
      forumDataURL = 'https://cyberhus.dk/widget/forum/' + forumTerms + '?callback=OpekaForum';

    addScript(qnaDataURL, function() {});
    addScript(forumDataURL, function() {});

    document.getElementById("title").innerHTML = title;
    document.getElementById("subtitle").innerHTML = subTitle;
    document.getElementById("chat-description").innerHTML = chatDescription;
    document.getElementById("partner-logo").src = partnerLogo;
    document.getElementById("partner-name").innerHTML = partnerName;

  }
  //jsonp for incl. forum
  function OpekaForum(nodes) {

    var nodesOutput = '';
    var length = nodes.length;

    for (var i = 0; i < length; i++) {
      node = nodes[i].node;
      nodesOutput += '<li><a target="_blank" title="Læs indlæget på Cyberhus" href="' + node.path + '?utm_source=kram&utm_medium=widget&utm_campaign=kramwidget"><i class="arrow"></i><span>' + node.title + ' <time>' + node.created + ' siden</time></span></a></li>';
    }
    document.getElementById("forum-container").innerHTML = nodesOutput;
  }
  // jsonp for incl. letterbox
  function OpekaLetterbox(nodes) {

    var nodesOutput = '';
    var length = nodes.length;

    for (var i = 0; i < length; i++) {
      node = nodes[i].node;
      nodesOutput += '<li><a target="_blank" title="Læs brevkassespørgsmålet og svaret på Cyberhus" href="' + node.path + '?utm_source=kram&utm_medium=widget&utm_campaign=kramwidget"><i class="arrow"></i><span>' + node.title + ' <time>' + node.created + ' siden</time></span></a></li>';
    }
    document.getElementById("letterbox-container").innerHTML = nodesOutput;
  }

  // Based on https://github.com/johnymonster/iframe_height
  // Child script
  var messageParent = function(scrollTop) {
    var h = document.body.scrollHeight;
    h = (scrollTop) ? h + 's' : h;
    if (top.postMessage) {
      top.postMessage(h, '*');
    } else {
      window.location.hash = 'h' + h;
    }
  }

  // Child Loader
  window.onload = function() {
    messageParent();
  }

  window.onresize = function() {
    messageParent();
  }
</script>
