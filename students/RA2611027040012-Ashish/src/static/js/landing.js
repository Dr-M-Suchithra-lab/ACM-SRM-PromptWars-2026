// Landing page: one-click demo login for judges and visitors.
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  FS.registerServiceWorker();
  document.querySelectorAll("[data-try]").forEach((button) => {
    button.addEventListener("click", async () => {
      const role = button.dataset.try;
      const sector = document.querySelector("input[name=sector]:checked").value;
      button.disabled = true;
      try {
        await FS.demoLogin(role, sector);
        location.href = role === "worker" ? "/worker" : "/admin";
      } catch (err) {
        document.getElementById("try-error").textContent = err.message;
        button.disabled = false;
      }
    });
  });
});
