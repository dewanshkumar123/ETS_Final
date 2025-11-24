document.addEventListener("DOMContentLoaded", function () {
  var chatContainer = document.getElementById("chat-container");
  if (chatContainer) {
    setupChat(chatContainer);
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
