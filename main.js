
window.addEventListener("load", () => {
  const loader = document.getElementById("loader");
  const app = document.getElementById("app");
  setTimeout(() => {
    loader.style.display = "none";
    app.classList.remove("hidden");
  }, 1500);
});

function connectWallet() {
  alert("Функция подключения кошелька будет добавлена позже!");
}
