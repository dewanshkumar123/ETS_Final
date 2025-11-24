document.addEventListener("DOMContentLoaded", function () {
  var chatContainer = document.getElementById("chat-container");
  if (chatContainer) {
    setupChat(chatContainer);
  }
  var toggleBtn = document.getElementById("toggle-transcript");
  if (toggleBtn) {
    setupTranscriptToggle(toggleBtn);
  }
  var zoomBtn = document.getElementById("zoom-notes");
  if (zoomBtn) {
    setupFullscreenEditor(zoomBtn);
  }
  
  // Initialize Quill editor
  setupNotesEditor();
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
  var notesPanel = document.querySelector(".lecture-notes-panel");
  var notesContent = document.getElementById("notes-content");
  var transcriptContent = document.getElementById("transcript-content");
  if (!notesPanel || !notesContent || !transcriptContent) return;

  var showingTranscript = false;

  btn.addEventListener("click", function () {
    if (!showingTranscript) {
      // Hide notes content, show transcript
      notesContent.style.display = "none";
      transcriptContent.style.display = "block";
      btn.textContent = "Show Notes";
    } else {
      // Show notes content, hide transcript
      notesContent.style.display = "block";
      transcriptContent.style.display = "none";
      btn.textContent = "Show Transcript";
    }
    showingTranscript = !showingTranscript;
  });
}

function setupFullscreenEditor(zoomBtn) {
  var modal = document.getElementById("fullscreen-editor-modal");
  var closeBtn = document.getElementById("close-fullscreen");
  var fullscreenEditorDiv = document.getElementById("fullscreen-editor");

  if (!modal || !closeBtn || !fullscreenEditorDiv) return;

  zoomBtn.addEventListener("click", function () {
    fullscreenEditorDiv.innerHTML = "";
    
    // Create editable fullscreen editor with toolbar
    var fullscreenQuill = new Quill("#fullscreen-editor", {
      theme: "snow",
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline'],
          ['blockquote', 'code-block'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['link', 'image'],
          ['clean']
        ]
      },
      placeholder: "Edit your notes..."
    });

    // Load current notes content
    if (window.notesQuill) {
      fullscreenQuill.setContents(window.notesQuill.getContents());
    }

    // Add save button to header
    var headerActions = document.querySelector(".fullscreen-header-actions");
    if (headerActions) {
      var saveBtn = document.createElement("button");
      saveBtn.className = "btn btn-small";
      saveBtn.textContent = "Save";
      saveBtn.addEventListener("click", function () {
        // Copy content back to main editor
        if (window.notesQuill) {
          window.notesQuill.setContents(fullscreenQuill.getContents());
          saveNotesToDatabase();
          saveBtn.textContent = "Saved!";
          setTimeout(function () {
            saveBtn.textContent = "Save";
          }, 2000);
        }
      });
      headerActions.appendChild(saveBtn);
    }

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  });

  closeBtn.addEventListener("click", function () {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
    // Clear header actions
    var headerActions = document.querySelector(".fullscreen-header-actions");
    if (headerActions) {
      var saveBtn = headerActions.querySelector(".btn-small");
      if (saveBtn) saveBtn.remove();
    }
  });

  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      closeBtn.click();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.style.display === "flex") {
      closeBtn.click();
    }
  });
}

function setupNotesEditor() {
  var editorDiv = document.getElementById("editor");
  var lectureId = editorDiv.getAttribute("data-lecture-id");
  var originalNotesContent = editorDiv.getAttribute("data-notes") || "";
  var saveBtn = document.getElementById("save-notes-btn");

  if (!lectureId) return;

  // Store original content for comparison
  window.originalNotesText = originalNotesContent;

  // Initialize Quill with toolbar enabled
  window.notesQuill = new Quill("#editor", {
    theme: "snow",
    modules: {
      toolbar: "#toolbar",
      clipboard: {
        matchVisual: false
      }
    },
    placeholder: "Add your notes here... (You can paste images)"
  });

  // Handle image insertion - convert to base64
  var imageHandler = function () {
    var input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    
    input.onchange = function () {
      var file = input.files[0];
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("Image must be less than 5MB");
        return;
      }

      var reader = new FileReader();
      reader.onload = function (e) {
        var range = window.notesQuill.getSelection();
        var imageUrl = e.target.result; // Base64 data URL
        
        if (range) {
          window.notesQuill.insertEmbed(range.index, "image", imageUrl);
          window.notesQuill.setSelection(range.index + 1);
        }
      };
      
      reader.readAsDataURL(file);
    };
    
    input.click();
  };

  // Replace default image handler
  window.notesQuill.getModule("toolbar").addHandler("image", imageHandler);

  // Handle paste with images
  window.notesQuill.root.addEventListener("paste", function (e) {
    var items = (e.clipboardData || e.originalEvent.clipboardData).items;
    
    for (var i = 0; i < items.length; i++) {
      if (items[i].kind === "file" && items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        
        var file = items[i].getAsFile();
        if (file.size > 5 * 1024 * 1024) {
          alert("Image must be less than 5MB");
          return;
        }

        var reader = new FileReader();
        reader.onload = function (e) {
          var range = window.notesQuill.getSelection();
          var imageUrl = e.target.result;
          
          if (range) {
            window.notesQuill.insertEmbed(range.index, "image", imageUrl);
            window.notesQuill.setSelection(range.index + 1);
          }
        };
        
        reader.readAsDataURL(file);
      }
    }
  });

  // Load initial lecture notes
  if (originalNotesContent.trim()) {
    window.notesQuill.root.innerHTML = originalNotesContent;
    setTimeout(highlightStudentAdditions, 100);
  }

  // Load saved user notes from database
  fetch("/api/lecture/" + lectureId + "/notes")
    .then(res => res.json())
    .then(data => {
      if (data.notes) {
        window.notesQuill.setContents(JSON.parse(data.notes));
        setTimeout(highlightStudentAdditions, 100);
      }
    })
    .catch(e => console.log("No saved notes found"));

  // Save button click
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      saveNotesToDatabase();
      saveBtn.textContent = "Saved!";
      setTimeout(function () {
        saveBtn.textContent = "Save";
      }, 2000);
    });
  }

  // Track changes to highlight additions
  window.notesQuill.on("text-change", function () {
    setTimeout(highlightStudentAdditions, 50);
  });
}

function highlightStudentAdditions() {
  if (!window.notesQuill || !window.originalNotesText) return;

  var currentText = window.notesQuill.getText();
  var originalText = window.originalNotesText.replace(/<[^>]*>/g, ""); // Strip HTML tags

  // Get all blots in editor
  var delta = window.notesQuill.getContents();
  var offset = 0;

  if (delta.ops) {
    delta.ops.forEach((op) => {
      if (op.insert) {
        var insertText = typeof op.insert === "string" ? op.insert : "";
        var length = insertText.length;

        // Check if this text exists in original
        if (originalText.indexOf(insertText) === -1 && insertText.trim()) {
          // This is new content - mark it
          window.notesQuill.formatText(offset, length, { "class": "student-added" });
        }

        offset += length;
      }
    });
  }
}

function saveNotesToDatabase() {
  var lectureId = document.getElementById("editor")?.getAttribute("data-lecture-id");
  if (lectureId && window.notesQuill) {
    var content = window.notesQuill.getContents();

    fetch("/api/lecture/" + lectureId + "/notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ notes: JSON.stringify(content) })
    })
    .catch(e => console.log("Error saving notes:", e));
  }
}

function saveNotes() {
  // Manual save triggered by button
  saveNotesToDatabase();
}
