
const palette = document.getElementById("emoji-palette");
const canvas = document.getElementById("monument-canvas");
let selectedTemplate = null;

document.querySelectorAll(".template").forEach(img => {
  img.addEventListener("click", () => {
    selectedTemplate = img.getAttribute("data-template");
    canvas.style.backgroundImage = `url(images/templates/template${selectedTemplate}.png)`;
  });
});

palette.innerText.split(" ").forEach(char => {
  const span = document.createElement("span");
  span.className = "draggable";
  span.textContent = char;
  span.draggable = true;
  span.addEventListener("dragstart", e => {
    e.dataTransfer.setData("text", e.target.textContent);
  });
  palette.appendChild(span);
});

canvas.addEventListener("dragover", e => e.preventDefault());
canvas.addEventListener("drop", e => {
  const emoji = e.dataTransfer.getData("text");
  const span = document.createElement("span");
  span.textContent = emoji;
  span.className = "emoji-drop";
  span.style.position = "absolute";
  span.style.left = `${e.offsetX}px`;
  span.style.top = `${e.offsetY}px`;
  canvas.appendChild(span);
});

document.getElementById("monument-form").addEventListener("submit", async e => {
  e.preventDefault();
  const title = document.getElementById("title").value;
  const price = document.getElementById("price").value;
  const decorations = Array.from(canvas.querySelectorAll(".emoji-drop")).map(el => ({
    emoji: el.textContent,
    x: el.style.left,
    y: el.style.top
  }));

  const response = await fetch("/api/monuments", {
    method: "POST",
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ title, template: selectedTemplate, decorations, price })
  });
  if (response.ok) {
    alert("Monument created!");
    window.location.href = "/";
  }
});
