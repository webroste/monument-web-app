
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    document.getElementById("loader").style.display = "none";
    document.querySelector(".container").classList.remove("hidden");
  }, 2000);

  document.getElementById("connectWallet").onclick = () => {
    alert("TON Wallet подключение (заглушка)");
  };
});
