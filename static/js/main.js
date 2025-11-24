document.addEventListener("DOMContentLoaded", function () {
  var chatContainer = document.getElementById("chat-container");
  if (chatContainer) {
    setupChat(chatContainer);
  }
  var toggleBtn = document.getElementById("toggle-transcript");
  if (toggleBtn) {
    setupTranscriptToggle(toggleBtn);
  }
});

function setupChat(chatContainer) {
  var lectureId = chatContainer.getAttribute("data-lecture-id");
  var messagesEl = document.getElementById("chat-messages");
  var inputEl = document.getElementById("chat-question");
  var sendBtn = document.getElementById("chat-send");

  function addMessage(text, sender) {
    var div = document.createElement("div");
    div.className = "chat-message";
    var labelClass = sender === "user" ? "chat-message-user" : "chat-message-bot";
    var labelText = sender === "user" ? "You" : "Assistant";
    div.innerHTML = '<span class="' + labelClass + '">' + labelText + ":</span> " + text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  sendBtn.addEventListener("click", function () {
    var question = inputEl.value.trim();
    if (!question) {
      return;
    }
    addMessage(question, "user");
    inputEl.value = "";
    sendQuestion(lectureId, question, function (answer) {
      addMessage(answer, "bot");
    });
  });

  inputEl.addEventListener("keyup", function (e) {
    if (e.key === "Enter") {
      sendBtn.click();
    }
  });
}

function sendQuestion(lectureId, question, callback) {
  fetch("/api/chat/" + lectureId, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ question: question })
  })
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      callback(data.answer || "No response.");
    })
    .catch(function () {
      callback("Error contacting server.");
    });
}

function toggleLectures(courseName) {
  var lecturesEl = document.getElementById("lectures-" + courseName);
  if (lecturesEl.style.display === "none" || lecturesEl.style.display === "") {
    lecturesEl.style.display = "block";
  } else {
    lecturesEl.style.display = "none";
  }
}

function setupTranscriptToggle(btn) {
  var notesContent = document.getElementById("notes-content");
  var transcriptContent = document.getElementById("transcript-content");
  if (!notesContent || !transcriptContent) return;

  var showingTranscript = false;

  btn.addEventListener("click", function () {
    if (!showingTranscript) {
      // Replace notes area with transcript content (only update notes panel)
      notesContent.dataset.prev = notesContent.innerHTML;
      notesContent.innerHTML = transcriptContent.innerHTML;
      btn.textContent = "Show Notes";
    } else {
      // Restore previous notes
      if (notesContent.dataset.prev !== undefined) {
        notesContent.innerHTML = notesContent.dataset.prev;
        delete notesContent.dataset.prev;
      }
      btn.textContent = "Show Transcript";
    }
    showingTranscript = !showingTranscript;
  });
}
